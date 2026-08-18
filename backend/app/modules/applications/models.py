"""Applications module — SQLAlchemy model."""
import enum
from typing import Any

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin, UUIDMixin


class ApplicationStatus(str, enum.Enum):
    DRAFT        = "DRAFT"
    SUBMITTED    = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED     = "APPROVED"
    REJECTED     = "REJECTED"


class Application(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "applications"

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submitted_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.DRAFT, nullable=False
    )

    # Structured JSON fields — extensible for future AI requirements
    business_information:  Mapped[Any] = mapped_column(JSON, nullable=True)
    technical_information: Mapped[Any] = mapped_column(JSON, nullable=True)
    workflow_information:  Mapped[Any] = mapped_column(JSON, nullable=True)
    ai_requirements:       Mapped[Any] = mapped_column(JSON, nullable=True)

    review_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
