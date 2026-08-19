"""
Comprehensive tests for Neon PostgreSQL Authentication & SQLite Identity Bridge.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_agent_access_context,
    get_current_identity,
    require_company_admin,
    require_employee,
)
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import create_access_token, hash_password
from app.modules.auth.models import User, UserRole
from app.modules.auth.schemas import CurrentUser
from app.modules.demo_agent.models import AgentMessage, AgentSession
from app.modules.organizations.models import MemberStatus, Organization, OrganizationMember, OrgStatus


@pytest.mark.asyncio
async def test_valid_company_admin_login(client: AsyncClient, db_session: AsyncSession):
    """Test 1: Valid company login authenticates against Neon and returns valid tokens + org."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.ai", "password": "SecureAdmin1"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@company.ai"
    assert data["user"]["role"] == "ORG_ADMIN"
    assert data["user"]["organization_id"] is not None


@pytest.mark.asyncio
async def test_valid_employee_login(client: AsyncClient, db_session: AsyncSession):
    """Test 2: Valid employee login authenticates against Neon and returns valid tokens + org."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@company.ai", "password": "SecureEmployee1"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "employee@company.ai"
    assert data["user"]["role"] == "EMPLOYEE"
    assert data["user"]["organization_id"] is not None


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Test 3: Invalid password fails with 401 Unauthorized."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.ai", "password": "WrongPassword123"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    """Test 4: Unknown email fails with 401 Unauthorized."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent_person_999@company.ai", "password": "Password123"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(client: AsyncClient, db_session: AsyncSession):
    """Test 5: Inactive user fails authentication."""
    inactive_user = User(
        name="Disabled User",
        email="disabled@company.ai",
        password_hash=hash_password("SecurePass1"),
        role=UserRole.EMPLOYEE,
        is_active=False,
    )
    db_session.add(inactive_user)
    await db_session.commit()

    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "disabled@company.ai", "password": "SecurePass1"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_unaffiliated_employee_rejected_by_require_employee(db_session: AsyncSession):
    """Test 6: User with no organization membership fails employee access."""
    identity = CurrentUser(
        user_id="user_unaffiliated_123",
        email="unaffil@company.ai",
        name="Unaffiliated User",
        role=UserRole.EMPLOYEE,
        organization_id=None,
        is_active=True,
    )
    with pytest.raises(ForbiddenException) as exc:
        await require_employee(identity=identity)
    assert "not affiliated" in str(exc.value.message)


@pytest.mark.asyncio
async def test_incorrect_role_authorization_rejection(db_session: AsyncSession):
    """Test 7: Role enforcement rejects invalid roles."""
    emp_identity = CurrentUser(
        user_id="emp_123",
        email="emp@company.ai",
        name="Employee",
        role=UserRole.EMPLOYEE,
        organization_id="org_123",
        is_active=True,
    )
    # Employee cannot access Company Admin protected resources
    with pytest.raises(ForbiddenException) as exc:
        await require_company_admin(identity=emp_identity)
    assert "Company administrator access required" in str(exc.value.message)

    admin_identity = CurrentUser(
        user_id="admin_123",
        email="admin@company.ai",
        name="Admin",
        role=UserRole.ORG_ADMIN,
        organization_id="org_123",
        is_active=True,
    )
    # Admin cannot access Employee-specific flow
    with pytest.raises(ForbiddenException) as exc:
        await require_employee(identity=admin_identity)
    assert "Employee access required" in str(exc.value.message)


@pytest.mark.asyncio
async def test_identity_context_resolution(db_session: AsyncSession):
    """Test 8-10: Correct user_id, organization_id, and role resolution."""
    res_admin = await db_session.execute(select(User).where(User.email == "admin@company.ai"))
    admin = res_admin.scalar_one()

    token = create_access_token(admin.id)
    from fastapi.security import HTTPAuthorizationCredentials
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    identity = await get_current_identity(credentials=creds, db=db_session)
    assert identity.user_id == admin.id
    assert identity.role == UserRole.ORG_ADMIN
    assert identity.organization_id is not None
    assert identity.is_company_admin is True


@pytest.mark.asyncio
async def test_agent_access_context_bridge():
    """Test 11: Agent Access Context bridges identity into SQLite layer safely."""
    identity = CurrentUser(
        user_id="usr_neon_999",
        email="worker@company.ai",
        name="Worker One",
        role=UserRole.EMPLOYEE,
        organization_id="org_neon_888",
        is_active=True,
    )
    bridge_ctx = await get_agent_access_context(identity=identity)
    assert bridge_ctx.user_id == "usr_neon_999"
    assert bridge_ctx.organization_id == "org_neon_888"
    assert bridge_ctx.role == UserRole.EMPLOYEE
    assert bridge_ctx.user_name == "Worker One"
    assert bridge_ctx.user_email == "worker@company.ai"


@pytest.mark.asyncio
async def test_auth_me_endpoint_and_token_refresh(client: AsyncClient):
    """Test 12: GET /auth/me returns authoritative user profile and organization."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.ai", "password": "SecureAdmin1"},
    )
    tokens = login_res.json()
    token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # Test /me
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()["data"]
    assert me_data["email"] == "admin@company.ai"
    assert me_data["organization_id"] is not None

    # Test /refresh
    ref_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()
