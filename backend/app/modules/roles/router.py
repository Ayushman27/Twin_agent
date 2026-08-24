"""Roles module — FastAPI router endpoints for roles, capabilities, and employee role assignments."""
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_company_admin
from app.db.postgres import get_neon_db
from app.db.session import get_db as get_agent_db
from app.modules.auth.schemas import CurrentUser
from app.agentic.schemas import AgentGroupResponse
from app.modules.roles.models import RoleStatus
from app.modules.roles.schemas import (
    EmployeeRoleAssignRequest,
    EmployeeRoleAssignmentResponse,
    RoleCapabilitiesListResponse,
    RoleCapabilitiesUpdateRequest,
    RoleCreate,
    RoleListResponse,
    RoleResponse,
    RoleUpdate,
    RoleWithCapabilitiesResponse,
    WorkforceProvisionRequest,
)
from app.modules.roles.service import RoleService

router = APIRouter(tags=["Roles & AI Workforce"])


@router.get(
    "/organizations/{organization_id}/roles",
    response_model=RoleListResponse,
    summary="List all organizational roles with filters",
)
async def list_organization_roles(
    organization_id: str,
    department: Optional[str] = Query(None, description="Filter by department"),
    status_filter: Optional[RoleStatus] = Query(None, alias="status", description="Filter by lifecycle status"),
    search: Optional[str] = Query(None, description="Search role title or description"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.list_roles(
        organization_id=organization_id,
        current_user=current_admin,
        department=department,
        status=status_filter,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/organizations/{organization_id}/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organizational role blueprint",
)
async def create_organization_role(
    organization_id: str,
    payload: RoleCreate,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.create_role(
        organization_id=organization_id,
        data=payload,
        current_user=current_admin,
    )


@router.get(
    "/organizations/{organization_id}/roles/{role_id}",
    response_model=RoleWithCapabilitiesResponse,
    summary="Get detailed role blueprint with capability bundle",
)
async def get_organization_role(
    organization_id: str,
    role_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.get_role(
        organization_id=organization_id,
        role_id=role_id,
        current_user=current_admin,
    )


@router.patch(
    "/organizations/{organization_id}/roles/{role_id}",
    response_model=RoleResponse,
    summary="Update role blueprint",
)
async def update_organization_role(
    organization_id: str,
    role_id: str,
    payload: RoleUpdate,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.update_role(
        organization_id=organization_id,
        role_id=role_id,
        data=payload,
        current_user=current_admin,
    )


@router.delete(
    "/organizations/{organization_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an organizational role",
)
async def delete_organization_role(
    organization_id: str,
    role_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    await service.delete_role(
        organization_id=organization_id,
        role_id=role_id,
        current_user=current_admin,
    )
    return None


@router.get(
    "/organizations/{organization_id}/roles/{role_id}/capabilities",
    response_model=RoleCapabilitiesListResponse,
    summary="Get capabilities configured for a role",
)
async def get_role_capabilities(
    organization_id: str,
    role_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.get_role_capabilities(
        organization_id=organization_id,
        role_id=role_id,
        current_user=current_admin,
    )


@router.put(
    "/organizations/{organization_id}/roles/{role_id}/capabilities",
    response_model=RoleCapabilitiesListResponse,
    summary="Update and reconcile capabilities assigned to a role",
)
async def update_role_capabilities(
    organization_id: str,
    role_id: str,
    payload: RoleCapabilitiesUpdateRequest,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.update_role_capabilities(
        organization_id=organization_id,
        role_id=role_id,
        capability_identifiers=payload.capabilities,
        current_user=current_admin,
    )


# ── Employee Role Assignment Endpoints ────────────────────────────

@router.get(
    "/organizations/{organization_id}/employees/{employee_id}/role",
    response_model=EmployeeRoleAssignmentResponse,
    summary="Get assigned Job/AI Role blueprint for an employee",
)
async def get_employee_role_assignment(
    organization_id: str,
    employee_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.get_employee_role_assignment(
        organization_id=organization_id,
        employee_id=employee_id,
        current_user=current_admin,
    )


@router.put(
    "/organizations/{organization_id}/employees/{employee_id}/role",
    response_model=EmployeeRoleAssignmentResponse,
    summary="Assign a Job/AI Role blueprint to an employee",
)
async def assign_employee_role(
    organization_id: str,
    employee_id: str,
    payload: EmployeeRoleAssignRequest,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    service = RoleService(neon_db=neon_db, agent_db=agent_db)
    return await service.assign_employee_role(
        organization_id=organization_id,
        employee_id=employee_id,
        role_id=payload.role_id,
        current_user=current_admin,
    )


# ── AI Workforce Provisioning Endpoints (AgentFactory Integration) ──

@router.post(
    "/organizations/{organization_id}/employees/{employee_id}/agent-workforce/provision",
    response_model=AgentGroupResponse,
    summary="Provision or re-provision an employee's AI agent workforce via AgentFactory",
)
async def provision_employee_agent_workforce(
    organization_id: str,
    employee_id: str,
    payload: Optional[WorkforceProvisionRequest] = None,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    from app.agentic.factory.provisioning_service import RoleProvisioningService

    service = RoleProvisioningService(neon_db=neon_db, agent_db=agent_db)
    target_role_id = payload.role_id if payload else None
    force_regenerate = payload.force_regenerate if payload else False

    return await service.provision_employee_workforce(
        organization_id=organization_id,
        employee_id=employee_id,
        current_user=current_admin,
        target_role_id=target_role_id,
        force_regenerate=force_regenerate,
    )


@router.get(
    "/organizations/{organization_id}/employees/{employee_id}/agent-workforce",
    response_model=Optional[AgentGroupResponse],
    summary="Get active provisioned AI agent workforce for an employee",
)
async def get_employee_agent_workforce(
    organization_id: str,
    employee_id: str,
    current_admin: CurrentUser = Depends(require_company_admin),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
):
    from app.agentic.factory.provisioning_service import RoleProvisioningService

    service = RoleProvisioningService(neon_db=neon_db, agent_db=agent_db)
    return await service.get_employee_active_workforce(
        organization_id=organization_id,
        employee_id=employee_id,
        current_user=current_admin,
    )
