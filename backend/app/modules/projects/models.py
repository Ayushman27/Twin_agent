"""Projects module — SQLAlchemy models for Neon PostgreSQL."""
import enum
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.modules.auth.models import User
from app.modules.teams.models import Team


class ProjectStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class ProjectPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProjectRiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class MilestoneStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"


class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class IntegrationProvider(str, enum.Enum):
    GITHUB = "GITHUB"
    JIRA = "JIRA"


class IntegrationStatus(str, enum.Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"
    SYNCING = "SYNCING"



class Project(UUIDMixin, TimestampMixin, Base):
    """
    Organizational Project blueprint stored in Neon PostgreSQL.
    Represents a strategic initiative, its assigned squad, ownership, milestones, and AI delivery policies.
    """
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("organization_id", "project_code", name="uq_organization_project_code"),
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100", name="chk_project_progress_percent"),
    )

    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    project_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    owner_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    team_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )

    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="projectstatus"),
        default=ProjectStatus.PLANNING,
        nullable=False,
        index=True,
    )
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority, name="projectpriority"),
        default=ProjectPriority.MEDIUM,
        nullable=False,
        index=True,
    )
    risk_level: Mapped[ProjectRiskLevel] = mapped_column(
        Enum(ProjectRiskLevel, name="projectrisklevel"),
        default=ProjectRiskLevel.LOW,
        nullable=False,
        index=True,
    )

    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    target_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    repository_bindings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    issue_tracker_bindings: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    ai_delivery_policy: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    owner: Mapped[Optional["User"]] = relationship("User", foreign_keys=[owner_id])
    team: Mapped[Optional["Team"]] = relationship("Team", foreign_keys=[team_id])
    members: Mapped[List["ProjectMember"]] = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    milestones: Mapped[List["ProjectMilestone"]] = relationship(
        "ProjectMilestone", back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[List["ProjectTask"]] = relationship(
        "ProjectTask", back_populates="project", cascade="all, delete-orphan"
    )
    integrations: Mapped[List["ProjectIntegration"]] = relationship(
        "ProjectIntegration", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectMember(UUIDMixin, TimestampMixin, Base):
    """
    Project-User association model stored in Neon PostgreSQL.
    Tracks direct contributors enrolled in the project delivery stream.
    """
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_member"),
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_in_project: Mapped[str] = mapped_column(String(100), default="Contributor", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class ProjectMilestone(UUIDMixin, TimestampMixin, Base):
    """
    Project Milestone model stored in Neon PostgreSQL.
    Represents key checkpoints, roadmap stages, or delivery targets.
    """
    __tablename__ = "project_milestones"
    __table_args__ = (
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100", name="chk_milestone_progress_percent"),
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[MilestoneStatus] = mapped_column(
        Enum(MilestoneStatus, name="milestonestatus"),
        default=MilestoneStatus.PLANNED,
        nullable=False,
        index=True,
    )
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority, name="projectpriority"),
        default=ProjectPriority.MEDIUM,
        nullable=False,
        index=True,
    )

    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="milestones")
    tasks: Mapped[List["ProjectTask"]] = relationship("ProjectTask", back_populates="milestone")


class ProjectTask(UUIDMixin, TimestampMixin, Base):
    """
    Project Task model stored in Neon PostgreSQL.
    Represents organizational work units assigned to employees/squad members.
    """
    __tablename__ = "project_tasks"
    __table_args__ = (
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100", name="chk_task_progress_percent"),
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("project_milestones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assignee_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_agent_group_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )

    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="taskstatus"),
        default=TaskStatus.TODO,
        nullable=False,
        index=True,
    )
    priority: Mapped[ProjectPriority] = mapped_column(
        Enum(ProjectPriority, name="projectpriority"),
        default=ProjectPriority.MEDIUM,
        nullable=False,
        index=True,
    )

    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    blocked_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    milestone: Mapped[Optional["ProjectMilestone"]] = relationship("ProjectMilestone", back_populates="tasks")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])


class ProjectIntegration(UUIDMixin, TimestampMixin, Base):
    """
    Project Integration model stored in Neon PostgreSQL.
    Tracks external bindings to GitHub repositories and Jira project trackers.
    """
    __tablename__ = "project_integrations"
    __table_args__ = (
        UniqueConstraint("project_id", "provider", name="uq_project_integration_provider"),
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[IntegrationProvider] = mapped_column(
        Enum(IntegrationProvider, name="integrationprovider"),
        nullable=False,
        index=True,
    )
    external_project_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_project_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    repository_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    base_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    status: Mapped[IntegrationStatus] = mapped_column(
        Enum(IntegrationStatus, name="integrationstatus"),
        default=IntegrationStatus.DISCONNECTED,
        nullable=False,
        index=True,
    )

    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    auth_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="integrations")

