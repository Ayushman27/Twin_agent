"""
SQLAlchemy Message Model — Twin Agent Platform
================================================
Stores all messages exchanged between employees across UI and Telegram.
"""
import uuid
from typing import Optional
from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Message(Base, TimestampMixin):
    """
    Unified Message record supporting UI WebSockets and Telegram.

    Status lifecycle:
      PENDING   -> Created, attempting delivery
      SENT      -> Dispatched to Telegram API or recipient WebSocket
      DELIVERED -> Confirmed received by recipient's device/client
      RECEIVED  -> Inbound message received from Telegram webhook / peer
      FAILED    -> Delivery attempt failed (e.g. Telegram API error)
    """

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    conversation_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Stable sorted pair key: user_a|user_b",
    )
    sender_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    receiver_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )
    channel: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="websocket",  # "websocket", "telegram", "system"
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    telegram_message_id: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        index=True,
        comment="Telegram message_id for idempotency & tracking",
    )
    chat_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        nullable=True,
        index=True,
        comment="Telegram chat_id if forwarded / originating from Telegram",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",  # PENDING, SENT, DELIVERED, RECEIVED, FAILED
    )
