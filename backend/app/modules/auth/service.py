"""Auth module — Business logic service."""
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
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, db: AsyncSession):
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
        return self._issue_tokens(user)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")
        if not user.is_active:
            raise UnauthorizedException("Account is disabled")
        return self._issue_tokens(user)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        from jose import JWTError
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            user = await self.repo.get_by_id(payload["sub"])
            if not user or not user.is_active:
                raise UnauthorizedException("User not found")
            return self._issue_tokens(user)
        except JWTError:
            raise UnauthorizedException("Invalid or expired refresh token")

    @staticmethod
    def _issue_tokens(user: User) -> TokenResponse:
        from app.modules.auth.schemas import UserResponse
        access  = create_access_token(user.id, {"role": user.role.value})
        refresh = create_refresh_token(user.id)
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            user=UserResponse.model_validate(user),
        )
