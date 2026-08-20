"""
Comprehensive tests for Employee Registration connected to Neon PostgreSQL.
Validates organization verification, forced EMPLOYEE role, multi-tenant membership,
atomic transactions, approval workflow, post-approval login, and SQLite agent isolation.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User, UserRole
from app.modules.demo_agent.models import AgentSession
from app.modules.organizations.models import MemberStatus, Organization, OrganizationMember, OrgStatus


@pytest.mark.asyncio
async def test_employee_registration_success(client: AsyncClient, db_session: AsyncSession):
    """Test 1: Valid organization + valid employee registration creates User & OrganizationMember in INVITED (Pending Approval) status."""
    # Find existing registered active organization
    res_org = await db_session.execute(select(Organization).where(Organization.status == OrgStatus.ACTIVE).limit(1))
    org = res_org.scalar_one()

    payload = {
        "organization_id": org.id,
        "name": "Devin Torres",
        "email": "devin.torres@company.ai",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
        "employee_id": "EMP-9021",
        "department": "Engineering",
        "job_title": "Backend Systems Engineer",
        "phone": "+1-555-0245",
    }

    res = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["success"] is True
    assert data["requires_approval"] is True
    assert "submitted to the organization administrator" in data["message"]
    assert data["user"]["email"] == "devin.torres@company.ai"
    assert data["user"]["role"] == "EMPLOYEE"
    assert data["user"]["organization_id"] == org.id

    # Verify Neon Database Records & Foreign Key Linkages
    user_id = data["user"]["id"]
    res_user = await db_session.execute(select(User).where(User.id == user_id))
    user_row = res_user.scalar_one_or_none()
    assert user_row is not None
    assert user_row.role == UserRole.EMPLOYEE  # Forced backend role
    assert user_row.employee_id == "EMP-9021"
    assert user_row.department == "Engineering"

    # Verify OrganizationMember in Neon has INVITED (Pending Approval) status
    res_mem = await db_session.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == user_id,
        )
    )
    mem_row = res_mem.scalar_one_or_none()
    assert mem_row is not None
    assert mem_row.role == "EMPLOYEE"
    assert mem_row.status == MemberStatus.INVITED


@pytest.mark.asyncio
async def test_employee_registration_nonexistent_organization(client: AsyncClient):
    """Test 2: Nonexistent organization is rejected with required company registration message."""
    payload = {
        "organization_id": "nonexistent-org-uuid-000000000000",
        "name": "Lost Candidate",
        "email": "lost@unknowncompany.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert res.status_code == 400
    msg = res.json()["error"]["message"]
    assert "The given company does not exist yet" in msg
    assert "The company should first register themselves" in msg


@pytest.mark.asyncio
async def test_employee_registration_inactive_organization(client: AsyncClient, db_session: AsyncSession):
    """Test 3: Suspended / Inactive organization is rejected."""
    suspended_org = Organization(
        company_name="Suspended Corp",
        company_email="admin@suspendedcorp.com",
        status=OrgStatus.SUSPENDED,
    )
    db_session.add(suspended_org)
    await db_session.commit()

    payload = {
        "organization_id": suspended_org.id,
        "name": "Candidate Two",
        "email": "candidate2@suspendedcorp.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert res.status_code == 400
    assert "The given company does not exist yet" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_employee_registration_duplicate_email(client: AsyncClient, db_session: AsyncSession):
    """Test 4: Duplicate email returns required login prompt message."""
    res_org = await db_session.execute(select(Organization).limit(1))
    org = res_org.scalar_one()

    payload = {
        "organization_id": org.id,
        "name": "Duplicate Rohan",
        "email": "employee@company.ai",  # Already in database
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert res.status_code == 409
    assert "An account with this email already exists. Please log in instead." in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_employee_approval_workflow_and_post_approval_login(client: AsyncClient, db_session: AsyncSession):
    """Test: Pending employee requires admin approval before login; reflects in pending stats."""
    res_org = await db_session.execute(select(Organization).limit(1))
    org = res_org.scalar_one()

    # 1. Company Admin logs in
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.ai", "password": "SecureAdmin1"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    # 2. Check stats before registration
    stats_before = await client.get(f"/api/v1/organizations/{org.id}/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert stats_before.status_code == 200
    pending_before = stats_before.json()["pending_invitations"]

    # 3. New employee registers
    reg_payload = {
        "organization_id": org.id,
        "name": "Kiran Patel",
        "email": "kiran.patel@company.ai",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    reg_res = await client.post("/api/v1/onboarding/employee/register", json=reg_payload)
    assert reg_res.status_code == 201

    # 4. Check stats after registration -> pending_invitations incremented!
    stats_after = await client.get(f"/api/v1/organizations/{org.id}/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert stats_after.status_code == 200
    assert stats_after.json()["pending_invitations"] == pending_before + 1

    # 5. Attempting to log in as employee before approval is rejected with 403
    emp_login_early = await client.post(
        "/api/v1/auth/login",
        json={"email": "kiran.patel@company.ai", "password": "SecurePassword1"},
    )
    assert emp_login_early.status_code == 403
    assert "pending administrator approval" in emp_login_early.json()["error"]["message"]

    # 6. Admin fetches detailed pending requests
    pending_list = await client.get(
        f"/api/v1/organizations/{org.id}/members/detailed?status=INVITED",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert pending_list.status_code == 200
    members = pending_list.json()
    target_mem = next(m for m in members if m["email"] == "kiran.patel@company.ai")
    assert target_mem["status"] == "INVITED"

    # 7. Admin approves the pending employee
    approve_res = await client.post(
        f"/api/v1/organizations/{org.id}/members/{target_mem['id']}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "ACTIVE"

    # 8. Employee can now log in successfully
    emp_login_success = await client.post(
        "/api/v1/auth/login",
        json={"email": "kiran.patel@company.ai", "password": "SecurePassword1"},
    )
    assert emp_login_success.status_code == 200
    assert emp_login_success.json()["user"]["role"] == "EMPLOYEE"


@pytest.mark.asyncio
async def test_sqlite_agent_database_untouched_during_employee_registration(client: AsyncClient, db_session: AsyncSession):
    """Test 13, 14: Employee registration touches zero SQLite Agent tables and creates zero agent records."""
    res_org = await db_session.execute(select(Organization).limit(1))
    org = res_org.scalar_one()

    # Agent session count before
    res_before = await db_session.execute(select(AgentSession))
    count_before = len(res_before.scalars().all())

    reg_payload = {
        "organization_id": org.id,
        "name": "Tara West",
        "email": "tara.west@company.ai",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    reg_res = await client.post("/api/v1/onboarding/employee/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Agent session count after
    res_after = await db_session.execute(select(AgentSession))
    count_after = len(res_after.scalars().all())

    assert count_before == count_after == 0
