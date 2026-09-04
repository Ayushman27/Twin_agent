"""
Email Service — Twin Agent Platform
===================================
Manages email persistence, history queries, and lifecycle status transitions in SQLite.
Enforces strict organization and user privacy boundaries.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.db.models.email import EmailRecord, EmailStatus
from app.services.employee_directory import EmployeeDirectoryService

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service layer for email data management and lifecycle operations.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db = session

    async def create_email(
        self,
        organization_id: str,
        sender_employee_id: str,
        recipient_email: str,
        subject: str,
        body: str,
        recipient_employee_id: Optional[str] = None,
        status: EmailStatus = EmailStatus.DRAFT,
        meta_data: Optional[Dict[str, Any]] = None,
        email_id: Optional[str] = None,
    ) -> EmailRecord:
        """Creates and persists an email record."""
        record = EmailRecord(
            id=email_id or str(uuid.uuid4()),
            organization_id=organization_id,
            sender_employee_id=sender_employee_id,
            recipient_employee_id=recipient_employee_id,
            recipient_email=recipient_email,
            subject=subject,
            body=body,
            status=status,
            meta_data=meta_data or {},
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def get_email_by_id(
        self,
        email_id: str,
        user_id: str,
        organization_id: str,
    ) -> EmailRecord:
        """
        Retrieves a single email record.
        Ensures the requesting user is either the sender or recipient,
        and belongs to the same organization.
        """
        stmt = select(EmailRecord).where(
            and_(
                EmailRecord.id == email_id,
                EmailRecord.organization_id == organization_id,
            )
        )
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()

        if not record:
            raise NotFoundException("Email record not found.")

        # Privacy check: caller must be either the sender or recipient
        if record.sender_employee_id != user_id and record.recipient_employee_id != user_id:
            raise ForbiddenException("You do not have permission to view this email.")

        return record

    async def list_email_history(
        self,
        user_id: str,
        organization_id: str,
        limit: int = 50,
        offset: int = 0,
        folder: str = "all",  # "all", "sent", "received"
    ) -> Tuple[List[EmailRecord], int]:
        """
        Lists email history strictly for the calling user within their organization.
        """
        if folder == "sent":
            user_filter = EmailRecord.sender_employee_id == user_id
        elif folder == "received":
            user_filter = EmailRecord.recipient_employee_id == user_id
        else:
            user_filter = or_(
                EmailRecord.sender_employee_id == user_id,
                EmailRecord.recipient_employee_id == user_id,
            )

        base_filter = and_(
            EmailRecord.organization_id == organization_id,
            user_filter,
        )

        # Count total
        count_stmt = select(func.count(EmailRecord.id)).where(base_filter)
        count_res = await self.db.execute(count_stmt)
        total = count_res.scalar() or 0

        # Query records
        query_stmt = (
            select(EmailRecord)
            .where(base_filter)
            .order_by(EmailRecord.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        res = await self.db.execute(query_stmt)
        records = list(res.scalars().all())

        return records, total

    async def update_email_status(
        self,
        email_id: str,
        user_id: str,
        organization_id: str,
        status: EmailStatus,
        error_message: Optional[str] = None,
        provider_message_id: Optional[str] = None,
        sent_at: Optional[datetime] = None,
    ) -> EmailRecord:
        """Updates lifecycle status and provider details for an email."""
        record = await self.get_email_by_id(email_id, user_id, organization_id)
        record.status = status
        if error_message is not None:
            record.error_message = error_message
        if provider_message_id is not None:
            record.provider_message_id = provider_message_id
        if sent_at is not None:
            record.sent_at = sent_at
        elif status == EmailStatus.SENT and record.sent_at is None:
            record.sent_at = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(record)
        return record
