"""Organizations module — HTTP router (Neon PostgreSQL source of truth)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_neon_db
from app.modules.auth.models import User
from app.modules.organizations.models import MemberStatus
from app.modules.organizations.schemas import (
    MemberDetailResponse,
    MemberResponse,
    OrganizationCreate,
    OrganizationResponse,
    OrganizationStatsResponse,
    OrganizationUpdate,
)
from app.modules.organizations.service import OrganizationService

router = APIRouter()


@router.post(
    "/",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new organization",
)
async def create_organization(
    body: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.create(body, current_user)


@router.get(
    "/{organization_id}",
    response_model=OrganizationResponse,
    summary="Get organization by ID",
)
async def get_organization(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.get(organization_id, current_user)


@router.put(
    "/{organization_id}",
    response_model=OrganizationResponse,
    summary="Update organization details",
)
async def update_organization(
    organization_id: str,
    body: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.update(organization_id, body, current_user)


@router.get(
    "/{organization_id}/stats",
    response_model=OrganizationStatsResponse,
    summary="Get organization member & twin statistics",
)
async def get_organization_stats(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.get_stats(organization_id, current_user)


@router.get(
    "/{organization_id}/members",
    response_model=List[MemberResponse],
    summary="List organization members",
)
async def get_members(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.get_members(organization_id, current_user)


@router.get(
    "/{organization_id}/members/detailed",
    response_model=List[MemberDetailResponse],
    summary="List organization members with full user profiles",
)
async def get_detailed_members(
    organization_id: str,
    status_filter: Optional[MemberStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.get_detailed_members(organization_id, current_user, status=status_filter)


@router.post(
    "/{organization_id}/members/{member_id}/approve",
    response_model=MemberDetailResponse,
    summary="Approve a pending employee registration request",
)
async def approve_member(
    organization_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.approve_member(organization_id, member_id, current_user)


@router.post(
    "/{organization_id}/members/{member_id}/reject",
    response_model=MemberDetailResponse,
    summary="Reject an employee registration request",
)
async def reject_member(
    organization_id: str,
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OrganizationService(db)
    return await service.reject_member(organization_id, member_id, current_user)
