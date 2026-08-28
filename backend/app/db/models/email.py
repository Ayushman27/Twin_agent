"""
SQLAlchemy Email Model — Twin Agent Platform
=============================================
Stores email records, lifecycle statuses, and dispatch metadata.
"""
import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, Enum, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class EmailStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    SENDING = "SENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class EmailRecord(Base, TimestampMixin):
    """
    Email record for internal & external communication dispatch.
    
    References Neon PostgreSQL identities (organization_id, sender_employee_id, recipient_employee_id)
    at the application layer without cross-database foreign key constraints.
    """

    __tablename__ = "email_records"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    sender_employee_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    recipient_employee_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    recipient_email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
        index=True,
    )
    subject: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    status: Mapped[EmailStatus] = mapped_column(
        Enum(EmailStatus),
        nullable=False,
        default=EmailStatus.DRAFT,
        index=True,
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    provider_message_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    meta_data: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
    )
