"""Projects module — FastAPI Router (Neon PostgreSQL)."""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.postgres import get_neon_db
from app.db.sqlite import get_agent_db
from app.modules.auth.schemas import CurrentUser
from app.modules.projects.models import (
    ProjectPriority,
    ProjectRiskLevel,
    ProjectStatus,
)
from app.modules.projects.schemas import (
    ConnectGithubPayload,
    ConnectJiraPayload,
    ProjectCreatePayload,
    ProjectDeliveryAnalyticsResponse,
    ProjectDetailResponse,
    ProjectHealthDiagnosticsResponse,
    ProjectIntegrationResponse,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdatePayload,
)
from app.modules.projects.service import ProjectService

router = APIRouter(tags=["Projects"])


@router.post(
    "/organizations/{organization_id}/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Project (Admin Only)",
)
async def create_project(
    organization_id: str,
    payload: ProjectCreatePayload,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Create a new organizational Project.
    Validates project code uniqueness, project owner, and assigned team within the organization.
    """
    service = ProjectService(db)
    return await service.create_project(
        org_id=organization_id,
        payload=payload,
        current_user=current_user,
    )


@router.get(
    "/organizations/{organization_id}/projects",
    response_model=ProjectListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Organization Projects with Filters",
)
async def list_projects(
    organization_id: str,
    status: Optional[ProjectStatus] = Query(None, description="Filter by project status"),
    priority: Optional[ProjectPriority] = Query(None, description="Filter by priority level"),
    risk_level: Optional[ProjectRiskLevel] = Query(None, description="Filter by risk level"),
    team_id: Optional[str] = Query(None, description="Filter by assigned team ID"),
    owner_id: Optional[str] = Query(None, description="Filter by project owner ID"),
    search: Optional[str] = Query(None, description="Search by name, code, or description"),
    limit: int = Query(50, ge=1, le=100, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all projects for the organization with status, priority, risk, team, owner, and text search filters."""
    service = ProjectService(db)
    return await service.list_projects(
        org_id=organization_id,
        status_filter=status,
        priority=priority,
        risk_level=risk_level,
        team_id=team_id,
        owner_id=owner_id,
        search=search,
        limit=limit,
        offset=offset,
        current_user=current_user,
    )


@router.get(
    "/organizations/{organization_id}/projects/{project_id}",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Project Details",
)
async def get_project(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Retrieve detailed project information, assigned team, ownership, and enrolled members."""
    service = ProjectService(db)
    return await service.get_project(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


@router.patch(
    "/organizations/{organization_id}/projects/{project_id}",
    response_model=ProjectResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Project Configuration (Admin Only)",
)
async def update_project(
    organization_id: str,
    project_id: str,
    payload: ProjectUpdatePayload,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update project status, progress, owner, assigned team, priority, risk level, or metadata."""
    service = ProjectService(db)
    return await service.update_project(
        org_id=organization_id,
        project_id=project_id,
        payload=payload,
        current_user=current_user,
    )


@router.delete(
    "/organizations/{organization_id}/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive or Delete Project (Admin Only)",
)
async def delete_project(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Permanently delete or archive a project."""
    service = ProjectService(db)
    await service.delete_project(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


# ── Project Members Management Endpoints ────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/members",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="List Project Members",
)
async def list_project_members(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all enrolled members for a specific project with employee profiles and project roles."""
    service = ProjectService(db)
    return await service.list_project_members(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/members",
    status_code=status.HTTP_201_CREATED,
    summary="Add Member to Project (Admin Only)",
)
async def add_project_member(
    organization_id: str,
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Enroll an active employee as a project member with a specified project role."""
    from app.modules.projects.schemas import ProjectMemberCreatePayload
    service = ProjectService(db)
    p = ProjectMemberCreatePayload(**payload)
    return await service.add_project_member(
        org_id=organization_id,
        project_id=project_id,
        payload=p,
        current_user=current_user,
    )


@router.patch(
    "/organizations/{organization_id}/projects/{project_id}/members/{employee_id}",
    status_code=status.HTTP_200_OK,
    summary="Update Project Member Role/Status (Admin Only)",
)
async def update_project_member(
    organization_id: str,
    project_id: str,
    employee_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update project member's project-specific role or active status without affecting their organizational role."""
    from app.modules.projects.schemas import ProjectMemberUpdatePayload
    service = ProjectService(db)
    p = ProjectMemberUpdatePayload(**payload)
    return await service.update_project_member(
        org_id=organization_id,
        project_id=project_id,
        employee_id=employee_id,
        payload=p,
        current_user=current_user,
    )


@router.delete(
    "/organizations/{organization_id}/projects/{project_id}/members/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove Member from Project (Admin Only)",
)
async def remove_project_member(
    organization_id: str,
    project_id: str,
    employee_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Remove an employee from a project. Does not delete the employee or any AgentGroups."""
    service = ProjectService(db)
    await service.remove_project_member(
        org_id=organization_id,
        project_id=project_id,
        employee_id=employee_id,
        current_user=current_user,
    )


# ── Project Milestones Endpoints ────────────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/milestones",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="List Project Milestones",
)
async def list_project_milestones(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all checkpoints and milestones for a project."""
    service = ProjectService(db)
    return await service.list_milestones(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/milestones",
    status_code=status.HTTP_201_CREATED,
    summary="Create Project Milestone (Admin Only)",
)
async def create_project_milestone(
    organization_id: str,
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new delivery milestone checkpoint."""
    from app.modules.projects.schemas import ProjectMilestoneCreatePayload
    service = ProjectService(db)
    p = ProjectMilestoneCreatePayload(**payload)
    return await service.create_milestone(
        org_id=organization_id,
        project_id=project_id,
        payload=p,
        current_user=current_user,
    )


@router.patch(
    "/organizations/{organization_id}/projects/{project_id}/milestones/{milestone_id}",
    status_code=status.HTTP_200_OK,
    summary="Update Project Milestone (Admin Only)",
)
async def update_project_milestone(
    organization_id: str,
    project_id: str,
    milestone_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update milestone schedule, status, or progress."""
    from app.modules.projects.schemas import ProjectMilestoneUpdatePayload
    service = ProjectService(db)
    p = ProjectMilestoneUpdatePayload(**payload)
    return await service.update_milestone(
        org_id=organization_id,
        project_id=project_id,
        milestone_id=milestone_id,
        payload=p,
        current_user=current_user,
    )


@router.delete(
    "/organizations/{organization_id}/projects/{project_id}/milestones/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Project Milestone (Admin Only)",
)
async def delete_project_milestone(
    organization_id: str,
    project_id: str,
    milestone_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a project milestone."""
    service = ProjectService(db)
    await service.delete_milestone(
        org_id=organization_id,
        project_id=project_id,
        milestone_id=milestone_id,
        current_user=current_user,
    )


# ── Project Tasks Endpoints ─────────────────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/tasks",
    response_model=list,
    status_code=status.HTTP_200_OK,
    summary="List Project Tasks",
)
async def list_project_tasks(
    organization_id: str,
    project_id: str,
    milestone_id: Optional[str] = Query(None, description="Filter by milestone ID"),
    assignee_id: Optional[str] = Query(None, description="Filter by assignee user ID"),
    status: Optional[str] = Query(None, description="Filter by task status"),
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all organizational tasks for a project with optional filters."""
    from app.modules.projects.models import TaskStatus
    service = ProjectService(db)
    task_status = TaskStatus(status) if status else None
    return await service.list_tasks(
        org_id=organization_id,
        project_id=project_id,
        milestone_id=milestone_id,
        assignee_id=assignee_id,
        status=task_status,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/tasks",
    status_code=status.HTTP_201_CREATED,
    summary="Create Project Task (Admin Only)",
)
async def create_project_task(
    organization_id: str,
    project_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Create a new work item / organizational task for the project."""
    from app.modules.projects.schemas import ProjectTaskCreatePayload
    service = ProjectService(db)
    p = ProjectTaskCreatePayload(**payload)
    return await service.create_task(
        org_id=organization_id,
        project_id=project_id,
        payload=p,
        current_user=current_user,
    )


@router.patch(
    "/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Update Project Task (Admin Only)",
)
async def update_project_task(
    organization_id: str,
    project_id: str,
    task_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update task status, priority, assignee, progress, or blocked reason."""
    from app.modules.projects.schemas import ProjectTaskUpdatePayload
    service = ProjectService(db)
    p = ProjectTaskUpdatePayload(**payload)
    return await service.update_task(
        org_id=organization_id,
        project_id=project_id,
        task_id=task_id,
        payload=p,
        current_user=current_user,
    )


@router.delete(
    "/organizations/{organization_id}/projects/{project_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Project Task (Admin Only)",
)
async def delete_project_task(
    organization_id: str,
    project_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Delete a project task."""
    service = ProjectService(db)
    await service.delete_task(
        org_id=organization_id,
        project_id=project_id,
        task_id=task_id,
        current_user=current_user,
    )


# ── Project AI Workforce Endpoints ──────────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/ai-workforce",
    status_code=status.HTTP_200_OK,
    summary="Get Project AI Workforce Topology",
)
async def get_project_ai_workforce(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get aggregated AI workforce topology for enrolled project members.
    Bridges Neon PostgreSQL (Project, Roles) and SQLite (AgentGroups).
    Strictly read-only; does not invoke AgentFactory or provision agents.
    """
    service = ProjectService(db)
    return await service.get_project_ai_workforce(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
        agent_db=agent_db,
    )


# ── Project Integrations Endpoints ──────────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/integrations",
    response_model=list[ProjectIntegrationResponse],
    status_code=status.HTTP_200_OK,
    summary="List Project Integrations",
)
async def list_project_integrations(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all external integrations configured for a project."""
    service = ProjectService(db)
    return await service.list_project_integrations(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/integrations/github/connect",
    response_model=ProjectIntegrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Connect GitHub Repository Binding (Admin Only)",
)
async def connect_github_integration(
    organization_id: str,
    project_id: str,
    payload: ConnectGithubPayload,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Connect or update GitHub repository binding for a project.
    Credentials are encrypted and separated into auth_config without exposing to client.
    """
    service = ProjectService(db)
    return await service.connect_github(
        org_id=organization_id,
        project_id=project_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/integrations/github/disconnect",
    response_model=ProjectIntegrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Disconnect GitHub Repository Binding (Admin Only)",
)
async def disconnect_github_integration(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Disconnect GitHub repository integration."""
    service = ProjectService(db)
    return await service.disconnect_github(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/integrations/jira/connect",
    response_model=ProjectIntegrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Connect Jira Project Binding (Admin Only)",
)
async def connect_jira_integration(
    organization_id: str,
    project_id: str,
    payload: ConnectJiraPayload,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Connect or update Jira Project binding for a project.
    Credentials are encrypted and separated into auth_config without exposing to client.
    """
    service = ProjectService(db)
    return await service.connect_jira(
        org_id=organization_id,
        project_id=project_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/integrations/jira/disconnect",
    response_model=ProjectIntegrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Disconnect Jira Project Binding (Admin Only)",
)
async def disconnect_jira_integration(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Disconnect Jira project integration."""
    service = ProjectService(db)
    return await service.disconnect_jira(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/projects/{project_id}/integrations/{integration_id}/sync",
    response_model=ProjectIntegrationResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger Sync for External Integration",
)
async def sync_project_integration(
    organization_id: str,
    project_id: str,
    integration_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Trigger manual sync and status refresh for an external integration."""
    service = ProjectService(db)
    return await service.sync_integration(
        org_id=organization_id,
        project_id=project_id,
        integration_id=integration_id,
        current_user=current_user,
    )


@router.delete(
    "/organizations/{organization_id}/projects/{project_id}/integrations/{integration_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Integration Binding (Admin Only)",
)
async def delete_project_integration(
    organization_id: str,
    project_id: str,
    integration_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Remove external integration record completely."""
    service = ProjectService(db)
    await service.delete_integration(
        org_id=organization_id,
        project_id=project_id,
        integration_id=integration_id,
        current_user=current_user,
    )


# ── Health & Blocker Detection ─────────────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/health",
    response_model=ProjectHealthDiagnosticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Deterministic Project Health & Blocker Diagnostics",
)
async def get_project_health(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Retrieve live deterministic project health, milestone health, blockers, and overdue work.
    Evaluated from actual project data according to central rules.
    """
    service = ProjectService(db)
    return await service.get_project_health_diagnostics(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
    )


# ── Delivery Analytics ─────────────────────────────────────────


@router.get(
    "/organizations/{organization_id}/projects/{project_id}/analytics",
    response_model=ProjectDeliveryAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Deterministic Project Delivery Analytics for Overview Dashboard",
)
async def get_project_delivery_analytics(
    organization_id: str,
    project_id: str,
    db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Retrieve deterministic delivery analytics: timeline progress, task delivery breakdown,
    milestone metrics, live team and AgentGroup AI workforce summary, and dynamic risk factors.
    """
    service = ProjectService(db)
    return await service.get_project_delivery_analytics(
        org_id=organization_id,
        project_id=project_id,
        current_user=current_user,
        agent_db=agent_db,
    )





