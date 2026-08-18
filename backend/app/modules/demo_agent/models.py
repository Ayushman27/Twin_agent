"""Demo Agent module — SQLAlchemy models."""
import enum
from typing import Any

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin, UUIDMixin


class SessionStatus(str, enum.Enum):
    ACTIVE    = "ACTIVE"
    ENDED     = "ENDED"
    EXPIRED   = "EXPIRED"


class MessageSender(str, enum.Enum):
    USER  = "user"
    AGENT = "agent"


class AgentSession(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "agent_sessions"

    user_id:         Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    agent_type:     Mapped[str]           = mapped_column(String(50), default="DEMO", nullable=False)
    session_status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False
    )
    context: Mapped[Any] = mapped_column(JSON, nullable=True)


class AgentMessage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "agent_messages"

    session_id: Mapped[str] = mapped_column(
        ForeignKey("agent_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender:   Mapped[MessageSender] = mapped_column(Enum(MessageSender), nullable=False)
    message:  Mapped[str]           = mapped_column(Text, nullable=False)
    meta_data: Mapped[Any]           = mapped_column(JSON, nullable=True)
