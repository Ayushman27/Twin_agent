"""Roles module — SQLAlchemy models for organizational roles, capabilities, and employee role assignments (Neon PostgreSQL)."""
import enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Enum, ForeignKey, Index, String, Text, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.modules.auth.models import User
    from app.modules.organizations.models import Organization


class RoleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DRAFT = "DRAFT"


class RoleRiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Role(UUIDMixin, TimestampMixin, Base):
    """
    Organizational Role blueprint stored in Neon PostgreSQL.
    Defines capabilities, responsibilities, permissions, and twin guidelines for a job role.
    """
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_organization_role_name"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    responsibilities: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    required_skills: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    tools: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    permissions: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    persona: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)

    risk_level: Mapped[RoleRiskLevel] = mapped_column(
        Enum(RoleRiskLevel, name="rolerisklevel"),
        default=RoleRiskLevel.LOW,
        nullable=False,
    )
    approval_rules: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[RoleStatus] = mapped_column(
        Enum(RoleStatus, name="rolestatus"),
        default=RoleStatus.ACTIVE,
        nullable=False,
    )

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="roles", lazy="select"
    )
    capabilities: Mapped[List["RoleCapability"]] = relationship(
        "RoleCapability", back_populates="role", lazy="selectin", cascade="all, delete-orphan"
    )
    assignments: Mapped[List["EmployeeRoleAssignment"]] = relationship(
        "EmployeeRoleAssignment", back_populates="role", lazy="select", cascade="all, delete-orphan"
    )


class RoleCapability(UUIDMixin, TimestampMixin, Base):
    """
    Mapping between an organizational Role (Neon) and an AgentCapability (Agent DB).
    Preserves database isolation by storing capability references without cross-database SQL foreign keys.
    """
    __tablename__ = "role_capabilities"
    __table_args__ = (
        UniqueConstraint("role_id", "capability_id", name="uq_role_capability"),
    )

    role_id: Mapped[str] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    capability_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    capability_name: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped["Role"] = relationship("Role", back_populates="capabilities")


class EmployeeRoleAssignment(UUIDMixin, TimestampMixin, Base):
    """
    Mapping between an employee (User in Neon) and their assigned organizational Job/AI Role blueprint.
    Maintains full auditability, historical tracking, and clean separation from organization_members.role.
    """
    __tablename__ = "employee_role_assignments"
    __table_args__ = (
        Index("ix_emp_role_assignment_lookup", "organization_id", "user_id", "status"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_id: Mapped[str] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")

    role: Mapped["Role"] = relationship("Role", back_populates="assignments", lazy="selectin")
