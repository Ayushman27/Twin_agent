"""
Comprehensive test suite for Phase 1 — Project Database Model & FastAPI API (Neon PostgreSQL).
Tests:
1. Project creation with owner, team, priority, risk, and progress
2. Project code uniqueness per organization (same code allowed across different orgs)
3. Owner validation (must belong to organization)
4. Team validation (must belong to organization)
5. Progress percent validation server-side (0-100)
6. Status transitions and actual_end_date recording
7. List filtering by status, priority, risk, team, owner, and search
8. Tenant isolation (cross-org 403)
9. Admin authorization barrier (non-admin 403 on mutations)
10. Delete / Cascade verification
"""
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient


async def _create_test_org_and_admin(client: AsyncClient, company_name: str, admin_email: str):
    """Helper to register a fresh company and return auth token + org_id."""
    domain = company_name.lower().replace(" ", "").replace("_", "") + ".com"
    reg_res = await client.post("/api/v1/onboarding/company/register", json={
        "company_name": company_name,
        "company_email": f"contact@{domain}",
        "industry": "Technology",
        "company_size": "11-50",
        "employee_count": 25,
        "admin_name": f"Admin {company_name}",
        "admin_email": admin_email,
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    org_id = reg_res.json()["organization"]["id"]
    return token, org_id


@pytest.mark.asyncio
async def test_create_project_success(client: AsyncClient):
    """Test successful project creation with owner, team, and initial progress."""
    token, org_id = await _create_test_org_and_admin(client, "PrjAlphaCorp", "admin.alpha@proj.com")

    # 1. Create a Team in the organization
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Core Platform Squad", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    # 2. Register an employee in the organization
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Project Lead",
        "email": "lead.proj@alphacorp.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    assert emp_reg.status_code == 201
    emp_id = emp_reg.json()["user"]["id"]

    # Approve employee
    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    for m in members_res.json():
        if m["email"] == "lead.proj@alphacorp.com":
            await client.post(f"/api/v1/organizations/{org_id}/members/{m['id']}/approve", headers={"Authorization": f"Bearer {token}"})

    # 3. Create Project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={
            "name": "AI Orchestration Platform 2.0",
            "project_code": "AOP-001",
            "description": "Next generation agent runtime and mesh infrastructure",
            "owner_id": emp_id,
            "team_id": team_id,
            "status": "ACTIVE",
            "priority": "HIGH",
            "risk_level": "LOW",
            "progress_percent": 15,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert proj_res.status_code == 201
    data = proj_res.json()
    assert data["name"] == "AI Orchestration Platform 2.0"
    assert data["project_code"] == "AOP-001"
    assert data["status"] == "ACTIVE"
    assert data["priority"] == "HIGH"
    assert data["risk_level"] == "LOW"
    assert data["progress_percent"] == 15
    assert data["owner"] is not None
    assert data["owner"]["email"] == "lead.proj@alphacorp.com"
    assert data["team"] is not None
    assert data["team"]["name"] == "Core Platform Squad"
    assert data["member_count"] == 1  # Owner auto-enrolled as member


@pytest.mark.asyncio
async def test_duplicate_project_code_in_same_org_rejected(client: AsyncClient):
    """Duplicate project_code within the same organization must return 409 Conflict."""
    token, org_id = await _create_test_org_and_admin(client, "PrjBetaCorp", "admin.beta@proj.com")

    # Create first project
    res1 = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Project Alpha", "project_code": "PRJ-100"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Try creating second project with same code
    res2 = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Project Beta", "project_code": "prj-100"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 409
    msg = res2.json().get("error", {}).get("message") or res2.json().get("detail", "")
    assert "already exists" in msg


@pytest.mark.asyncio
async def test_same_project_code_in_different_orgs_allowed(client: AsyncClient):
    """Same project_code across different organizations is allowed."""
    token_a, org_a = await _create_test_org_and_admin(client, "PrjOrgA", "admin.a@proj.com")
    token_b, org_b = await _create_test_org_and_admin(client, "PrjOrgB", "admin.b@proj.com")

    res_a = await client.post(
        f"/api/v1/organizations/{org_a}/projects",
        json={"name": "Mobile App", "project_code": "MOB-01"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_a.status_code == 201

    res_b = await client.post(
        f"/api/v1/organizations/{org_b}/projects",
        json={"name": "Mobile App B", "project_code": "MOB-01"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b.status_code == 201


@pytest.mark.asyncio
async def test_project_owner_from_different_org_rejected(client: AsyncClient):
    """Assigning an owner from a different organization must be rejected (400)."""
    token_a, org_a = await _create_test_org_and_admin(client, "PrjOrgA_Owner", "admin.owner_a@proj.com")
    token_b, org_b = await _create_test_org_and_admin(client, "PrjOrgB_Owner", "admin.owner_b@proj.com")

    # Register user in Org B
    emp_b = (await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_b,
        "name": "Foreign User",
        "email": "foreign.user@orgb.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })).json()["user"]["id"]

    # Try assigning foreign user as owner in Org A
    res = await client.post(
        f"/api/v1/organizations/{org_a}/projects",
        json={"name": "Secret Project", "project_code": "SEC-01", "owner_id": emp_b},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 400
    msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
    assert "not a valid member" in msg


@pytest.mark.asyncio
async def test_project_team_from_different_org_rejected(client: AsyncClient):
    """Assigning a team from a different organization must be rejected (400)."""
    token_a, org_a = await _create_test_org_and_admin(client, "PrjOrgA_Team", "admin.team_a@proj.com")
    token_b, org_b = await _create_test_org_and_admin(client, "PrjOrgB_Team", "admin.team_b@proj.com")

    team_b = (await client.post(
        f"/api/v1/organizations/{org_b}/teams",
        json={"name": "Foreign Team"},
        headers={"Authorization": f"Bearer {token_b}"},
    )).json()["id"]

    res = await client.post(
        f"/api/v1/organizations/{org_a}/projects",
        json={"name": "Shared Project", "project_code": "SHR-01", "team_id": team_b},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 400
    msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
    assert "does not belong" in msg


@pytest.mark.asyncio
async def test_progress_percent_validation_server_side(client: AsyncClient):
    """Progress percent must strictly be between 0 and 100."""
    token, org_id = await _create_test_org_and_admin(client, "PrjProgressCorp", "admin.prog@proj.com")

    # Negative progress -> 422
    res_neg = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Invalid Prog 1", "project_code": "PRG-NEG", "progress_percent": -5},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_neg.status_code == 422

    # >100 progress -> 422
    res_over = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Invalid Prog 2", "project_code": "PRG-OVR", "progress_percent": 150},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_over.status_code == 422


@pytest.mark.asyncio
async def test_project_status_transitions_and_actual_end_date(client: AsyncClient):
    """Transitioning to COMPLETED records actual_end_date automatically."""
    token, org_id = await _create_test_org_and_admin(client, "PrjStatusCorp", "admin.status@proj.com")

    create_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Lifecycle Project", "project_code": "LFC-01", "status": "PLANNING"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = create_res.json()["id"]
    assert create_res.json()["actual_end_date"] is None

    # Update to COMPLETED
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        json={"status": "COMPLETED", "progress_percent": 100},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "COMPLETED"
    assert patch_res.json()["progress_percent"] == 100
    assert patch_res.json()["actual_end_date"] is not None


@pytest.mark.asyncio
async def test_project_list_filtering_and_search(client: AsyncClient):
    """Test listing projects with filters (status, priority, risk, search)."""
    token, org_id = await _create_test_org_and_admin(client, "PrjFilterCorp", "admin.filter@proj.com")

    # Create 3 projects
    await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Cloud Migration", "project_code": "CLD-01", "status": "ACTIVE", "priority": "HIGH", "risk_level": "HIGH"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Security Audit", "project_code": "SEC-01", "status": "PLANNING", "priority": "CRITICAL", "risk_level": "MEDIUM"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Billing Revamp", "project_code": "BIL-01", "status": "COMPLETED", "priority": "LOW", "risk_level": "LOW"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 1. Filter by status=ACTIVE
    res_status = await client.get(
        f"/api/v1/organizations/{org_id}/projects?status=ACTIVE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_status.status_code == 200
    assert res_status.json()["total"] == 1
    assert res_status.json()["projects"][0]["project_code"] == "CLD-01"

    # 2. Filter by priority=CRITICAL
    res_pri = await client.get(
        f"/api/v1/organizations/{org_id}/projects?priority=CRITICAL",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_pri.status_code == 200
    assert res_pri.json()["total"] == 1
    assert res_pri.json()["projects"][0]["name"] == "Security Audit"

    # 3. Search by partial term "migration"
    res_search = await client.get(
        f"/api/v1/organizations/{org_id}/projects?search=migration",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    assert res_search.json()["projects"][0]["name"] == "Cloud Migration"


@pytest.mark.asyncio
async def test_project_tenant_isolation(client: AsyncClient):
    """Admin from Org B cannot view or mutate Org A's projects."""
    token_a, org_a = await _create_test_org_and_admin(client, "PrjIsoCorpA", "admin.iso_a@proj.com")
    token_b, org_b = await _create_test_org_and_admin(client, "PrjIsoCorpB", "admin.iso_b@proj.com")

    proj_a_id = (await client.post(
        f"/api/v1/organizations/{org_a}/projects",
        json={"name": "Internal Project A", "project_code": "INT-A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()["id"]

    # 1. Admin B tries GET -> 403
    res_get = await client.get(
        f"/api/v1/organizations/{org_a}/projects/{proj_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_get.status_code == 403

    # 2. Admin B tries PATCH -> 403
    res_patch = await client.patch(
        f"/api/v1/organizations/{org_a}/projects/{proj_a_id}",
        json={"name": "Hijacked"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_patch.status_code == 403

    # 3. Admin B tries DELETE -> 403
    res_del = await client.delete(
        f"/api/v1/organizations/{org_a}/projects/{proj_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_del.status_code == 403


@pytest.mark.asyncio
async def test_employee_forbidden_from_project_mutations(client: AsyncClient):
    """Regular employee in same org can view projects but cannot create/patch/delete."""
    token_admin, org_id = await _create_test_org_and_admin(client, "PrjPermCorp", "admin.perm@proj.com")

    # Create project by Admin
    proj_id = (await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Public Project", "project_code": "PUB-01"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )).json()["id"]

    # Register & approve regular employee
    await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Dev Employee",
        "email": "dev.emp@permcorp.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    for m in members_res.json():
        if m["email"] == "dev.emp@permcorp.com":
            await client.post(f"/api/v1/organizations/{org_id}/members/{m['id']}/approve", headers={"Authorization": f"Bearer {token_admin}"})

    # Login employee
    emp_token = (await client.post("/api/v1/auth/login", json={
        "email": "dev.emp@permcorp.com",
        "password": "SecurePassword1",
    })).json()["access_token"]

    # Employee can GET project
    res_emp_get = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res_emp_get.status_code == 200

    # Employee cannot CREATE project -> 403
    res_emp_create = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Unauthorized Project", "project_code": "UNAUTH-01"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res_emp_create.status_code == 403

    # Employee cannot PATCH project -> 403
    res_emp_patch = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        json={"name": "Renamed by Dev"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res_emp_patch.status_code == 403

    # Employee cannot DELETE project -> 403
    res_emp_del = await client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res_emp_del.status_code == 403


@pytest.mark.asyncio
async def test_target_date_before_start_date_rejected(client: AsyncClient):
    """Target end date before start date must return 400 Bad Request."""
    token, org_id = await _create_test_org_and_admin(client, "PrjDateCorp", "admin.date@proj.com")

    # Start: 2026-10-01, Target: 2026-09-01 -> 400
    res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={
            "name": "Date Project",
            "project_code": "DATE-01",
            "start_date": "2026-10-01T00:00:00Z",
            "target_end_date": "2026-09-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
    assert "on or after start date" in msg


@pytest.mark.asyncio
async def test_project_delete_cascades_safely_without_deleting_users_or_teams(client: AsyncClient):
    """Deleting a project removes project records but leaves teams, roles, and users intact."""
    token, org_id = await _create_test_org_and_admin(client, "PrjSafeDelCorp", "admin.safedel@proj.com")

    # 1. Create a Team
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Safe Squad", "department": "Platform"},
        headers={"Authorization": f"Bearer {token}"},
    )
    team_id = team_res.json()["id"]

    # 2. Create a Project linked to the team
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Temporary Project", "project_code": "TMP-01", "team_id": team_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # 3. Delete Project
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    # 4. Project is gone
    get_proj = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_proj.status_code == 404

    # 5. Team remains intact
    get_team = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_team.status_code == 200
    assert get_team.json()["name"] == "Safe Squad"


@pytest.mark.asyncio
async def test_project_member_crud_and_project_role_independence(client: AsyncClient):
    """Test full CRUD lifecycle of project members without modifying organizational roles."""
    token, org_id = await _create_test_org_and_admin(client, "PrjMemberCorp", "admin.member@proj.com")

    # 1. Create an organizational role "Senior QA"
    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Senior QA", "department": "Quality"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_id = role_res.json()["id"]

    # 2. Register employee and assign organizational role
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Priya Sharma",
        "email": "priya.qa@proj.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    emp_id = emp_res.json()["user"]["id"]

    # Approve employee
    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    for m in members_res.json():
        if m["email"] == "priya.qa@proj.com":
            await client.post(f"/api/v1/organizations/{org_id}/members/{m['id']}/approve", headers={"Authorization": f"Bearer {token}"})

    # Assign organizational role
    assign_res = await client.put(
        f"/api/v1/organizations/{org_id}/employees/{emp_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert assign_res.status_code == 200

    # 3. Create Project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "TruDrishti", "project_code": "TRU-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # 4. Add employee to project with project_role = "Tech Lead"
    add_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp_id, "project_role": "Tech Lead"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add_res.status_code == 201
    member_data = add_res.json()
    assert member_data["project_role"] == "Tech Lead"
    assert member_data["organizational_role"] == "Senior QA"
    assert member_data["name"] == "Priya Sharma"

    # 5. List project members
    list_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["project_role"] == "Tech Lead"

    # 6. Update member project role to "Project Lead"
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members/{emp_id}",
        json={"project_role": "Project Lead"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["project_role"] == "Project Lead"

    # 7. Verify organizational role is STILL "Senior QA"
    get_role_res = await client.get(
        f"/api/v1/organizations/{org_id}/employees/{emp_id}/role",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_role_res.status_code == 200
    assert get_role_res.json()["assigned_role"]["id"] == role_id
    assert get_role_res.json()["assigned_role"]["name"] == "Senior QA"

    # 8. Remove member from project
    del_member_res = await client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members/{emp_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_member_res.status_code == 204

    # 9. Verify members list is empty
    list_after = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(list_after.json()) == 0


@pytest.mark.asyncio
async def test_project_member_duplicate_rejected(client: AsyncClient):
    """Enrolling the same employee in a project twice must return 409 Conflict."""
    token, org_id = await _create_test_org_and_admin(client, "PrjDupCorp", "admin.dup@proj.com")

    # Register employee
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Karan Verma",
        "email": "karan.dev@proj.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    emp_id = emp_res.json()["user"]["id"]

    # Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Dup Project", "project_code": "DUP-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # Add member first time -> 201
    res1 = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp_id, "project_role": "Developer"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Add member second time -> 409
    res2 = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp_id, "project_role": "Developer"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 409
    msg = res2.json().get("error", {}).get("message") or res2.json().get("detail", "")
    assert "already enrolled" in msg


@pytest.mark.asyncio
async def test_project_member_from_foreign_org_rejected(client: AsyncClient):
    """Adding an employee from a different organization must be rejected (400)."""
    token_a, org_a = await _create_test_org_and_admin(client, "PrjMemOrgA", "admin.a@memproj.com")
    token_b, org_b = await _create_test_org_and_admin(client, "PrjMemOrgB", "admin.b@memproj.com")

    # Register employee in Org B
    emp_b = (await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_b,
        "name": "Foreign Dev",
        "email": "foreign.dev@orgb.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })).json()["user"]["id"]

    # Create project in Org A
    proj_a = (await client.post(
        f"/api/v1/organizations/{org_a}/projects",
        json={"name": "Project In Org A", "project_code": "PROJ-A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()["id"]

    # Try adding Org B user to Org A project -> 400
    res = await client.post(
        f"/api/v1/organizations/{org_a}/projects/{proj_a}/members",
        json={"employee_id": emp_b, "project_role": "Contractor"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 400
    msg = res.json().get("error", {}).get("message") or res.json().get("detail", "")
    assert "not a valid member" in msg


@pytest.mark.asyncio
async def test_project_milestone_crud_and_validation(client: AsyncClient):
    """Test full CRUD lifecycle and validation of project milestones."""
    token, org_id = await _create_test_org_and_admin(client, "PrjMsCorp", "admin.ms@proj.com")

    # Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Milestone Initiative", "project_code": "MS-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # 1. Create Milestone -> 201
    ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={
            "name": "Phase 1 Architecture",
            "description": "Core architecture deliverables",
            "status": "PLANNED",
            "priority": "HIGH",
            "start_date": "2026-09-01T00:00:00Z",
            "due_date": "2026-10-01T00:00:00Z",
            "progress_percent": 0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ms_res.status_code == 201
    ms_data = ms_res.json()
    ms_id = ms_data["id"]
    assert ms_data["name"] == "Phase 1 Architecture"
    assert ms_data["status"] == "PLANNED"
    assert ms_data["priority"] == "HIGH"

    # 2. Invalid dates validation -> 400
    bad_ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={
            "name": "Invalid Date Milestone",
            "start_date": "2026-10-01T00:00:00Z",
            "due_date": "2026-09-01T00:00:00Z",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad_ms_res.status_code == 400

    # 3. List Milestones -> 200
    list_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. Update Milestone -> 200
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones/{ms_id}",
        json={"status": "IN_PROGRESS", "progress_percent": 50},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_PROGRESS"
    assert patch_res.json()["progress_percent"] == 50

    # 5. Delete Milestone -> 204
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones/{ms_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    # 6. Verify deleted
    list_after = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(list_after.json()) == 0


@pytest.mark.asyncio
async def test_project_task_crud_and_status_transitions(client: AsyncClient):
    """Test full CRUD lifecycle, member assignment, milestone linking, and status transitions of tasks."""
    token, org_id = await _create_test_org_and_admin(client, "PrjTaskCorp", "admin.task@proj.com")

    # 1. Register employee
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Dev Specialist",
        "email": "dev.spec@proj.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    emp_id = emp_res.json()["user"]["id"]

    # 2. Create project & add employee to project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Task Driven Initiative", "project_code": "TSK-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp_id, "project_role": "Backend Lead"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 3. Create milestone
    ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={"name": "Sprint 1 Checkpoint", "status": "IN_PROGRESS"},
        headers={"Authorization": f"Bearer {token}"},
    )
    ms_id = ms_res.json()["id"]

    # 4. Create Task linked to milestone and assigned to employee -> 201
    task_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Implement PostgreSQL Migrations",
            "description": "Create schema and indexes",
            "milestone_id": ms_id,
            "assignee_id": emp_id,
            "status": "TODO",
            "priority": "HIGH",
            "due_date": "2026-09-15T00:00:00Z",
            "progress_percent": 0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    task_id = task_data["id"]
    assert task_data["title"] == "Implement PostgreSQL Migrations"
    assert task_data["assignee"]["name"] == "Dev Specialist"
    assert task_data["milestone_name"] == "Sprint 1 Checkpoint"

    # 5. Transition to IN_PROGRESS -> 200
    p1 = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks/{task_id}",
        json={"status": "IN_PROGRESS", "progress_percent": 30},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert p1.status_code == 200
    assert p1.json()["status"] == "IN_PROGRESS"

    # 6. Transition to BLOCKED with blocked reason -> 200
    p2 = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks/{task_id}",
        json={"status": "BLOCKED", "blocked_reason": "Waiting for database credentials"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert p2.status_code == 200
    assert p2.json()["status"] == "BLOCKED"
    assert p2.json()["blocked_reason"] == "Waiting for database credentials"

    # 7. Transition to DONE -> 200
    p3 = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks/{task_id}",
        json={"status": "DONE", "progress_percent": 100},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert p3.status_code == 200
    assert p3.json()["status"] == "DONE"
    assert p3.json()["progress_percent"] == 100

    # 8. List tasks with status filter -> 200
    done_tasks = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks?status=DONE",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert done_tasks.status_code == 200
    assert len(done_tasks.json()) == 1

    todo_tasks = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks?status=TODO",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert todo_tasks.status_code == 200
    assert len(todo_tasks.json()) == 0

    # 9. Delete task -> 204
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_milestone_deletion_unlinks_tasks_safely(client: AsyncClient):
    """Deleting a milestone unlinks attached tasks without deleting the tasks."""
    token, org_id = await _create_test_org_and_admin(client, "PrjUnlinkCorp", "admin.unlink@proj.com")

    # Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Unlink Initiative", "project_code": "UNL-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # Create milestone
    ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={"name": "Temporary Milestone"},
        headers={"Authorization": f"Bearer {token}"},
    )
    ms_id = ms_res.json()["id"]

    # Create task linked to milestone
    task_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={"title": "Persistent Task", "milestone_id": ms_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    task_id = task_res.json()["id"]
    assert task_res.json()["milestone_id"] == ms_id

    # Delete milestone
    del_ms = await client.delete(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones/{ms_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_ms.status_code == 204

    # Task remains, but milestone_id is now None (SET NULL)
    tasks_list = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert tasks_list.status_code == 200
    assert len(tasks_list.json()) == 1
    assert tasks_list.json()[0]["id"] == task_id
    assert tasks_list.json()[0]["milestone_id"] is None


@pytest.mark.asyncio
async def test_get_project_ai_workforce_aggregates_member_groups_and_capabilities(client: AsyncClient):
    """
    Test that GET /projects/{id}/ai-workforce bridges Neon PostgreSQL roles/capabilities
    and SQLite AgentGroups without calling AgentFactory or creating new AgentGroups.
    """
    token, org_id = await _create_test_org_and_admin(client, "PrjAiCorp", "admin.ai@proj.com")

    # 1. Register capabilities in CapabilityRegistry
    for cap_name, desc in [("coding", "Code generation"), ("testing", "Test suite execution"), ("code_review", "Code Reviewer")]:
        await client.post("/api/v1/agent-capabilities", json={
            "name": cap_name,
            "description": desc,
            "supported_roles": ["Developer", "Architect Role", "Reviewer Role"],
            "required_tools": ["terminal"],
            "required_permissions": ["system:execute"],
            "input_schema": {},
            "output_schema": {},
            "system_instructions": f"Instructions for {cap_name}.",
            "risk_level": "LOW",
            "approval_required": False,
            "enabled": True,
            "version": "1.0.0",
        })

    # 2. Register two employees
    emp_a_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Alice Architect",
        "email": "alice.arch@proj.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    emp_a_id = emp_a_res.json()["user"]["id"]

    emp_b_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Bob Reviewer",
        "email": "bob.rev@proj.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    emp_b_id = emp_b_res.json()["user"]["id"]

    # 3. Create roles and assign capabilities
    # Role A: Architect (Coding, Testing)
    role_a_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Architect Role", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_a_id = role_a_res.json()["id"]

    await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_a_id}/capabilities",
        json={"capabilities": ["coding", "testing"]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Role B: Reviewer (Code Review)
    role_b_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Reviewer Role", "department": "QA"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_b_id = role_b_res.json()["id"]

    await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_b_id}/capabilities",
        json={"capabilities": ["code_review"]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 4. Assign Role A to Alice and provision her workforce
    await client.put(
        f"/api/v1/organizations/{org_id}/employees/{emp_a_id}/role",
        json={"role_id": role_a_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    prov_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{emp_a_id}/agent-workforce/provision",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 200

    # Note: Bob is not assigned a role yet or has no workforce provisioned

    # 5. Create Project and enroll both Alice and Bob
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "AI Workforce Project", "project_code": "AI-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp_a_id, "project_role": "Lead Architect"},
        headers={"Authorization": f"Bearer {token}"},
    )

    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp_b_id, "project_role": "QA Contributor"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 5. Fetch Project AI Workforce -> 200
    ai_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/ai-workforce",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ai_res.status_code == 200
    ai_data = ai_res.json()

    assert ai_data["project_id"] == proj_id
    assert ai_data["project_code"] == "AI-01"
    assert ai_data["total_members"] == 2
    assert ai_data["active_workforces"] == 1
    assert ai_data["total_agents"] >= 1

    # Check aggregated capabilities
    assert "Coding" in ai_data["aggregated_capabilities"] or "coding" in [c.lower() for c in ai_data["aggregated_capabilities"]]

    # Check Alice has an active AgentGroup
    alice_item = next((m for m in ai_data["members"] if m["user_id"] == emp_a_id), None)
    assert alice_item is not None
    assert alice_item["role_in_project"] == "Lead Architect"
    assert alice_item["agent_group"] is not None
    assert alice_item["status"] == "ACTIVE"
    assert len(alice_item["agent_group"]["agents"]) >= 1

    # Check Bob is marked as NO_WORKFORCE_PROVISIONED
    bob_item = next((m for m in ai_data["members"] if m["user_id"] == emp_b_id), None)
    assert bob_item is not None
    assert bob_item["agent_group"] is None
    assert bob_item["status"] == "NO_WORKFORCE_PROVISIONED"


@pytest.mark.asyncio
async def test_project_task_with_assigned_agent_group_id(client: AsyncClient):
    """Test creating and updating a project task with assigned_agent_group_id."""
    token, org_id = await _create_test_org_and_admin(client, "PrjTaskAiCorp", "admin.taskai@proj.com")

    # Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Task Agent Group Project", "project_code": "TAG-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    fake_agent_group_id = "grp-12345-67890"

    # Create task with assigned_agent_group_id
    create_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Autonomous Refactoring Task",
            "assigned_agent_group_id": fake_agent_group_id,
            "status": "TODO",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    task_data = create_res.json()
    assert task_data["assigned_agent_group_id"] == fake_agent_group_id

    # Update task's assigned_agent_group_id
    updated_grp_id = "grp-99999-00000"
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks/{task_data['id']}",
        json={"assigned_agent_group_id": updated_grp_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["assigned_agent_group_id"] == updated_grp_id


# ── Phase 7: GitHub & Jira Integrations Tests ──────────────────


@pytest.mark.asyncio
async def test_github_integration_connect_disconnect_and_status(client: AsyncClient):
    """Test connecting, syncing, verifying token isolation, and disconnecting GitHub repository."""
    token, org_id = await _create_test_org_and_admin(client, "GhCorp", "admin.gh@proj.com")

    # 1. Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "GitHub Integration Project", "project_code": "GH-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # 2. Connect GitHub with secret token
    secret_token = "ghp_SuperSecretOAuthToken123456789"
    connect_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/github/connect",
        json={
            "repository_url": "https://github.com/myorg/backend-service",
            "external_project_name": "myorg/backend-service",
            "default_branch": "develop",
            "access_token": secret_token,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert connect_res.status_code == 200
    gh_data = connect_res.json()
    assert gh_data["provider"] == "GITHUB"
    assert gh_data["status"] == "CONNECTED"
    assert gh_data["repository_url"] == "https://github.com/myorg/backend-service"
    assert gh_data["config"]["default_branch"] == "develop"

    # CRITICAL SECURITY CHECK: Secret token must NEVER be returned in response!
    assert "access_token" not in gh_data
    assert "auth_config" not in gh_data
    assert secret_token not in str(gh_data)

    # 3. List integrations
    list_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 1
    assert items[0]["provider"] == "GITHUB"
    assert items[0]["status"] == "CONNECTED"
    assert secret_token not in str(items)

    # 4. Sync integration
    sync_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/{gh_data['id']}/sync",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sync_res.status_code == 200
    assert sync_res.json()["last_synced_at"] is not None

    # 5. Disconnect GitHub
    disc_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/github/disconnect",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "DISCONNECTED"

    # Syncing a disconnected integration returns 400
    sync_err = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/{gh_data['id']}/sync",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sync_err.status_code == 400


@pytest.mark.asyncio
async def test_jira_integration_connect_disconnect_and_status(client: AsyncClient):
    """Test connecting, verifying token isolation, syncing, and disconnecting Jira project tracker."""
    token, org_id = await _create_test_org_and_admin(client, "JiraCorp", "admin.jira@proj.com")

    # 1. Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Jira Integration Project", "project_code": "JIRA-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # 2. Connect Jira with secret API token
    secret_api_token = "ATATT_SuperSecretJiraApiToken999"
    connect_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/jira/connect",
        json={
            "base_url": "https://mycompany.atlassian.net",
            "project_key": "core",
            "external_project_name": "Core Sprint Backlog",
            "api_token": secret_api_token,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert connect_res.status_code == 200
    jira_data = connect_res.json()
    assert jira_data["provider"] == "JIRA"
    assert jira_data["status"] == "CONNECTED"
    assert jira_data["base_url"] == "https://mycompany.atlassian.net"
    assert jira_data["external_project_id"] == "CORE"

    # CRITICAL SECURITY CHECK: Secret token must NEVER be returned in response!
    assert "api_token" not in jira_data
    assert "auth_config" not in jira_data
    assert secret_api_token not in str(jira_data)

    # 3. Disconnect Jira
    disc_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/jira/disconnect",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert disc_res.status_code == 200
    assert disc_res.json()["status"] == "DISCONNECTED"


@pytest.mark.asyncio
async def test_integration_tenant_and_project_isolation(client: AsyncClient):
    """Test that organizations and non-admin users cannot access or mutate foreign integrations."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "IntOrgA", "admin.a@int.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "IntOrgB", "admin.b@int.com")

    # Project in Org A
    proj_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/projects",
        json={"name": "Org A Project", "project_code": "OA-01"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    proj_a_id = proj_res.json()["id"]

    # Connect GitHub in Org A
    gh_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/projects/{proj_a_id}/integrations/github/connect",
        json={"repository_url": "https://github.com/org-a/repo"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert gh_res.status_code == 200
    int_id = gh_res.json()["id"]

    # Admin B tries to list Org A project integrations -> 403 Forbidden
    list_forbidden = await client.get(
        f"/api/v1/organizations/{org_a_id}/projects/{proj_a_id}/integrations",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert list_forbidden.status_code == 403

    # Admin B tries to disconnect Org A integration -> 403 Forbidden
    disc_forbidden = await client.post(
        f"/api/v1/organizations/{org_a_id}/projects/{proj_a_id}/integrations/github/disconnect",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert disc_forbidden.status_code == 403

    # Regular employee in Org A tries to connect Jira -> 403 Forbidden
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_a_id,
        "name": "Regular Employee",
        "email": "reg.emp@int.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    members_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/members/detailed",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "reg.emp@int.com")
    await client.post(
        f"/api/v1/organizations/{org_a_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token_a}"},
    )

    emp_login = await client.post("/api/v1/auth/login", json={"email": "reg.emp@int.com", "password": "SecurePassword1"})
    emp_token = emp_login.json()["access_token"]

    emp_connect = await client.post(
        f"/api/v1/organizations/{org_a_id}/projects/{proj_a_id}/integrations/jira/connect",
        json={"base_url": "https://jira.com", "project_key": "EMP"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert emp_connect.status_code == 403


# ── Phase 8: Project Health & Blocker Detection Tests ──────────


@pytest.mark.asyncio
async def test_project_health_diagnostics_healthy(client: AsyncClient):
    """Test deterministic project health calculation when project and milestones are on track."""
    token, org_id = await _create_test_org_and_admin(client, "HealthCorp", "admin.health@proj.com")

    # 1. Create project with LOW risk
    future_date = (datetime.now(timezone.utc) + timedelta(days=60)).isoformat()
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={
            "name": "Healthy Initiative",
            "project_code": "HLT-01",
            "risk_level": "LOW",
            "target_end_date": future_date,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # 2. Create milestone
    ms_due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={"name": "Alpha Release", "due_date": ms_due, "status": "IN_PROGRESS"},
        headers={"Authorization": f"Bearer {token}"},
    )
    ms_id = ms_res.json()["id"]

    # 3. Create regular in-progress task (not overdue, not blocked)
    task_due = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()
    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Develop core APIs",
            "milestone_id": ms_id,
            "status": "IN_PROGRESS",
            "due_date": task_due,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # 4. Fetch Health Diagnostics -> HEALTHY
    health_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert health_res.status_code == 200
    data = health_res.json()

    assert data["project_id"] == proj_id
    assert data["overall_health"] == "HEALTHY"
    assert data["blocked_tasks_count"] == 0
    assert data["overdue_tasks_count"] == 0
    assert len(data["blocked_tasks"]) == 0
    assert len(data["overdue_tasks"]) == 0
    assert len(data["milestones_health"]) == 1
    assert data["milestones_health"][0]["health"] == "HEALTHY"


@pytest.mark.asyncio
async def test_project_health_diagnostics_at_risk_and_critical(client: AsyncClient):
    """Test transitions to AT_RISK (1 blocker / overdue) and CRITICAL (>=2 blockers / critical risk)."""
    token, org_id = await _create_test_org_and_admin(client, "RiskCorp", "admin.risk@proj.com")

    # 1. Create project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Risk Matrix Project", "project_code": "RSK-01", "risk_level": "LOW"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # Create milestone
    ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={"name": "Beta Testing", "status": "IN_PROGRESS"},
        headers={"Authorization": f"Bearer {token}"},
    )
    ms_id = ms_res.json()["id"]

    # 2. Add 1 BLOCKED task -> Project should become AT_RISK
    blocked_task_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Third-party payment gateway integration",
            "milestone_id": ms_id,
            "status": "BLOCKED",
            "blocked_reason": "Waiting for vendor API sandbox credentials",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert blocked_task_res.status_code == 201

    health_1 = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert health_1.status_code == 200
    h1_data = health_1.json()
    assert h1_data["overall_health"] == "AT_RISK"
    assert h1_data["blocked_tasks_count"] == 1
    assert h1_data["blocked_tasks"][0]["blocked_reason"] == "Waiting for vendor API sandbox credentials"
    assert h1_data["milestones_health"][0]["health"] == "BLOCKED"  # Milestone has blocked task

    # 3. Add 2nd BLOCKED task -> Project should escalate to CRITICAL
    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Database schema migration",
            "milestone_id": ms_id,
            "status": "BLOCKED",
            "blocked_reason": "Disk I/O failure on staging cluster",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    health_2 = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert health_2.status_code == 200
    h2_data = health_2.json()
    assert h2_data["overall_health"] == "CRITICAL"
    assert h2_data["blocked_tasks_count"] == 2


@pytest.mark.asyncio
async def test_project_health_diagnostics_overdue_tasks(client: AsyncClient):
    """Test that past due incomplete tasks are correctly flagged as overdue with days calculation."""
    token, org_id = await _create_test_org_and_admin(client, "OverdueCorp", "admin.ovd@proj.com")

    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Overdue Sprint", "project_code": "OVD-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # Create task with past due date (3 days ago)
    past_due = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Legacy system export",
            "status": "IN_PROGRESS",
            "due_date": past_due,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    health_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["overdue_tasks_count"] == 1
    assert data["overall_health"] == "AT_RISK"
    assert len(data["overdue_tasks"]) == 1
    assert data["overdue_tasks"][0]["days_overdue"] >= 2


@pytest.mark.asyncio
async def test_project_health_tenant_isolation(client: AsyncClient):
    """Test that users from foreign organizations cannot access health diagnostics."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "HealthIsoA", "admin.ha@iso.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "HealthIsoB", "admin.hb@iso.com")

    # Project in Org A
    proj_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/projects",
        json={"name": "Org A Confidential Project", "project_code": "OAC-01"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    proj_id = proj_res.json()["id"]

    # Admin B tries to get Org A project health -> 403 Forbidden
    forbidden = await client.get(
        f"/api/v1/organizations/{org_a_id}/projects/{proj_id}/health",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_project_delivery_analytics_calculations(client: AsyncClient):
    """Test comprehensive delivery analytics calculation backed by real tasks and timeline."""
    token, org_id = await _create_test_org_and_admin(client, "AnalyticsCorp", "admin.analytics@proj.com")

    start_date = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    target_date = (datetime.now(timezone.utc) + timedelta(days=20)).isoformat()

    # Create project with dates
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={
            "name": "Cloud Native Overhaul",
            "project_code": "CNO-100",
            "risk_level": "HIGH",
            "start_date": start_date,
            "target_end_date": target_date,
            "progress_percent": 33,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    # Create Milestone
    ms_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={
            "name": "Sprint 1 Foundation",
            "priority": "HIGH",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    ms_id = ms_res.json()["id"]

    # Create 3 Tasks: 1 DONE, 1 IN_PROGRESS, 1 BLOCKED & OVERDUE
    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={"title": "Task 1 Done", "milestone_id": ms_id, "status": "DONE", "progress_percent": 100},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={"title": "Task 2 WIP", "milestone_id": ms_id, "status": "IN_PROGRESS", "progress_percent": 50},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Task 3 Blocked & Overdue",
            "milestone_id": ms_id,
            "status": "BLOCKED",
            "priority": "CRITICAL",
            "due_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "blocked_reason": "Waiting on infrastructure credentials",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get Delivery Analytics
    analytics_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/analytics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert analytics_res.status_code == 200
    data = analytics_res.json()

    # Verify Tasks Delivery Breakdown
    assert data["tasks"]["total"] == 3
    assert data["tasks"]["completed"] == 1
    assert data["tasks"]["in_progress"] == 1
    assert data["tasks"]["blocked"] == 1
    assert data["tasks"]["overdue"] == 1
    assert data["tasks"]["completion_rate"] == 33.3

    # Verify Milestones Breakdown
    assert data["milestones"]["total"] == 1
    assert data["milestones"]["blocked"] == 1

    # Verify Timeline
    assert data["timeline"]["days_total"] >= 29
    assert data["timeline"]["days_elapsed"] >= 9
    assert data["timeline"]["days_remaining"] >= 18
    assert data["timeline"]["time_elapsed_percent"] is not None
    assert not data["timeline"]["is_overdue"]

    # Verify Risk & Dynamic Factors
    assert data["risk"]["current_risk"] == "HIGH"
    assert len(data["risk"]["risk_factors"]) >= 2
    assert any("overdue" in f.lower() for f in data["risk"]["risk_factors"])
    assert any("blocked" in f.lower() for f in data["risk"]["risk_factors"])


@pytest.mark.asyncio
async def test_project_delivery_analytics_empty_project_no_fake_data(client: AsyncClient):
    """Test that empty projects return valid 0/None values without fabricating fake data."""
    token, org_id = await _create_test_org_and_admin(client, "EmptyAnalyticsCorp", "admin.empty@proj.com")

    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={"name": "Blank Initiative", "project_code": "BLK-01"},
        headers={"Authorization": f"Bearer {token}"},
    )
    proj_id = proj_res.json()["id"]

    analytics_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/analytics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert analytics_res.status_code == 200
    data = analytics_res.json()

    assert data["tasks"]["total"] == 0
    assert data["tasks"]["completed"] == 0
    assert data["tasks"]["completion_rate"] == 0.0
    assert data["milestones"]["total"] == 0
    assert data["timeline"]["days_total"] is None
    assert data["timeline"]["days_elapsed"] is None
    assert data["timeline"]["time_elapsed_percent"] is None
    assert data["risk"]["risk_factors"] == []
    assert data["health_status"] == "HEALTHY"


@pytest.mark.asyncio
async def test_project_delivery_analytics_tenant_isolation(client: AsyncClient):
    """Test that users from other organizations cannot read project delivery analytics."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "AnaIsoA", "admin.anaA@iso.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "AnaIsoB", "admin.anaB@iso.com")

    # Create project in Org A
    proj_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/projects",
        json={"name": "Secret Project Org A", "project_code": "SEC-A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    proj_id = proj_res.json()["id"]

    # Admin B attempts to access Org A analytics -> 403 Forbidden
    forbidden = await client.get(
        f"/api/v1/organizations/{org_a_id}/projects/{proj_id}/analytics",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_complete_project_lifecycle_and_integrations_e2e(client: AsyncClient):
    """
    Complete Phase 10 End-to-End Integration QA:
    1. Create Team
    2. Create Project
    3. Assign Team
    4. Add Project Members
    5. Verify employee Roles
    6. Verify existing AgentGroups / Workforce binding
    7. Create Milestones
    8. Create Tasks
    9. Assign Tasks
    10. Block a Task
    11. Verify Project Health changes
    12. Configure GitHub & Jira integrations
    13. Verify integration status
    14. Verify Project Overview & Delivery Analytics
    15. Verify AI Workforce visibility
    """
    token, org_id = await _create_test_org_and_admin(client, "NexusCorp", "admin.nexus@proj.com")

    # 1. Create Team
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={
            "name": "Core Platform Squad",
            "department": "Engineering",
            "description": "Core platform engineering squad",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    # 2. Create Project
    proj_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects",
        json={
            "name": "Autonomous Delivery Mesh",
            "project_code": "ADM-99",
            "description": "Enterprise autonomous delivery orchestration",
            "priority": "HIGH",
            "risk_level": "LOW",
            "start_date": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "target_end_date": (datetime.now(timezone.utc) + timedelta(days=25)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 3. Assign Team to Project
    update_team_res = await client.patch(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}",
        json={"team_id": team_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_team_res.status_code == 200
    assert update_team_res.json()["team_id"] == team_id

    # 4. Register Employees & Add Project Members
    emp1_res = await client.post(
        "/api/v1/onboarding/employee/register",
        json={
            "organization_id": org_id,
            "name": "Lead Architect",
            "email": "lead.arch@nexus.com",
            "password": "SecurePassword1",
            "confirm_password": "SecurePassword1",
        },
    )
    assert emp1_res.status_code == 201
    emp1_id = emp1_res.json()["user"]["id"]

    emp2_res = await client.post(
        "/api/v1/onboarding/employee/register",
        json={
            "organization_id": org_id,
            "name": "Senior Dev",
            "email": "senior.dev@nexus.com",
            "password": "SecurePassword1",
            "confirm_password": "SecurePassword1",
        },
    )
    assert emp2_res.status_code == 201
    emp2_id = emp2_res.json()["user"]["id"]

    mem1_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp1_id, "project_role": "Tech Lead"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mem1_res.status_code == 201

    mem2_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/members",
        json={"employee_id": emp2_id, "project_role": "Developer"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mem2_res.status_code == 201

    # 5. Create Role & Assign to Employee
    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={
            "name": "Platform Engineer",
            "department": "Engineering",
            "description": "Infrastructure & platform engineering",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert role_res.status_code == 201
    role_id = role_res.json()["id"]

    assign_role_res = await client.put(
        f"/api/v1/organizations/{org_id}/employees/{emp2_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert assign_role_res.status_code == 200

    # 6. Verify AI Workforce endpoint
    wf_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/ai-workforce",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wf_res.status_code == 200
    wf_data = wf_res.json()
    assert wf_data["project_id"] == proj_id
    assert len(wf_data["members"]) == 2

    # 7. Create Milestones
    ms1_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/milestones",
        json={
            "name": "M1: Architecture Blueprint",
            "priority": "HIGH",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ms1_res.status_code == 201
    ms1_id = ms1_res.json()["id"]

    # 8. Create Tasks
    task1_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Design Agent Routing Schema",
            "milestone_id": ms1_id,
            "assignee_id": emp1_id,
            "status": "DONE",
            "progress_percent": 100,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert task1_res.status_code == 201

    # 9. Assign Tasks & 10. Block a Task
    task2_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/tasks",
        json={
            "title": "Implement Cloud Telemetry Adapter",
            "milestone_id": ms1_id,
            "assignee_id": emp2_id,
            "status": "BLOCKED",
            "priority": "CRITICAL",
            "blocked_reason": "Waiting on infrastructure credentials",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert task2_res.status_code == 201
    assert task2_res.json()["status"] == "BLOCKED"

    # 11. Verify Project Health changes
    health_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/health",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert health_res.status_code == 200
    h_data = health_res.json()
    assert h_data["blocked_tasks_count"] == 1
    assert h_data["overall_health"] in ("AT_RISK", "CRITICAL")
    assert len(h_data["blocked_tasks"]) == 1
    assert h_data["blocked_tasks"][0]["blocked_reason"] == "Waiting on infrastructure credentials"

    # 12. Configure GitHub & Jira Integrations
    gh_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/github/connect",
        json={
            "repository_url": "https://github.com/nexus-org/delivery-mesh",
            "default_branch": "main",
            "access_token": "ghp_mockSecretTokenForQA123456789",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert gh_res.status_code == 200
    assert gh_res.json()["provider"] == "GITHUB"
    assert gh_res.json()["status"] == "CONNECTED"

    jira_res = await client.post(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations/jira/connect",
        json={
            "base_url": "https://nexus-org.atlassian.net",
            "project_key": "ADM",
            "user_email": "admin.nexus@proj.com",
            "api_token": "jira_mockSecretApiToken123456789",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert jira_res.status_code == 200
    assert jira_res.json()["provider"] == "JIRA"
    assert jira_res.json()["status"] == "CONNECTED"

    # 13. Verify Integrations list
    integrations_list = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/integrations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert integrations_list.status_code == 200
    assert len(integrations_list.json()) == 2

    # 14. Verify Project Overview & Delivery Analytics
    analytics_res = await client.get(
        f"/api/v1/organizations/{org_id}/projects/{proj_id}/analytics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert analytics_res.status_code == 200
    a_data = analytics_res.json()
    assert a_data["tasks"]["total"] == 2
    assert a_data["tasks"]["completed"] == 1
    assert a_data["tasks"]["blocked"] == 1
    assert a_data["milestones"]["total"] == 1
    assert a_data["milestones"]["blocked"] == 1
    assert a_data["team"]["members_count"] == 2
    assert a_data["team"]["team_name"] == "Core Platform Squad"
    assert a_data["timeline"]["days_remaining"] is not None

    # 15. Verify AI Delivery Tracks & Visibility
    assert len(a_data["ai_tracks"]) >= 1
    track = a_data["ai_tracks"][0]
    assert track["employee_count"] >= 1








