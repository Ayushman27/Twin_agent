"""
Shared FastAPI dependencies: auth, role checks, org isolation, and Agent Identity Bridge.
Authoritative source: Neon PostgreSQL (users, organizations, organization_members).
"""
from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.db.session import get_db, get_neon_db
from app.modules.auth.models import User, UserRole
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import AgentAccessContext, CurrentUser
from app.modules.organizations.models import OrganizationMember

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_identity(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_neon_db),
) -> CurrentUser:
    """
    Authoritative Identity Context from Neon PostgreSQL.
    Resolves user_id, organization_id, and role from Neon.
    """
    if not credentials:
        raise UnauthorizedException("Authentication token required")

    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise UnauthorizedException("Invalid or expired token")

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    # Authoritatively resolve organization_id from Neon organization_members
    res_member = await db.execute(
        select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    )
    membership = res_member.scalars().first()
    org_id = membership.organization_id if membership else None

    return CurrentUser(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        organization_id=org_id,
        is_active=user.is_active,
        department=user.department,
        job_title=user.job_title,
        employee_id=user.employee_id,
    )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_neon_db),
) -> User:
    """
    Retrieve authenticated User ORM model from Neon PostgreSQL,
    enriched with organization_id attribute.
    """
    if not credentials:
        raise UnauthorizedException("Authentication token required")

    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise UnauthorizedException("Invalid or expired token")

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or inactive")

    # Attach authoritative organization_id
    res_member = await db.execute(
        select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    )
    membership = res_member.scalars().first()
    setattr(user, "organization_id", membership.organization_id if membership else None)

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise ForbiddenException("Account is disabled")
    return current_user


def require_roles(*roles: UserRole):
    """Factory: returns a dependency that enforces role membership."""

    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenException(
                f"Required role(s): {[r.value for r in roles]}"
            )
        return current_user

    return _check


async def require_company_admin(
    identity: CurrentUser = Depends(get_current_identity),
) -> CurrentUser:
    """
    Authoritative Company Administrator check:
    - User is active
    - Role is ORG_ADMIN or SUPER_ADMIN
    - Has valid organization association in Neon
    """
    if not identity.is_active:
        raise ForbiddenException("Account is disabled")
    if not identity.is_company_admin:
        raise ForbiddenException("Company administrator access required")
    if not identity.has_organization:
        raise ForbiddenException("Administrator has no registered organization association")
    return identity


async def require_employee(
    identity: CurrentUser = Depends(get_current_identity),
) -> CurrentUser:
    """
    Authoritative Employee check:
    - User is active
    - Role is EMPLOYEE
    - Has valid organization association in Neon
    """
    if not identity.is_active:
        raise ForbiddenException("Account is disabled")
    if not identity.is_employee:
        raise ForbiddenException("Employee access required")
    if not identity.has_organization:
        raise ForbiddenException("Employee is not affiliated with an active organization")
    return identity


async def get_agent_access_context(
    identity: CurrentUser = Depends(get_current_identity),
) -> AgentAccessContext:
    """
    Application-level bridge context for the Agent subsystem.
    Supplies validated user_id and organization_id from Neon to SQLite agent operations.
    """
    return AgentAccessContext(
        user_id=identity.user_id,
        organization_id=identity.organization_id,
        role=identity.role,
        user_name=identity.name,
        user_email=identity.email,
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_neon_db),
) -> Optional[User]:
    """Returns user from Neon if authenticated, None otherwise (for public/optional endpoints)."""
    if not credentials:
        return None
    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        return None
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user:
        res_member = await db.execute(
            select(OrganizationMember).where(OrganizationMember.user_id == user.id)
        )
        membership = res_member.scalars().first()
        setattr(user, "organization_id", membership.organization_id if membership else None)
    return user
