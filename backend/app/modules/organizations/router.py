"""Organizations module — HTTP router."""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.organizations.schemas import (
    MemberResponse, OrganizationCreate, OrganizationResponse, OrganizationUpdate,
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
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
):
    service = OrganizationService(db)
    return await service.update(organization_id, body, current_user)


@router.get(
    "/{organization_id}/members",
    response_model=List[MemberResponse],
    summary="List organization members",
)
async def get_members(
    organization_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrganizationService(db)
    return await service.get_members(organization_id, current_user)
