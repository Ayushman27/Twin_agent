"""Applications module — HTTP router."""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.modules.applications.schemas import (
    ApplicationCreate, ApplicationResponse, ApplicationUpdate,
)
from app.modules.applications.service import ApplicationService
from app.modules.auth.models import User

router = APIRouter()


@router.post(
    "/",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new application",
)
async def create_application(
    body: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ApplicationService(db)
    return await service.create(body, current_user)


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get application by ID",
)
async def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ApplicationService(db)
    return await service.get(application_id, current_user)


@router.put(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Update application",
)
async def update_application(
    application_id: str,
    body: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ApplicationService(db)
    return await service.update(application_id, body, current_user)


@router.post(
    "/{application_id}/submit",
    response_model=ApplicationResponse,
    summary="Submit application for review",
)
async def submit_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ApplicationService(db)
    return await service.submit(application_id, current_user)
