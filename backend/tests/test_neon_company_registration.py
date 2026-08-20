"""
Comprehensive tests for Company Registration directly into Neon PostgreSQL.
Validates atomic transactions, duplicate handling, role enforcement, and cross-database safety.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User, UserRole
from app.modules.demo_agent.models import AgentSession
from app.modules.organizations.models import MemberStatus, Organization, OrganizationMember, OrgStatus


@pytest.mark.asyncio
async def test_company_registration_success(client: AsyncClient, db_session: AsyncSession):
    """Test 1: Successful company registration creates Organization, Admin User, and Membership atomically."""
    payload = {
        "company_name": "Apex Quantum Dynamics",
        "company_email": "hello@apexquantum.io",
        "company_phone": "+1-555-0199",
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 120,
        "website": "https://apexquantum.io",
        "country": "United States",
        "city": "San Francisco",
        "business_model": "B2B Enterprise",
        "description": "Next-generation quantum computing infrastructure.",
        "admin_name": "Elena Rostova",
        "admin_email": "elena@apexquantum.io",
        "admin_phone": "+1-555-0198",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }

    res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["success"] is True
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "elena@apexquantum.io"
    assert data["user"]["role"] == "ORG_ADMIN"
    assert data["organization"]["company_name"] == "Apex Quantum Dynamics"

    # Verify Neon Database Records & Foreign Key Linkages
    user_id = data["user"]["id"]
    org_id = data["organization"]["id"]

    res_user = await db_session.execute(select(User).where(User.id == user_id))
    user_row = res_user.scalar_one_or_none()
    assert user_row is not None
    assert user_row.role == UserRole.ORG_ADMIN
    assert user_row.is_active is True

    res_org = await db_session.execute(select(Organization).where(Organization.id == org_id))
    org_row = res_org.scalar_one_or_none()
    assert org_row is not None
    assert org_row.status == OrgStatus.ACTIVE

    res_mem = await db_session.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )
    mem_row = res_mem.scalar_one_or_none()
    assert mem_row is not None
    assert mem_row.role == "ORG_ADMIN"
    assert mem_row.status == MemberStatus.ACTIVE


@pytest.mark.asyncio
async def test_company_registration_duplicate_company_email(client: AsyncClient):
    """Test 2: Duplicate company email is rejected with clean 409 Conflict."""
    payload = {
        "company_name": "Unique Name Alpha",
        "company_email": "contact@company.ai",  # Already registered in seed
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 80,
        "admin_name": "Admin New",
        "admin_email": "admin_new_123@uniquealpha.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert res.status_code == 409
    assert "already registered" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_company_registration_duplicate_company_name(client: AsyncClient):
    """Test 3: Duplicate company name is rejected with clean 409 Conflict."""
    payload = {
        "company_name": "Twin Agent Technologies Inc.",  # Already registered in seed
        "company_email": "new_email_unique@company.ai",
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 80,
        "admin_name": "Admin New",
        "admin_email": "admin_new_456@uniquealpha.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert res.status_code == 409
    assert "already registered" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_company_registration_duplicate_admin_email(client: AsyncClient):
    """Test 4: Duplicate admin email is rejected with clean 409 Conflict."""
    payload = {
        "company_name": "Brand New Enterprise Inc.",
        "company_email": "enterprise@brandnew.com",
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 80,
        "admin_name": "Existing Asha",
        "admin_email": "admin@company.ai",  # Already in users table
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert res.status_code == 409
    assert "already exists" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_company_registration_size_count_mismatch(client: AsyncClient):
    """Test: Size range mismatch (51-200 with count 50) is rejected with 422."""
    payload = {
        "company_name": "Mismatch Size Corp",
        "company_email": "mismatch@sizecorp.com",
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 50,  # Below 51!
        "admin_name": "Admin Mismatch",
        "admin_email": "admin@sizecorp.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert res.status_code == 422
    assert "does not match the selected company size range" in str(res.json())


@pytest.mark.asyncio
async def test_company_registration_invalid_data(client: AsyncClient):
    """Test 5: Invalid payload (employee count <= 0 or weak password) fails validation."""
    # Invalid employee count <= 0
    bad_count = {
        "company_name": "Invalid Org",
        "company_email": "invalid@org.com",
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 0,  # ge=1 violated
        "admin_name": "Admin",
        "admin_email": "admin@invalid.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/company/register", json=bad_count)
    assert res.status_code == 422

    # Password mismatch
    mismatch = {
        "company_name": "Mismatch Org",
        "company_email": "mismatch@org.com",
        "industry": "Technology",
        "company_size": "1-10",
        "employee_count": 5,
        "admin_name": "Admin",
        "admin_email": "admin@mismatch.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "DifferentPassword2",
    }
    res2 = await client.post("/api/v1/onboarding/company/register", json=mismatch)
    assert res2.status_code == 422


@pytest.mark.asyncio
async def test_post_registration_authenticated_dashboard_access(client: AsyncClient):
    """Test 7-10: Registered administrator immediately accesses /auth/me and protected company endpoints."""
    payload = {
        "company_name": "Nexus Horizon Corp",
        "company_email": "admin@nexushorizon.com",
        "industry": "Telecommunications",
        "company_size": "201-500",
        "employee_count": 250,
        "admin_name": "Marcus Vance",
        "admin_email": "marcus@nexushorizon.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    reg_res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    org_id = reg_res.json()["organization"]["id"]

    # Verify /me endpoint returns ORG_ADMIN with exact organization_id
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()["data"]
    assert me_data["role"] == "ORG_ADMIN"
    assert me_data["organization_id"] == org_id
    assert me_data["email"] == "marcus@nexushorizon.com"

    # Verify protected Organization details endpoint
    org_res = await client.get(f"/api/v1/organizations/{org_id}", headers={"Authorization": f"Bearer {token}"})
    assert org_res.status_code == 200
    assert org_res.json()["company_name"] == "Nexus Horizon Corp"


@pytest.mark.asyncio
async def test_sqlite_agent_database_remains_untouched_during_registration(client: AsyncClient, db_session: AsyncSession):
    """Test 13: Registration never touches SQLite Agent tables or inserts agent records."""
    # Count sessions before
    res_before = await db_session.execute(select(AgentSession))
    count_before = len(res_before.scalars().all())

    payload = {
        "company_name": "Starlight AI Labs",
        "company_email": "info@starlight.ai",
        "industry": "Artificial Intelligence",
        "company_size": "11-50",
        "employee_count": 25,
        "admin_name": "Zara Chen",
        "admin_email": "zara@starlight.ai",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    reg_res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert reg_res.status_code == 201

    # Count sessions after
    res_after = await db_session.execute(select(AgentSession))
    count_after = len(res_after.scalars().all())

    assert count_before == count_after == 0  # No agent sessions created
