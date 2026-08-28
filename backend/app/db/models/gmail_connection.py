"""
SQLAlchemy Gmail Connection Model — Twin Agent Platform
========================================================
Stores per-employee Google OAuth credentials, encrypted tokens, and status.
Maintained in the primary identity database (Neon PostgreSQL).
"""
import uuid
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class GmailConnection(Base, TimestampMixin):
    """
    Per-employee authorized Gmail connection.
    
    Tokens are stored encrypted (AES/Fernet) to ensure zero plaintext exposure.
    Strictly isolated by organization_id and employee_id.
    """

    __tablename__ = "gmail_connections"

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
    employee_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    google_account_email: Mapped[str] = mapped_column(
        String(320),
        nullable=False,
        index=True,
    )
    encrypted_access_token: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    encrypted_refresh_token: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    token_expiry: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    scopes: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["https://www.googleapis.com/auth/gmail.send"],
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="CONNECTED",  # "CONNECTED", "DISCONNECTED", "ERROR"
        index=True,
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
