"""Auth module — HTTP router (Neon PostgreSQL source of truth)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_identity
from app.db.session import get_neon_db
from app.modules.auth.schemas import (
    CurrentUser,
    LoginRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_neon_db),
):
    service = AuthService(db)
    return await service.register(body)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive JWT tokens",
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_neon_db),
):
    service = AuthService(db)
    return await service.login(body)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using refresh token",
)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_neon_db),
):
    service = AuthService(db)
    return await service.refresh(body.refresh_token)


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Get current authenticated user identity",
)
async def me(
    identity: CurrentUser = Depends(get_current_identity),
):
    user_resp = UserResponse(
        id=identity.user_id,
        name=identity.name,
        email=identity.email,
        job_title=identity.job_title,
        department=identity.department,
        employee_id=identity.employee_id,
        role=identity.role,
        is_active=identity.is_active,
        organization_id=identity.organization_id,
        created_at=getattr(identity, "created_at", None) or getattr(identity, "updated_at", None) or "2026-08-19T00:00:00Z",
    )
    return MeResponse(data=user_resp)
