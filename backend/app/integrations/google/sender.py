"""
Gmail Integration — Message Sender
====================================
MIME email construction and Gmail API message dispatch wrapper.
Uses decrypted OAuth credentials with automatic token refresh.
"""
import base64
import logging
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import decrypt_token, encrypt_token
from app.db.models.gmail_connection import GmailConnection
from app.integrations.google.config import get_google_oauth_config

logger = logging.getLogger(__name__)


class GmailSenderError(Exception):
    """Raised when Gmail API message dispatch or credential refresh fails."""


class GmailSender:
    """
    Sends emails using the employee's authorized Gmail connection.
    """

    def __init__(self, connection: GmailConnection, db: Optional[AsyncSession] = None) -> None:
        self.connection = connection
        self.db = db
        self.config = get_google_oauth_config()

    def _get_credentials(self) -> Credentials:
        """
        Reconstructs Google OAuth Credentials from the encrypted database record.
        """
        raw_access_token = decrypt_token(self.connection.encrypted_access_token)
        raw_refresh_token = (
            decrypt_token(self.connection.encrypted_refresh_token)
            if self.connection.encrypted_refresh_token
            else None
        )

        return Credentials(
            token=raw_access_token,
            refresh_token=raw_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.config.client_id,
            client_secret=self.config.client_secret,
            scopes=self.connection.scopes,
        )

    async def _ensure_fresh_credentials(self, credentials: Credentials) -> Credentials:
        """
        Refreshes access token if expired or close to expiry and updates the database record.
        """
        if credentials.expired or (self.connection.token_expiry and self.connection.token_expiry <= datetime.now(timezone.utc)):
            if credentials.refresh_token:
                try:
                    request = Request()
                    credentials.refresh(request)
                    logger.info("Successfully refreshed Google OAuth access token for %s", self.connection.google_account_email)

                    # Update encrypted tokens in database if session is provided
                    if self.db:
                        self.connection.encrypted_access_token = encrypt_token(credentials.token)
                        if credentials.refresh_token:
                            self.connection.encrypted_refresh_token = encrypt_token(credentials.refresh_token)
                        self.connection.token_expiry = credentials.expiry
                        await self.db.commit()
                except Exception as exc:
                    logger.error("Failed to refresh Google OAuth token: %s", exc)
                    raise GmailSenderError(f"Google authorization expired and refresh failed: {exc}")
            else:
                raise GmailSenderError("Google access token has expired and no refresh token is available. Please reconnect Gmail.")

        return credentials

    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        body: str,
        cc: Optional[list[str]] = None,
        bcc: Optional[list[str]] = None,
    ) -> Dict[str, Any]:
        """
        Constructs and dispatches a MIME email via the Gmail API.
        Sender is strictly enforced as the authorized Google account email.
        """
        sender_email = self.connection.google_account_email
        if not sender_email:
            raise GmailSenderError("Gmail connection is missing an authorized sender email.")

        # 1. Obtain and refresh credentials
        credentials = self._get_credentials()
        credentials = await self._ensure_fresh_credentials(credentials)

        # 2. Construct standards-compliant MIME message
        message = EmailMessage()
        message["From"] = sender_email
        message["To"] = recipient_email
        message["Subject"] = subject

        if cc:
            message["Cc"] = ", ".join(cc)
        if bcc:
            message["Bcc"] = ", ".join(bcc)

        message.set_content(body)

        # Encode raw message to URL-safe base64 string
        raw_message_bytes = base64.urlsafe_b64encode(message.as_bytes())
        raw_message_str = raw_message_bytes.decode("utf-8")

        # 3. Dispatch via Gmail API
        try:
            service = build("gmail", "v1", credentials=credentials, cache_discovery=False)
            result = (
                service.users()
                .messages()
                .send(userId="me", body={"raw": raw_message_str})
                .execute()
            )
        except HttpError as http_err:
            logger.error("Gmail API HttpError: %s", http_err)
            err_reason = getattr(http_err, "reason", None) or http_err._get_reason()
            if hasattr(http_err, "content") and http_err.content:
                try:
                    import json
                    err_json = json.loads(http_err.content.decode("utf-8"))
                    err_reason = err_json.get("error", {}).get("message", err_reason)
                except Exception:
                    raw_content = http_err.content.decode("utf-8", errors="ignore").strip()
                    if raw_content:
                        err_reason = raw_content
            raise GmailSenderError(f"Gmail API delivery error [{http_err.resp.status}]: {err_reason}")
        except Exception as exc:
            logger.error("Failed sending email via Gmail API: %s", exc)
            raise GmailSenderError(f"Email dispatch failed: {exc}")

        msg_id = result.get("id", "")
        thread_id = result.get("threadId", "")

        # 4. Update last_used_at timestamp on connection
        if self.db:
            try:
                self.connection.last_used_at = datetime.now(timezone.utc)
                await self.db.commit()
            except Exception:
                pass

        logger.info(
            "Email dispatched via Gmail API | id=%s thread=%s from=%s to=%s subject=%r",
            msg_id,
            thread_id,
            sender_email,
            recipient_email,
            subject,
        )

        return {
            "message_id": msg_id,
            "thread_id": thread_id,
            "sender": sender_email,
            "recipient": recipient_email,
            "subject": subject,
        }
