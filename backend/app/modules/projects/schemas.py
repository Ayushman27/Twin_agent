"""Pydantic schemas for the Projects module."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from app.modules.projects.models import (
    IntegrationProvider,
    IntegrationStatus,
    MilestoneStatus,
    ProjectPriority,
    ProjectRiskLevel,
    ProjectStatus,
    TaskStatus,
)


class ProjectOwnerSummary(BaseModel):
    id: str
    name: Optional[str] = None
    email: str
    employee_id: Optional[str] = None
    job_title: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectTeamSummary(BaseModel):
    id: str
    name: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectMemberItem(BaseModel):
    id: str
    user_id: str
    name: Optional[str] = None
    email: str
    role_in_project: str = "Contributor"
    status: str = "ACTIVE"
    joined_at: datetime

    class Config:
        from_attributes = True


class ProjectMemberCreatePayload(BaseModel):
    employee_id: Optional[str] = None
    user_id: Optional[str] = None
    project_role: Optional[str] = "Contributor"
    role_in_project: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class ProjectMemberUpdatePayload(BaseModel):
    project_role: Optional[str] = None
    role_in_project: Optional[str] = None
    status: Optional[str] = None


class ProjectMemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    employee_id: Optional[str] = None
    name: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    organizational_role: Optional[str] = None
    project_role: str
    role_in_project: str
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True


class ProjectCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    project_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    owner_id: Optional[str] = None
    team_id: Optional[str] = None
    status: Optional[ProjectStatus] = ProjectStatus.PLANNING
    priority: Optional[ProjectPriority] = ProjectPriority.MEDIUM
    risk_level: Optional[ProjectRiskLevel] = ProjectRiskLevel.LOW
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    repository_bindings: Optional[Dict[str, Any]] = None
    issue_tracker_bindings: Optional[Dict[str, Any]] = None
    ai_delivery_policy: Optional[Dict[str, Any]] = None

    @field_validator("project_code")
    @classmethod
    def clean_project_code(cls, v: str) -> str:
        code = v.strip().upper()
        if not code:
            raise ValueError("project_code cannot be empty")
        return code

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError("name cannot be empty")
        return name


class ProjectUpdatePayload(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    project_code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    owner_id: Optional[str] = None
    team_id: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    risk_level: Optional[ProjectRiskLevel] = None
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    progress_percent: Optional[int] = Field(None, ge=0, le=100)
    repository_bindings: Optional[Dict[str, Any]] = None
    issue_tracker_bindings: Optional[Dict[str, Any]] = None
    ai_delivery_policy: Optional[Dict[str, Any]] = None

    @field_validator("project_code")
    @classmethod
    def clean_project_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            code = v.strip().upper()
            if not code:
                raise ValueError("project_code cannot be empty")
            return code
        return v

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            name = v.strip()
            if not name:
                raise ValueError("name cannot be empty")
            return name
        return v


class ProjectResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    project_code: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    owner: Optional[ProjectOwnerSummary] = None
    team_id: Optional[str] = None
    team: Optional[ProjectTeamSummary] = None
    status: ProjectStatus
    priority: ProjectPriority
    risk_level: ProjectRiskLevel
    start_date: Optional[datetime] = None
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    progress_percent: int = 0
    repository_bindings: Dict[str, Any] = {}
    issue_tracker_bindings: Dict[str, Any] = {}
    ai_delivery_policy: Dict[str, Any] = {}
    member_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    members: List[ProjectMemberItem] = []


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int


# ── Milestone Schemas ───────────────────────────────────────────


class ProjectMilestoneCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[MilestoneStatus] = MilestoneStatus.PLANNED
    priority: Optional[ProjectPriority] = ProjectPriority.MEDIUM
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    progress_percent: int = Field(default=0, ge=0, le=100)


class ProjectMilestoneUpdatePayload(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[MilestoneStatus] = None
    priority: Optional[ProjectPriority] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    progress_percent: Optional[int] = Field(None, ge=0, le=100)


class ProjectMilestoneResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    status: MilestoneStatus
    priority: ProjectPriority
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    progress_percent: int = 0
    task_count: int = 0
    completed_task_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Task Schemas ────────────────────────────────────────────────


class ProjectTaskAssigneeSummary(BaseModel):
    id: str
    name: Optional[str] = None
    email: str
    avatar_url: Optional[str] = None
    employee_id: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectTaskCreatePayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    milestone_id: Optional[str] = None
    assignee_id: Optional[str] = None
    assigned_agent_group_id: Optional[str] = None
    status: Optional[TaskStatus] = TaskStatus.TODO
    priority: Optional[ProjectPriority] = ProjectPriority.MEDIUM
    due_date: Optional[datetime] = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    blocked_reason: Optional[str] = None


class ProjectTaskUpdatePayload(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    milestone_id: Optional[str] = None
    assignee_id: Optional[str] = None
    assigned_agent_group_id: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[ProjectPriority] = None
    due_date: Optional[datetime] = None
    progress_percent: Optional[int] = Field(None, ge=0, le=100)
    blocked_reason: Optional[str] = None


class ProjectTaskResponse(BaseModel):
    id: str
    project_id: str
    milestone_id: Optional[str] = None
    milestone_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee: Optional[ProjectTaskAssigneeSummary] = None
    assigned_agent_group_id: Optional[str] = None
    status: TaskStatus
    priority: ProjectPriority
    due_date: Optional[datetime] = None
    progress_percent: int = 0
    blocked_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── AI Workforce Schemas ────────────────────────────────────────

from app.agentic.schemas import AgentGroupResponse


class ProjectMemberWorkforceItem(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    job_role_name: Optional[str] = None
    role_in_project: str = "Contributor"
    capabilities: List[str] = []
    agent_group: Optional[AgentGroupResponse] = None
    status: str = "ACTIVE"


class ProjectAIWorkforceResponse(BaseModel):
    project_id: str
    project_name: str
    project_code: str
    total_members: int
    active_workforces: int
    total_agents: int
    aggregated_capabilities: List[str] = []
    members: List[ProjectMemberWorkforceItem] = []


# ── Integration Schemas ─────────────────────────────────────────


class ProjectIntegrationResponse(BaseModel):
    id: str
    project_id: str
    provider: IntegrationProvider
    external_project_id: Optional[str] = None
    external_project_name: Optional[str] = None
    repository_url: Optional[str] = None
    base_url: Optional[str] = None
    status: IntegrationStatus
    config: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConnectGithubPayload(BaseModel):
    repository_url: str = Field(..., min_length=1, max_length=512)
    external_project_name: Optional[str] = None
    default_branch: Optional[str] = "main"
    access_token: Optional[str] = None


class ConnectJiraPayload(BaseModel):
    base_url: str = Field(..., min_length=1, max_length=512)
    project_key: str = Field(..., min_length=1, max_length=50)
    external_project_name: Optional[str] = None
    api_token: Optional[str] = None


# ── Health & Blocker Detection Schemas ──────────────────────────


class BlockedTaskSummary(BaseModel):
    id: str
    title: str
    milestone_id: Optional[str] = None
    milestone_name: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    priority: ProjectPriority
    status: TaskStatus
    due_date: Optional[datetime] = None
    is_overdue: bool = False
    blocked_reason: Optional[str] = None


class OverdueTaskSummary(BaseModel):
    id: str
    title: str
    milestone_id: Optional[str] = None
    milestone_name: Optional[str] = None
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    priority: ProjectPriority
    status: TaskStatus
    due_date: datetime
    days_overdue: int


class MilestoneHealthItem(BaseModel):
    milestone_id: str
    name: str
    status: MilestoneStatus
    priority: ProjectPriority
    progress_percent: int
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    health: str  # "HEALTHY" | "AT_RISK" | "BLOCKED" | "OVERDUE"
    reasons: List[str] = []
    total_tasks: int = 0
    completed_tasks: int = 0
    blocked_tasks_count: int = 0
    overdue_tasks_count: int = 0


class ProjectHealthDiagnosticsResponse(BaseModel):
    project_id: str
    project_name: str
    project_code: str
    overall_health: str  # "HEALTHY" | "AT_RISK" | "CRITICAL"
    health_reasons: List[str] = []
    progress_percent: int = 0
    risk_level: ProjectRiskLevel
    priority: ProjectPriority
    status: ProjectStatus
    target_end_date: Optional[datetime] = None
    is_project_overdue: bool = False
    total_tasks: int = 0
    completed_tasks: int = 0
    blocked_tasks_count: int = 0
    overdue_tasks_count: int = 0
    blocked_tasks: List[BlockedTaskSummary] = []
    overdue_tasks: List[OverdueTaskSummary] = []
    total_milestones: int = 0
    completed_milestones: int = 0
    milestones_health: List[MilestoneHealthItem] = []
    calculated_at: datetime


# ── Phase 9: Project Delivery Analytics Schemas ────────────────


class TimelineAnalytics(BaseModel):
    start_date: Optional[datetime] = None
    current_date: datetime
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    days_total: Optional[int] = None
    days_elapsed: Optional[int] = None
    days_remaining: Optional[int] = None
    time_elapsed_percent: Optional[int] = None
    is_overdue: bool = False


class TaskDeliveryAnalytics(BaseModel):
    total: int = 0
    completed: int = 0
    in_progress: int = 0
    blocked: int = 0
    overdue: int = 0
    completion_rate: float = 0.0


class MilestoneDeliveryAnalytics(BaseModel):
    total: int = 0
    completed: int = 0
    in_progress: int = 0
    blocked: int = 0
    overdue: int = 0


class TeamDeliveryAnalytics(BaseModel):
    members_count: int = 0
    team_name: Optional[str] = None
    team_department: Optional[str] = None
    active_workforces: int = 0
    total_agents: int = 0


class RiskAnalytics(BaseModel):
    current_risk: ProjectRiskLevel
    risk_factors: List[str] = []


class AIDeliveryTrackItem(BaseModel):
    track_name: str
    department: Optional[str] = None
    employee_count: int = 0
    agent_count: int = 0
    members: List[str] = []
    agent_groups: List[str] = []
    capabilities: List[str] = []


class ProjectDeliveryAnalyticsResponse(BaseModel):
    project_id: str
    project_name: str
    project_code: str
    progress_percent: int = 0
    health_status: str  # "HEALTHY" | "AT_RISK" | "CRITICAL"
    timeline: TimelineAnalytics
    tasks: TaskDeliveryAnalytics
    milestones: MilestoneDeliveryAnalytics
    team: TeamDeliveryAnalytics
    risk: RiskAnalytics
    ai_tracks: List[AIDeliveryTrackItem] = []
    generated_at: datetime





