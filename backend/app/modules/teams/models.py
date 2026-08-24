"""Teams module — SQLAlchemy models for Neon PostgreSQL."""
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.modules.auth.models import User


class TeamStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DRAFT = "DRAFT"
    ARCHIVED = "ARCHIVED"


class TeamMemberStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Team(UUIDMixin, TimestampMixin, Base):
    """Organizational collaboration unit blueprint in Neon PostgreSQL."""
    __tablename__ = "teams"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_team_name_org"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    team_lead_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[TeamStatus] = mapped_column(
        Enum(TeamStatus), default=TeamStatus.ACTIVE, nullable=False, index=True
    )
    ai_routing_policy: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    knowledge_access_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    memory_isolation_level: Mapped[str] = mapped_column(String(50), default="TEAM_ISOLATED", nullable=False)

    # Relationships
    team_lead: Mapped[Optional["User"]] = relationship("User", foreign_keys=[team_lead_id])
    members: Mapped[List["TeamMember"]] = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan"
    )


class TeamMember(UUIDMixin, TimestampMixin, Base):
    """Explicit team membership link in Neon PostgreSQL."""
    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_member"),
    )

    team_id: Mapped[str] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_in_team: Mapped[str] = mapped_column(String(100), default="Contributor", nullable=False)
    status: Mapped[TeamMemberStatus] = mapped_column(
        Enum(TeamMemberStatus), default=TeamMemberStatus.ACTIVE, nullable=False, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class TeamAIRoute(UUIDMixin, TimestampMixin, Base):
    """
    Inter-role or inter-employee AI Workforce routing configuration within a Team.
    Defines organizational collaboration paths (e.g. Developer -> QA -> DevOps).
    """
    __tablename__ = "team_ai_routes"

    team_id: Mapped[str] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_role_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=True, index=True
    )
    target_role_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), nullable=True, index=True
    )
    source_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    priority: Mapped[int] = mapped_column(default=1, nullable=False)
    condition: Mapped[str] = mapped_column(String(100), default="on_success", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    team: Mapped["Team"] = relationship("Team", foreign_keys=[team_id])
    source_role: Mapped[Optional["app.modules.roles.models.Role"]] = relationship(
        "app.modules.roles.models.Role", foreign_keys=[source_role_id]
    )
    target_role: Mapped[Optional["app.modules.roles.models.Role"]] = relationship(
        "app.modules.roles.models.Role", foreign_keys=[target_role_id]
    )
    source_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[source_user_id])
    target_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[target_user_id])


class TeamKnowledgeSource(UUIDMixin, TimestampMixin, Base):
    """
    Explicit team-scoped knowledge source association stored in Neon PostgreSQL.
    Configures organizational access boundaries for documentation, specs, and knowledge bases.
    """
    __tablename__ = "team_knowledge_sources"

    team_id: Mapped[str] = mapped_column(
        ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(100), default="DOCUMENT_REPOSITORY", nullable=False)
    source_identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    team: Mapped["Team"] = relationship("Team", foreign_keys=[team_id])
