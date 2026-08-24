"""Teams module — FastAPI router endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, require_company_admin
from app.db.postgres import get_neon_db
from app.db.session import get_agent_db
from app.modules.auth.schemas import CurrentUser
from app.modules.teams.models import TeamStatus
from app.modules.teams.schemas import (
    TeamAIRouteCreate,
    TeamAIRouteListResponse,
    TeamAIRouteResponse,
    TeamAIRouteUpdate,
    TeamAIWorkforceResponse,
    TeamCreate,
    TeamDetailResponse,
    TeamKnowledgeOverviewResponse,
    TeamKnowledgePolicyUpdate,
    TeamKnowledgeSourceCreate,
    TeamKnowledgeSourceResponse,
    TeamKnowledgeSourceUpdate,
    TeamListResponse,
    TeamMemberCreate,
    TeamMemberResponse,
    TeamMetricsOverviewResponse,
    TeamResponse,
    TeamUpdate,
)
from app.modules.teams.service import TeamService

router = APIRouter(tags=["Teams"])


@router.post(
    "/organizations/{organization_id}/teams",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organizational Team",
)
async def create_team(
    organization_id: str,
    payload: TeamCreate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.create_team(
        organization_id=organization_id,
        payload=payload,
        current_user=current_admin,
    )


@router.get(
    "/organizations/{organization_id}/teams",
    response_model=TeamListResponse,
    summary="List organizational Teams with member counts",
)
async def list_teams(
    organization_id: str,
    department: Optional[str] = Query(None, description="Filter by department"),
    status_filter: Optional[TeamStatus] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, description, or department"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.list_teams(
        organization_id=organization_id,
        current_user=current_user,
        department=department,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/organizations/{organization_id}/teams/{team_id}",
    response_model=TeamDetailResponse,
    summary="Get Team detail with members and roles",
)
async def get_team_detail(
    organization_id: str,
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.get_team_detail(
        organization_id=organization_id,
        team_id=team_id,
        current_user=current_user,
    )


@router.patch(
    "/organizations/{organization_id}/teams/{team_id}",
    response_model=TeamResponse,
    summary="Update Team metadata and settings",
)
async def update_team(
    organization_id: str,
    team_id: str,
    payload: TeamUpdate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.update_team(
        organization_id=organization_id,
        team_id=team_id,
        payload=payload,
        current_user=current_admin,
    )


@router.delete(
    "/organizations/{organization_id}/teams/{team_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive/delete an organizational Team",
)
async def delete_team(
    organization_id: str,
    team_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    await service.delete_team(
        organization_id=organization_id,
        team_id=team_id,
        current_user=current_admin,
    )


# ── Team Members Management Endpoints ─────────────────────────

@router.get(
    "/organizations/{organization_id}/teams/{team_id}/members",
    response_model=List[TeamMemberResponse],
    summary="List members enrolled in a Team",
)
async def list_team_members(
    organization_id: str,
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.list_team_members(
        organization_id=organization_id,
        team_id=team_id,
        current_user=current_user,
    )


@router.post(
    "/organizations/{organization_id}/teams/{team_id}/members",
    response_model=TeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an employee to the Team",
)
async def add_team_member(
    organization_id: str,
    team_id: str,
    payload: TeamMemberCreate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.add_team_member(
        organization_id=organization_id,
        team_id=team_id,
        payload=payload,
        current_user=current_admin,
    )


@router.delete(
    "/organizations/{organization_id}/teams/{team_id}/members/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an employee from the Team",
)
async def remove_team_member(
    organization_id: str,
    team_id: str,
    employee_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    await service.remove_team_member(
        organization_id=organization_id,
        team_id=team_id,
        user_id=employee_id,
        current_user=current_admin,
    )


@router.get(
    "/organizations/{organization_id}/teams/{team_id}/ai-workforce",
    response_model=TeamAIWorkforceResponse,
    summary="Get aggregated AI workforce for all members of a Team",
)
async def get_team_ai_workforce(
    organization_id: str,
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = TeamService(neon_db)
    return await service.get_team_ai_workforce(
        organization_id=organization_id,
        team_id=team_id,
        current_user=current_user,
        agent_db=agent_db,
    )


# ── Team AI Mesh Routing Endpoints ─────────────────────────

@router.post(
    "/organizations/{organization_id}/teams/{team_id}/routes",
    response_model=TeamAIRouteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Configure a new inter-role AI Workforce routing rule",
)
async def create_team_route(
    organization_id: str,
    team_id: str,
    payload: TeamAIRouteCreate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.create_team_route(
        organization_id=organization_id,
        team_id=team_id,
        payload=payload,
        current_user=current_admin,
    )


@router.get(
    "/organizations/{organization_id}/teams/{team_id}/routes",
    response_model=TeamAIRouteListResponse,
    summary="List all AI Workforce routing rules configured for a team",
)
async def list_team_routes(
    organization_id: str,
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.list_team_routes(
        organization_id=organization_id,
        team_id=team_id,
        current_user=current_user,
    )


@router.patch(
    "/organizations/{organization_id}/teams/{team_id}/routes/{route_id}",
    response_model=TeamAIRouteResponse,
    summary="Update an AI Workforce routing rule (priority, condition, enabled)",
)
async def update_team_route(
    organization_id: str,
    team_id: str,
    route_id: str,
    payload: TeamAIRouteUpdate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.update_team_route(
        organization_id=organization_id,
        team_id=team_id,
        route_id=route_id,
        payload=payload,
        current_user=current_admin,
    )


@router.delete(
    "/organizations/{organization_id}/teams/{team_id}/routes/{route_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an AI Workforce routing rule",
)
async def delete_team_route(
    organization_id: str,
    team_id: str,
    route_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    await service.delete_team_route(
        organization_id=organization_id,
        team_id=team_id,
        route_id=route_id,
        current_user=current_admin,
    )


# ── Team Knowledge & Memory Boundaries Endpoints ───────────

@router.get(
    "/organizations/{organization_id}/teams/{team_id}/knowledge",
    response_model=TeamKnowledgeOverviewResponse,
    summary="Get squad knowledge access boundaries and configured knowledge sources",
)
async def get_team_knowledge(
    organization_id: str,
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.get_team_knowledge(
        organization_id=organization_id,
        team_id=team_id,
        current_user=current_user,
    )


@router.put(
    "/organizations/{organization_id}/teams/{team_id}/knowledge/policy",
    response_model=TeamKnowledgeOverviewResponse,
    summary="Update squad knowledge access policy and memory isolation level",
)
async def update_team_knowledge_policy(
    organization_id: str,
    team_id: str,
    payload: TeamKnowledgePolicyUpdate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.update_team_knowledge_policy(
        organization_id=organization_id,
        team_id=team_id,
        payload=payload,
        current_user=current_admin,
    )


@router.post(
    "/organizations/{organization_id}/teams/{team_id}/knowledge/sources",
    response_model=TeamKnowledgeSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Configure an explicit knowledge source for the team",
)
async def create_team_knowledge_source(
    organization_id: str,
    team_id: str,
    payload: TeamKnowledgeSourceCreate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.create_team_knowledge_source(
        organization_id=organization_id,
        team_id=team_id,
        payload=payload,
        current_user=current_admin,
    )


@router.patch(
    "/organizations/{organization_id}/teams/{team_id}/knowledge/sources/{source_id}",
    response_model=TeamKnowledgeSourceResponse,
    summary="Update a team knowledge source configuration",
)
async def update_team_knowledge_source(
    organization_id: str,
    team_id: str,
    source_id: str,
    payload: TeamKnowledgeSourceUpdate,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    return await service.update_team_knowledge_source(
        organization_id=organization_id,
        team_id=team_id,
        source_id=source_id,
        payload=payload,
        current_user=current_admin,
    )


@router.delete(
    "/organizations/{organization_id}/teams/{team_id}/knowledge/sources/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a team knowledge source configuration",
)
async def delete_team_knowledge_source(
    organization_id: str,
    team_id: str,
    source_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    db: AsyncSession = Depends(get_neon_db),
):
    service = TeamService(db)
    await service.delete_team_knowledge_source(
        organization_id=organization_id,
        team_id=team_id,
        source_id=source_id,
        current_user=current_admin,
    )


# ── Team Workload & Performance Metrics Endpoints ──────────

@router.get(
    "/organizations/{organization_id}/teams/{team_id}/metrics",
    response_model=TeamMetricsOverviewResponse,
    summary="Get real AI runtime execution metrics and honest unintegrated task workload status",
)
async def get_team_metrics(
    organization_id: str,
    team_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = TeamService(neon_db)
    return await service.get_team_workload_and_metrics(
        organization_id=organization_id,
        team_id=team_id,
        agent_db=agent_db,
        current_user=current_user,
    )
