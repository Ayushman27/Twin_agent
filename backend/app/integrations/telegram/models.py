"""
Telegram Integration — SQLAlchemy Models
=========================================
TelegramIdentity links a Twin Agent User to a Telegram chat ID.
Stored in the existing SQLite agent database (twin_agent.db).
No changes to the Neon PostgreSQL identity schema.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TelegramIdentity(Base):
    """
    Maps a platform User (by UUID string) to their Telegram chat_id.

    Employees create this link by sending /start <token> to the bot.
    One employee → one Telegram identity (enforced via UNIQUE on telegram_chat_id).
    """

    __tablename__ = "telegram_identities"

    # Primary key — String(36) UUID to match the rest of the codebase
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # FK to the platform user (UUID stored as string)
    user_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
        comment="UUID of the linked Twin Agent User",
    )

    # Telegram-side identifiers
    telegram_chat_id: Mapped[int] = mapped_column(
        BigInteger,
        unique=True,
        nullable=False,
        index=True,
        comment="Telegram chat / user ID from the Bot API",
    )
    telegram_username: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Telegram @username (without @), may be null",
    )
    telegram_first_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Audit
    linked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<TelegramIdentity user_id={self.user_id} "
            f"chat_id={self.telegram_chat_id} "
            f"username={self.telegram_username!r}>"
        )

