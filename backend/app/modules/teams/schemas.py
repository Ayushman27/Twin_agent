"""Teams module — Pydantic request/response schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.agentic.schemas import AgentGroupResponse
from app.modules.teams.models import TeamMemberStatus, TeamStatus


class TeamLeadSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None


class TeamMemberCreate(BaseModel):
    user_id: str = Field(..., description="Employee user ID to add to the team")
    role_in_team: str = Field(
        default="Contributor",
        description="Role within team (e.g. Lead, Contributor, Reviewer, Specialist)",
    )
    status: TeamMemberStatus = Field(
        default=TeamMemberStatus.ACTIVE,
        description="Membership status",
    )


class TeamMemberUpdate(BaseModel):
    role_in_team: Optional[str] = None
    status: Optional[TeamMemberStatus] = None


class TeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    user_id: str
    role_in_team: str = "Contributor"
    status: TeamMemberStatus = TeamMemberStatus.ACTIVE
    joined_at: datetime
    created_at: datetime
    updated_at: datetime

    # Populated from User profile
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    job_role_name: Optional[str] = None


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Team name")
    description: Optional[str] = Field(None, description="Team purpose or scope description")
    department: Optional[str] = Field(None, max_length=255, description="Associated department")
    team_lead_id: Optional[str] = Field(None, description="User ID of the designated team lead")
    status: TeamStatus = Field(default=TeamStatus.ACTIVE, description="Team lifecycle status")
    ai_routing_policy: Dict[str, Any] = Field(
        default_factory=dict,
        description="Team-level AI routing configuration (e.g. routing mode, fallback rules)",
    )
    knowledge_access_config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Shared knowledge base access and document category filters",
    )
    memory_isolation_level: str = Field(
        default="TEAM_ISOLATED",
        description="Memory isolation scope policy",
    )


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    department: Optional[str] = None
    team_lead_id: Optional[str] = None
    status: Optional[TeamStatus] = None
    ai_routing_policy: Optional[Dict[str, Any]] = None
    knowledge_access_config: Optional[Dict[str, Any]] = None
    memory_isolation_level: Optional[str] = None


class TeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    department: Optional[str] = None
    team_lead_id: Optional[str] = None
    team_lead: Optional[TeamLeadSummary] = None
    status: TeamStatus = TeamStatus.ACTIVE
    ai_routing_policy: Dict[str, Any] = Field(default_factory=dict)
    knowledge_access_config: Dict[str, Any] = Field(default_factory=dict)
    memory_isolation_level: str = "TEAM_ISOLATED"
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class TeamDetailResponse(TeamResponse):
    members: List[TeamMemberResponse] = Field(default_factory=list)


class TeamListResponse(BaseModel):
    teams: List[TeamResponse]
    total: int


class TeamMemberWorkforceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    employee_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    job_role_name: Optional[str] = None
    role_in_team: str = "Contributor"
    agent_group: Optional[AgentGroupResponse] = None


class TeamAIWorkforceResponse(BaseModel):
    team_id: str
    team_name: str
    department: Optional[str] = None
    total_members: int
    active_workforces: int
    total_agents: int
    members: List[TeamMemberWorkforceItem]


# ── Team AI Mesh Routing Schemas ────────────────────────────

class TeamAIRouteCreate(BaseModel):
    source_role_id: Optional[str] = Field(None, description="Source Role ID for routing")
    target_role_id: Optional[str] = Field(None, description="Target Role ID to receive task")
    source_user_id: Optional[str] = Field(None, description="Optional specific Source Employee ID")
    target_user_id: Optional[str] = Field(None, description="Optional specific Target Employee ID")
    priority: int = Field(default=1, ge=1, le=100, description="Routing priority order (1 is highest)")
    condition: str = Field(
        default="on_success",
        description="Trigger condition (e.g. on_success, on_approval, code_review_passed, always)",
    )
    description: Optional[str] = Field(None, description="Description of the handoff rule")
    enabled: bool = Field(default=True, description="Whether the route rule is active")


class TeamAIRouteUpdate(BaseModel):
    priority: Optional[int] = Field(None, ge=1, le=100)
    condition: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


class TeamAIRouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    organization_id: str
    source_role_id: Optional[str] = None
    target_role_id: Optional[str] = None
    source_user_id: Optional[str] = None
    target_user_id: Optional[str] = None
    source_role_name: Optional[str] = None
    target_role_name: Optional[str] = None
    source_user_name: Optional[str] = None
    target_user_name: Optional[str] = None
    priority: int = 1
    condition: str = "on_success"
    description: Optional[str] = None
    enabled: bool = True
    created_at: datetime
    updated_at: datetime


class TeamAIRouteListResponse(BaseModel):
    routes: List[TeamAIRouteResponse]
    total: int


# ── Team Knowledge & Memory Boundaries Schemas ───────────────

class TeamKnowledgePolicyUpdate(BaseModel):
    shared_knowledge_enabled: bool = Field(default=True, description="Enable shared knowledge access for squad")
    knowledge_scope: str = Field(default="TEAM", description="Knowledge boundary scope: TEAM, DEPARTMENT, ORGANIZATION")
    memory_isolation_level: str = Field(
        default="TEAM_ISOLATED",
        description="Memory isolation tier: STRICT_PRIVATE, TEAM_ISOLATED, SHARED_DEPARTMENT",
    )
    access_rule: str = Field(
        default="TEAM_MEMBERS_ONLY",
        description="Access restriction: TEAM_MEMBERS_ONLY, ORGANIZATION_WIDE, ROLE_RESTRICTED",
    )
    accessible_categories: List[str] = Field(
        default_factory=list,
        description="List of document / specification categories accessible to this squad",
    )
    allow_cross_team_query: bool = Field(
        default=False,
        description="Whether squad agents can query knowledge across other department squads",
    )


class TeamKnowledgeSourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Knowledge source label/title")
    source_type: str = Field(
        default="DOCUMENT_REPOSITORY",
        description="Source type (DOCUMENT_REPOSITORY, CONFLUENCE_SPACE, GITHUB_WIKI, API_DOCUMENTATION, INTERNAL_GUIDE)",
    )
    source_identifier: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Unique identifier / slug / reference of the knowledge repository",
    )
    description: Optional[str] = Field(None, description="Detailed description of knowledge scope")
    is_active: bool = Field(default=True, description="Whether this source is currently active")


class TeamKnowledgeSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    source_type: Optional[str] = None
    source_identifier: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TeamKnowledgeSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    team_id: str
    organization_id: str
    name: str
    source_type: str
    source_identifier: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TeamKnowledgeOverviewResponse(BaseModel):
    team_id: str
    shared_knowledge_enabled: bool = True
    knowledge_scope: str = "TEAM"
    memory_isolation_level: str = "TEAM_ISOLATED"
    access_rule: str = "TEAM_MEMBERS_ONLY"
    accessible_categories: List[str] = Field(default_factory=list)
    allow_cross_team_query: bool = False
    sources: List[TeamKnowledgeSourceResponse] = Field(default_factory=list)
    total_sources: int = 0


# ── Team Workload & Performance Metrics Schemas ───────────────

class TeamAIRuntimeStats(BaseModel):
    total_executions: int = 0
    completed_executions: int = 0
    failed_executions: int = 0
    running_executions: int = 0
    pending_approvals: int = 0
    verified_evidences: int = 0
    avg_execution_duration_seconds: Optional[float] = None


class TeamMemberRuntimeStats(BaseModel):
    user_id: str
    name: str
    role_in_team: str
    job_role_name: Optional[str] = None
    agent_group_id: Optional[str] = None
    agent_group_name: Optional[str] = None
    total_agents: int = 0
    total_executions: int = 0
    completed_executions: int = 0
    failed_executions: int = 0
    running_executions: int = 0


class TeamMemberWorkloadStatus(BaseModel):
    user_id: str
    name: str
    role_in_team: str
    job_role_name: Optional[str] = None
    active_tasks: Optional[int] = None
    in_progress: Optional[int] = None
    blocked: Optional[int] = None
    completed: Optional[int] = None
    is_available: bool = False
    status_message: str = "Workload data unavailable"


class TeamMetricsOverviewResponse(BaseModel):
    team_id: str
    ai_runtime_metrics: TeamAIRuntimeStats
    member_runtime_breakdown: List[TeamMemberRuntimeStats] = Field(default_factory=list)
    workload_metrics_integrated: bool = False
    workload_status_message: str = "Workload data unavailable until task/project management integration."
    member_workloads: List[TeamMemberWorkloadStatus] = Field(default_factory=list)
    project_velocity_integrated: bool = False
    project_velocity_message: str = "Project velocity will be available after project/task integration."
