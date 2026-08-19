"""Organizations module — SQLAlchemy models."""
import enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.modules.auth.models import User


class OrgStatus(str, enum.Enum):
    PENDING   = "PENDING"
    ACTIVE    = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    ARCHIVED  = "ARCHIVED"


class MemberStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    INACTIVE = "INACTIVE"
    INVITED  = "INVITED"


class Organization(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    company_name:    Mapped[str]        = mapped_column(String(255), nullable=False)
    company_email:   Mapped[str | None] = mapped_column(String(320), nullable=True)
    company_phone:   Mapped[str | None] = mapped_column(String(30),  nullable=True)
    industry:        Mapped[str | None] = mapped_column(String(100), nullable=True)
    company_size:    Mapped[str | None] = mapped_column(String(50),  nullable=True)
    employee_count:  Mapped[int | None] = mapped_column(Integer,     nullable=True)
    website:         Mapped[str | None] = mapped_column(String(500), nullable=True)
    country:         Mapped[str | None] = mapped_column(String(100), nullable=True)
    city:            Mapped[str | None] = mapped_column(String(100), nullable=True)
    description:     Mapped[str | None] = mapped_column(Text,        nullable=True)
    business_model:  Mapped[str | None] = mapped_column(String(100), nullable=True)
    primary_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status:          Mapped[OrgStatus]  = mapped_column(
        Enum(OrgStatus), default=OrgStatus.PENDING, nullable=False
    )

    members: Mapped[list["OrganizationMember"]] = relationship(
        "OrganizationMember", back_populates="organization", lazy="select"
    )


class OrganizationMember(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "organization_members"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_member"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role:   Mapped[str]          = mapped_column(String(50), nullable=False, default="ORG_ADMIN")
    status: Mapped[MemberStatus] = mapped_column(
        Enum(MemberStatus), default=MemberStatus.ACTIVE, nullable=False
    )

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="members"
    )
    user: Mapped["User"] = relationship(
        "User", lazy="select"
    )
