"""
Automated Test Suite for Phase 1 — Email Data Model and Employee Directory Integration
======================================================================================
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.modules.auth.models import User, UserRole
from app.modules.organizations.models import Organization, OrganizationMember, OrgStatus, MemberStatus
from app.db.models.email import EmailStatus


@pytest.mark.asyncio
async def test_email_directory_resolution_and_isolation(client: AsyncClient, db_session: AsyncSession):
    # ── 1. Seed Organizations and Employees ───────────────────────────────────
    # Org A: Alpha Corp
    org_a = Organization(
        company_name="Alpha Corp",
        company_email="contact@alphacorp.ai",
        status=OrgStatus.ACTIVE,
    )
    # Org B: Beta Corp
    org_b = Organization(
        company_name="Beta Corp",
        company_email="contact@betacorp.ai",
        status=OrgStatus.ACTIVE,
    )
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    # Employees in Org A
    sender_a = User(
        name="Asha Sender",
        email="asha.sender@alphacorp.ai",
        password_hash=hash_password("Password123!"),
        role=UserRole.EMPLOYEE,
        job_title="Product Manager",
        department="Product",
        employee_id="EMP-100",
        is_active=True,
    )
    rahul_eng = User(
        name="Rahul Sharma",
        email="rahul.sharma@alphacorp.ai",
        password_hash=hash_password("Password123!"),
        role=UserRole.EMPLOYEE,
        job_title="Senior Backend Engineer",
        department="Engineering",
        employee_id="EMP-101",
        is_active=True,
    )
    rahul_fin = User(
        name="Rahul Verma",
        email="rahul.verma@alphacorp.ai",
        password_hash=hash_password("Password123!"),
        role=UserRole.EMPLOYEE,
        job_title="Financial Analyst",
        department="Finance",
        employee_id="EMP-102",
        is_active=True,
    )
    priya_unique = User(
        name="Priya Patel",
        email="priya.patel@alphacorp.ai",
        password_hash=hash_password("Password123!"),
        role=UserRole.EMPLOYEE,
        job_title="UX Designer",
        department="Design",
        employee_id="EMP-103",
        is_active=True,
    )

    # Employee in Org B (Should NEVER be visible to Org A)
    foreign_user = User(
        name="Vikram Beta",
        email="vikram@betacorp.ai",
        password_hash=hash_password("Password123!"),
        role=UserRole.EMPLOYEE,
        job_title="DevOps Engineer",
        department="Infrastructure",
        employee_id="EMP-999",
        is_active=True,
    )

    db_session.add_all([sender_a, rahul_eng, rahul_fin, priya_unique, foreign_user])
    await db_session.flush()

    # Link to Org A
    for u in [sender_a, rahul_eng, rahul_fin, priya_unique]:
        db_session.add(
            OrganizationMember(
                organization_id=org_a.id,
                user_id=u.id,
                role="EMPLOYEE",
                status=MemberStatus.ACTIVE,
            )
        )
    # Link to Org B
    db_session.add(
        OrganizationMember(
            organization_id=org_b.id,
            user_id=foreign_user.id,
            role="EMPLOYEE",
            status=MemberStatus.ACTIVE,
        )
    )
    await db_session.commit()

    # Generate Auth Token for Asha in Org A
    token_a = create_access_token(sender_a.id)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # ── 2. Test Exact Employee Name ───────────────────────────────────────────
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "Rahul Sharma"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "RESOLVED"
    assert data["employee"]["name"] == "Rahul Sharma"
    assert data["employee"]["email"] == "rahul.sharma@alphacorp.ai"
    assert data["employee"]["department"] == "Engineering"
    assert data["employee"]["employee_id"] == "EMP-101"

    # ── 3. Test Partial Unique Name ───────────────────────────────────────────
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "Priya"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "RESOLVED"
    assert data["employee"]["name"] == "Priya Patel"
    assert data["employee"]["email"] == "priya.patel@alphacorp.ai"

    # ── 4. Test Ambiguous Name Resolution ─────────────────────────────────────
    # "Rahul" matches both Rahul Sharma and Rahul Verma in Org A
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "Rahul"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["status"] == "AMBIGUOUS"
    assert "Multiple employees" in data["message"]
    assert len(data["candidates"]) == 2
    candidate_names = [c["name"] for c in data["candidates"]]
    assert "Rahul Sharma" in candidate_names
    assert "Rahul Verma" in candidate_names
    # Verify candidate metadata is provided to disambiguate
    for c in data["candidates"]:
        assert "department" in c
        assert "job_title" in c
        assert "email" in c

    # ── 5. Test Work Email Match ──────────────────────────────────────────────
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "rahul.verma@alphacorp.ai"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "RESOLVED"
    assert data["employee"]["name"] == "Rahul Verma"
    assert data["employee"]["email"] == "rahul.verma@alphacorp.ai"

    # ── 6. Test Employee ID Match (with and without prefix) ───────────────────
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "EMP-103"},
    )
    assert res.status_code == 200
    assert res.json()["employee"]["name"] == "Priya Patel"

    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "employee EMP-103"},
    )
    assert res.status_code == 200
    assert res.json()["employee"]["name"] == "Priya Patel"

    # ── 7. Test Cross-Organization Isolation ──────────────────────────────────
    # User in Org A queries user in Org B by exact name, email, and employee ID
    for query in ["Vikram Beta", "vikram@betacorp.ai", "EMP-999"]:
        res = await client.post(
            "/api/v1/email/resolve-recipient",
            headers=headers_a,
            json={"query": query},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is False
        assert data["status"] == "NOT_FOUND"
        assert data["employee"] is None
        assert len(data["candidates"]) == 0

    # ── 8. Test Nonexistent Employee ──────────────────────────────────────────
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        headers=headers_a,
        json={"query": "Nonexistent Person 999"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert data["status"] == "NOT_FOUND"

    # ── 9. Test Unauthorized Access ───────────────────────────────────────────
    res = await client.post(
        "/api/v1/email/resolve-recipient",
        json={"query": "Rahul Sharma"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_email_draft_and_history_privacy(client: AsyncClient, db_session: AsyncSession):
    # ── Setup Org and Users ───────────────────────────────────────────────────
    org = Organization(
        company_name="Gamma Tech",
        company_email="contact@gammatech.ai",
        status=OrgStatus.ACTIVE,
    )
    db_session.add(org)
    await db_session.flush()

    user1 = User(
        name="User One",
        email="user1@gammatech.ai",
        password_hash=hash_password("Pass1!"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    user2 = User(
        name="User Two",
        email="user2@gammatech.ai",
        password_hash=hash_password("Pass2!"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    user3 = User(
        name="User Three",
        email="user3@gammatech.ai",
        password_hash=hash_password("Pass3!"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add_all([user1, user2, user3])
    await db_session.flush()

    for u in [user1, user2, user3]:
        db_session.add(
            OrganizationMember(
                organization_id=org.id,
                user_id=u.id,
                role="EMPLOYEE",
                status=MemberStatus.ACTIVE,
            )
        )
    await db_session.commit()

    token1 = create_access_token(user1.id)
    token2 = create_access_token(user2.id)
    token3 = create_access_token(user3.id)

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    headers3 = {"Authorization": f"Bearer {token3}"}

    # 1. User 1 creates a draft email to User 2 using recipient query
    res = await client.post(
        "/api/v1/email/draft",
        headers=headers1,
        json={
            "recipient_query": "User Two",
            "subject": "Project sync meeting",
            "body": "Hi, let's sync at 3 PM today.",
        },
    )
    assert res.status_code == 201
    draft = res.json()
    assert draft["sender_employee_id"] == user1.id
    assert draft["recipient_employee_id"] == user2.id
    assert draft["recipient_email"] == "user2@gammatech.ai"
    assert draft["status"] == "DRAFT"
    email_id = draft["id"]

    # 2. User 1 can view email details
    res = await client.get(f"/api/v1/email/{email_id}", headers=headers1)
    assert res.status_code == 200
    assert res.json()["id"] == email_id

    # 3. User 2 (recipient) can view email details
    res = await client.get(f"/api/v1/email/{email_id}", headers=headers2)
    assert res.status_code == 200
    assert res.json()["id"] == email_id

    # 4. User 3 (unrelated employee in same org) CANNOT view User 1 & 2's private email
    res = await client.get(f"/api/v1/email/{email_id}", headers=headers3)
    assert res.status_code == 403

    # 5. User 1's history contains the email
    res = await client.get("/api/v1/email/history", headers=headers1)
    assert res.status_code == 200
    hist1 = res.json()
    assert hist1["total"] == 1
    assert hist1["emails"][0]["id"] == email_id

    # 6. User 3's history does NOT contain the email
    res = await client.get("/api/v1/email/history", headers=headers3)
    assert res.status_code == 200
    hist3 = res.json()
    assert hist3["total"] == 0
