"""Auth module — Business logic service."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth.models import User
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.modules.organizations.models import OrganizationMember


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, data: RegisterRequest) -> TokenResponse:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise ConflictException("Email address is already registered")

        user = await self.repo.create(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
            phone=data.phone,
            job_title=data.job_title,
        )
        return await self._issue_tokens(user)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedException("Account is disabled")
        return await self._issue_tokens(user)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        from jose import JWTError
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            user = await self.repo.get_by_id(payload["sub"])
            if not user or not user.is_active:
                raise UnauthorizedException("User not found")
            return await self._issue_tokens(user)
        except JWTError:
            raise UnauthorizedException("Invalid or expired refresh token")

    async def _issue_tokens(self, user: User) -> TokenResponse:
        access  = create_access_token(user.id, {"role": user.role.value})
        refresh = create_refresh_token(user.id)

        # Query organization membership
        res_mem = await self.db.execute(
            select(OrganizationMember).where(OrganizationMember.user_id == user.id)
        )
        mem = res_mem.scalars().first()
        org_id = mem.organization_id if mem else None

        user_resp = UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            phone=user.phone,
            job_title=user.job_title,
            department=user.department,
            employee_id=user.employee_id,
            role=user.role,
            is_active=user.is_active,
            organization_id=org_id,
            created_at=user.created_at,
        )
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            user=user_resp,
        )
