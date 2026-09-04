"""
Gmail Email Service — Twin Agent Platform
=========================================
Orchestrates agent-facing send_email actions, employee directory recipient resolution,
Gmail OAuth credential access, dispatch via GmailSender, and audit logging.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models.email import EmailRecord, EmailStatus
from app.db.models.gmail_connection import GmailConnection
from app.integrations.google.sender import GmailSender, GmailSenderError
from app.services.employee_directory import EmployeeDirectoryService

logger = get_logger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class GmailEmailService:
    """
    Service layer providing unified email sending for AI Agents and Employee Portal tools.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db = session

    async def send_email(
        self,
        user_id: str,
        organization_id: str,
        recipient: str,
        subject: str,
        body: str,
        agent_id: Optional[str] = None,
        cc: Optional[list[str]] = None,
        bcc: Optional[list[str]] = None,
    ) -> Dict[str, Any]:
        """
        Executes the send_email tool flow:
          1. Verifies the authenticated employee's Gmail connection.
          2. Resolves recipient identity and email address within the employee's organization.
          3. Creates and audits the EmailRecord in the database.
          4. Dispatches the email through the authorized Gmail account.
          5. Updates the record status and returns structured tool output.
        """
        clean_recipient = (recipient or "").strip()
        clean_subject = (subject or "").strip()
        clean_body = (body or "").strip()

        if not clean_recipient:
            return {
                "status": "failed",
                "error_code": "MISSING_RECIPIENT",
                "user_message": "Recipient is required to send an email.",
            }

        if not clean_subject:
            return {
                "status": "failed",
                "error_code": "MISSING_SUBJECT",
                "user_message": "Email subject is required.",
            }

        # ── 1. Check Authenticated Employee's Gmail Connection ───────────────
        stmt_conn = select(GmailConnection).where(
            and_(
                GmailConnection.organization_id == organization_id,
                GmailConnection.employee_id == user_id,
                GmailConnection.status == "CONNECTED",
            )
        )
        res_conn = await self.db.execute(stmt_conn)
        conn = res_conn.scalar_one_or_none()

        if not conn:
            return {
                "status": "failed",
                "error_code": "GMAIL_NOT_CONNECTED",
                "user_message": (
                    "You have not connected your Gmail account yet. "
                    "Please visit the Integrations page in the Employee Portal to connect Gmail."
                ),
            }

        # ── 2. Resolve Recipient through Employee Directory ──────────────────
        directory = EmployeeDirectoryService(self.db)
        dir_res = await directory.resolve_recipient(
            organization_id=organization_id,
            query=clean_recipient,
            sender_id=user_id,
        )

        target_email: Optional[str] = None
        target_name: Optional[str] = None
        target_emp_id: Optional[str] = None

        if dir_res.status == "AMBIGUOUS":
            return {
                "status": "failed",
                "error_code": "AMBIGUOUS_RECIPIENT",
                "user_message": dir_res.message,
                "candidates": [c.to_dict() for c in dir_res.candidates],
            }
        elif dir_res.status == "RESOLVED" and dir_res.employee:
            target_email = dir_res.employee.email
            target_name = dir_res.employee.name
            target_emp_id = dir_res.employee.user_id
        else:
            # If directory lookup did not resolve, check if input itself is a valid email format
            if "@" in clean_recipient and "." in clean_recipient:
                target_email = clean_recipient
                target_name = clean_recipient
            else:
                return {
                    "status": "failed",
                    "error_code": "RECIPIENT_NOT_FOUND",
                    "user_message": f"Could not find an employee named '{clean_recipient}' in your organization.",
                }

        # ── 3. Create EmailRecord Audit Entry ─────────────────────────────────
        email_record = EmailRecord(
            organization_id=organization_id,
            sender_employee_id=user_id,
            recipient_employee_id=target_emp_id,
            recipient_email=target_email,
            subject=clean_subject,
            body=clean_body,
            status=EmailStatus.SENDING,
            meta_data={
                "agent_id": agent_id or "AI_Twin",
                "sender_google_email": conn.google_account_email,
                "recipient_name": target_name,
            },
        )
        self.db.add(email_record)
        await self.db.commit()
        await self.db.refresh(email_record)

        # ── 4. Dispatch via GmailSender ───────────────────────────────────────
        sender = GmailSender(conn, db=self.db)
        try:
            send_res = await sender.send_email(
                recipient_email=target_email,
                subject=clean_subject,
                body=clean_body,
                cc=cc,
                bcc=bcc,
            )

            msg_id = send_res.get("message_id", "")
            now = datetime.now(timezone.utc)

            # Update database record on success
            email_record.status = EmailStatus.SENT
            email_record.sent_at = now
            email_record.provider_message_id = msg_id
            await self.db.commit()

            # Structured Audit Log
            logger.info(
                "AUDIT_EMAIL_DISPATCH",
                action="SEND_EMAIL",
                status="sent",
                employee_id=user_id,
                organization_id=organization_id,
                agent_id=agent_id or "AI_Twin",
                recipient_employee_id=target_emp_id,
                recipient_email=target_email,
                subject=clean_subject,
                provider_message_id=msg_id,
                timestamp=_now_iso(),
            )

            return {
                "status": "sent",
                "recipient": target_name or target_email,
                "recipient_email": target_email,
                "message_id": msg_id,
                "timestamp": _now_iso(),
            }

        except GmailSenderError as err:
            email_record.status = EmailStatus.FAILED
            email_record.error_message = str(err)
            await self.db.commit()

            logger.error(
                "AUDIT_EMAIL_FAILURE",
                action="SEND_EMAIL",
                status="failed",
                employee_id=user_id,
                organization_id=organization_id,
                agent_id=agent_id or "AI_Twin",
                recipient_employee_id=target_emp_id,
                recipient_email=target_email,
                subject=clean_subject,
                error=str(err),
                timestamp=_now_iso(),
            )

            return {
                "status": "failed",
                "error_code": "GMAIL_SEND_ERROR",
                "user_message": f"Failed to send email via Gmail: {err}",
            }
        except Exception as exc:
            email_record.status = EmailStatus.FAILED
            email_record.error_message = str(exc)
            await self.db.commit()

            logger.error(
                "AUDIT_EMAIL_UNEXPECTED_ERROR",
                action="SEND_EMAIL",
                status="failed",
                employee_id=user_id,
                organization_id=organization_id,
                error=str(exc),
                timestamp=_now_iso(),
            )

            return {
                "status": "failed",
                "error_code": "UNEXPECTED_ERROR",
                "user_message": f"An error occurred while sending email: {exc}",
            }

    async def get_active_draft(
        self,
        user_id: str,
        organization_id: str,
    ) -> Optional[EmailRecord]:
        """Retrieves the most recent pending email draft awaiting confirmation for the employee."""
        stmt = (
            select(EmailRecord)
            .where(
                and_(
                    EmailRecord.organization_id == organization_id,
                    EmailRecord.sender_employee_id == user_id,
                    EmailRecord.status == EmailStatus.PENDING_CONFIRMATION,
                )
            )
            .order_by(EmailRecord.created_at.desc())
            .limit(1)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_email_draft(
        self,
        user_id: str,
        organization_id: str,
        recipient: str,
        subject: str,
        body: str,
        agent_id: Optional[str] = None,
        meta_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validates the request, resolves the recipient, and stages an EmailRecord
        in PENDING_CONFIRMATION status without sending it to Gmail yet.
        """
        clean_recipient = (recipient or "").strip()
        clean_subject = (subject or "").strip()
        clean_body = (body or "").strip()

        if not clean_recipient:
            return {
                "status": "failed",
                "error_code": "MISSING_RECIPIENT",
                "user_message": "Who should I send the email to?",
            }

        if not clean_body:
            return {
                "status": "failed",
                "error_code": "MISSING_BODY",
                "user_message": f"Got it, {clean_recipient}. What would you like me to say in the email?",
            }

        # 1. Pre-check sender's Gmail connection
        stmt_conn = select(GmailConnection).where(
            and_(
                GmailConnection.organization_id == organization_id,
                GmailConnection.employee_id == user_id,
                GmailConnection.status == "CONNECTED",
            )
        )
        res_conn = await self.db.execute(stmt_conn)
        conn = res_conn.scalar_one_or_none()
        if not conn:
            return {
                "status": "failed",
                "error_code": "GMAIL_NOT_CONNECTED",
                "user_message": (
                    "I can't send the email yet because your Gmail account isn't connected. "
                    "Please connect Gmail from Integrations."
                ),
            }

        # 2. Resolve recipient
        directory = EmployeeDirectoryService(self.db)
        dir_res = await directory.resolve_recipient(
            organization_id=organization_id,
            query=clean_recipient,
            sender_id=user_id,
        )

        if dir_res.status == "AMBIGUOUS":
            return {
                "status": "failed",
                "error_code": "AMBIGUOUS_RECIPIENT",
                "user_message": f"I found multiple employees named {clean_recipient}. Which one do you mean?",
                "candidates": [c.to_dict() for c in dir_res.candidates],
            }
        elif dir_res.status == "NOT_FOUND":
            return {
                "status": "failed",
                "error_code": "RECIPIENT_NOT_FOUND",
                "user_message": f"Could not find an employee named {clean_recipient} in your organization.",
            }

        target_email = dir_res.employee.email
        target_name = dir_res.employee.name
        target_emp_id = dir_res.employee.user_id

        # 3. Create draft record with merged metadata
        draft_meta = {
            "agent_id": agent_id or "AI_Twin",
            "recipient_name": target_name,
            "created_at_iso": _now_iso(),
        }
        if meta_data and isinstance(meta_data, dict):
            draft_meta.update(meta_data)

        draft = EmailRecord(
            organization_id=organization_id,
            sender_employee_id=user_id,
            recipient_employee_id=target_emp_id,
            recipient_email=target_email,
            subject=clean_subject,
            body=clean_body,
            status=EmailStatus.PENDING_CONFIRMATION,
            meta_data=draft_meta,
        )
        self.db.add(draft)
        await self.db.commit()
        await self.db.refresh(draft)

        confirmation_speech = (
            f"I've prepared an email to {target_name}.\n\n"
            f"Subject: {clean_subject}\n\n"
            f"Body:\n{clean_body}\n\n"
            f"Would you like me to send it?"
        )

        return {
            "status": "draft_created",
            "draft_id": draft.id,
            "recipient": target_name,
            "recipient_email": target_email,
            "subject": clean_subject,
            "body": clean_body,
            "confirmation_prompt": confirmation_speech,
            "user_message": confirmation_speech,
        }

    async def confirm_and_send_email(
        self,
        user_id: str,
        organization_id: str,
        draft_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes the human-confirmed Gmail send operation on a staged draft.
        """
        if draft_id:
            stmt = select(EmailRecord).where(
                and_(
                    EmailRecord.id == draft_id,
                    EmailRecord.organization_id == organization_id,
                )
            )
            res = await self.db.execute(stmt)
            draft = res.scalar_one_or_none()
        else:
            draft = await self.get_active_draft(user_id, organization_id)

        if not draft:
            return {
                "status": "failed",
                "error_code": "NO_PENDING_DRAFT",
                "user_message": "There is no email draft waiting for confirmation.",
            }

        # Multi-tenant & caller ownership verification
        if draft.sender_employee_id != user_id:
            return {
                "status": "failed",
                "error_code": "FORBIDDEN",
                "user_message": "You are not authorized to confirm this email draft.",
            }

        # Duplicate confirmation guard
        if draft.status == EmailStatus.SENT:
            return {
                "status": "already_sent",
                "error_code": "ALREADY_SENT",
                "user_message": f"This email to {draft.recipient_email} has already been sent.",
            }

        if draft.status == EmailStatus.CANCELLED:
            return {
                "status": "cancelled",
                "error_code": "DRAFT_CANCELLED",
                "user_message": "This email draft was previously cancelled.",
            }

        # Check Gmail Connection
        stmt_conn = select(GmailConnection).where(
            and_(
                GmailConnection.organization_id == organization_id,
                GmailConnection.employee_id == user_id,
                GmailConnection.status == "CONNECTED",
            )
        )
        res_conn = await self.db.execute(stmt_conn)
        conn = res_conn.scalar_one_or_none()

        if not conn:
            draft.status = EmailStatus.FAILED
            draft.error_message = "Gmail account not connected"
            await self.db.commit()
            return {
                "status": "failed",
                "error_code": "GMAIL_NOT_CONNECTED",
                "user_message": (
                    "I can't send the email yet because your Gmail account isn't connected. "
                    "Please connect Gmail from Integrations."
                ),
            }

        # Transition status to SENDING
        draft.status = EmailStatus.SENDING
        await self.db.commit()

        recipient_display_name = (draft.meta_data or {}).get("recipient_name") or draft.recipient_email

        # Dispatch via GmailSender
        sender = GmailSender(conn, db=self.db)
        try:
            send_res = await sender.send_email(
                recipient_email=draft.recipient_email,
                subject=draft.subject,
                body=draft.body,
            )

            msg_id = send_res.get("message_id", "")
            now = datetime.now(timezone.utc)

            draft.status = EmailStatus.SENT
            draft.sent_at = now
            draft.provider_message_id = msg_id
            await self.db.commit()

            logger.info(
                "AUDIT_EMAIL_CONFIRMED_DISPATCH",
                action="CONFIRM_SEND_EMAIL",
                status="sent",
                draft_id=draft.id,
                employee_id=user_id,
                organization_id=organization_id,
                recipient_email=draft.recipient_email,
                subject=draft.subject,
                provider_message_id=msg_id,
                timestamp=_now_iso(),
            )

            return {
                "status": "sent",
                "draft_id": draft.id,
                "recipient": recipient_display_name,
                "recipient_email": draft.recipient_email,
                "subject": draft.subject,
                "message_id": msg_id,
                "user_message": f"Email sent to {recipient_display_name}.",
            }

        except (GmailSenderError, Exception) as exc:
            draft.status = EmailStatus.FAILED
            draft.error_message = str(exc)
            await self.db.commit()

            logger.error(
                "AUDIT_EMAIL_CONFIRMED_FAILURE",
                action="CONFIRM_SEND_EMAIL",
                status="failed",
                draft_id=draft.id,
                employee_id=user_id,
                organization_id=organization_id,
                error=str(exc),
                timestamp=_now_iso(),
            )

            return {
                "status": "failed",
                "error_code": "GMAIL_SEND_ERROR",
                "user_message": "I couldn't send the email. Your Gmail account may need to be reconnected.",
            }

    async def cancel_email_draft(
        self,
        user_id: str,
        organization_id: str,
        draft_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Cancels the staged email draft. Zero calls to Gmail API.
        """
        if draft_id:
            stmt = select(EmailRecord).where(
                and_(
                    EmailRecord.id == draft_id,
                    EmailRecord.organization_id == organization_id,
                )
            )
            res = await self.db.execute(stmt)
            draft = res.scalar_one_or_none()
        else:
            draft = await self.get_active_draft(user_id, organization_id)

        if not draft:
            return {
                "status": "no_draft",
                "user_message": "No active email draft to cancel.",
            }

        if draft.sender_employee_id != user_id:
            return {
                "status": "failed",
                "error_code": "FORBIDDEN",
                "user_message": "You are not authorized to cancel this email draft.",
            }

        draft.status = EmailStatus.CANCELLED
        await self.db.commit()

        logger.info(
            "AUDIT_EMAIL_DRAFT_CANCELLED",
            action="CANCEL_EMAIL_DRAFT",
            draft_id=draft.id,
            employee_id=user_id,
            organization_id=organization_id,
            timestamp=_now_iso(),
        )

        return {
            "status": "cancelled",
            "draft_id": draft.id,
            "user_message": "Cancelled. I won't send the email.",
        }

    async def edit_email_draft(
        self,
        user_id: str,
        organization_id: str,
        new_subject: Optional[str] = None,
        new_body: Optional[str] = None,
        new_recipient: Optional[str] = None,
        draft_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Modifies subject, body, or recipient of a pending draft and re-prompts for confirmation.
        """
        if draft_id:
            stmt = select(EmailRecord).where(
                and_(
                    EmailRecord.id == draft_id,
                    EmailRecord.organization_id == organization_id,
                )
            )
            res = await self.db.execute(stmt)
            draft = res.scalar_one_or_none()
        else:
            draft = await self.get_active_draft(user_id, organization_id)

        if not draft:
            return {
                "status": "failed",
                "error_code": "NO_PENDING_DRAFT",
                "user_message": "No active email draft found to modify.",
            }

        if draft.sender_employee_id != user_id:
            return {
                "status": "failed",
                "error_code": "FORBIDDEN",
                "user_message": "You are not authorized to edit this email draft.",
            }

        if new_subject:
            draft.subject = new_subject.strip()

        if new_body:
            draft.body = new_body.strip()

        if new_recipient:
            directory = EmployeeDirectoryService(self.db)
            dir_res = await directory.resolve_recipient(
                organization_id=organization_id,
                query=new_recipient.strip(),
                sender_id=user_id,
            )
            if dir_res.status == "RESOLVED" and dir_res.employee:
                draft.recipient_email = dir_res.employee.email
                draft.recipient_employee_id = dir_res.employee.user_id
                meta = draft.meta_data or {}
                meta["recipient_name"] = dir_res.employee.name
                draft.meta_data = meta

        draft.status = EmailStatus.PENDING_CONFIRMATION
        await self.db.commit()
        await self.db.refresh(draft)

        recipient_display_name = (draft.meta_data or {}).get("recipient_name") or draft.recipient_email
        confirmation_speech = (
            f"Updated.\n\n"
            f"Subject:\n{draft.subject}\n\n"
            f"Body:\n{draft.body}\n\n"
            f"Should I send it?"
        )

        return {
            "status": "draft_updated",
            "draft_id": draft.id,
            "recipient": recipient_display_name,
            "subject": draft.subject,
            "body": draft.body,
            "confirmation_prompt": confirmation_speech,
            "user_message": confirmation_speech,
        }

