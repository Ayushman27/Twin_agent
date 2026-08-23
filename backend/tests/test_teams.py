"""
Test suite for Teams Module — Neon PostgreSQL Persistence & Multi-tenant Authorization.
"""
import pytest
from httpx import AsyncClient


async def _create_test_org_and_admin(client: AsyncClient, org_name: str, admin_email: str) -> tuple[str, str]:
    """Helper to register a fresh company and return auth token and organization_id."""
    domain = org_name.lower().replace(" ", "") + ".com"
    payload = {
        "company_name": org_name,
        "company_email": f"contact@{domain}",
        "industry": "Technology",
        "company_size": "11-50",
        "employee_count": 25,
        "admin_name": f"Admin {org_name}",
        "admin_email": admin_email,
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    res = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    return data["access_token"], data["organization"]["id"]


@pytest.mark.asyncio
async def test_create_team_success(client: AsyncClient):
    token, org_id = await _create_test_org_and_admin(client, "TeamCorpAlpha", "admin.teamalpha@test.com")

    payload = {
        "name": "Core Platform Squad",
        "description": "Engineers building core microservices and infrastructure.",
        "department": "Engineering",
        "status": "ACTIVE",
        "ai_routing_policy": {"routing_mode": "lead_directed", "fallback_to_all": True},
        "knowledge_access_config": {"accessible_categories": ["TECHNICAL_DOCUMENT"]},
        "memory_isolation_level": "TEAM_ISOLATED",
    }
    res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Core Platform Squad"
    assert data["department"] == "Engineering"
    assert data["organization_id"] == org_id
    assert data["status"] == "ACTIVE"
    assert data["member_count"] == 0
    assert data["ai_routing_policy"]["routing_mode"] == "lead_directed"


@pytest.mark.asyncio
async def test_duplicate_team_name_in_same_org_rejected(client: AsyncClient):
    token, org_id = await _create_test_org_and_admin(client, "TeamDupOrg", "admin.dup@test.com")

    payload = {"name": "Alpha Team", "department": "Engineering"}
    res1 = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    res2 = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 400
    assert "already exists in this organization" in res2.json()["error"]["message"]


@pytest.mark.asyncio
async def test_same_team_name_in_different_orgs_allowed(client: AsyncClient):
    token_a, org_a_id = await _create_test_org_and_admin(client, "TeamOrgA", "admin.a@team.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "TeamOrgB", "admin.b@team.com")

    payload = {"name": "Security Squad", "department": "Security"}

    res_a = await client.post(
        f"/api/v1/organizations/{org_a_id}/teams",
        json=payload,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_a.status_code == 201

    res_b = await client.post(
        f"/api/v1/organizations/{org_b_id}/teams",
        json=payload,
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b.status_code == 201
    assert res_a.json()["id"] != res_b.json()["id"]


@pytest.mark.asyncio
async def test_team_lead_assignment_and_auto_enrollment(client: AsyncClient):
    token, org_id = await _create_test_org_and_admin(client, "LeadTestCorp", "admin.lead@test.com")

    # Register & approve an employee
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Sarah Connor",
        "email": "sarah.lead@test.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    assert emp_reg.status_code == 201
    lead_user_id = emp_reg.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "sarah.lead@test.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Create team with Sarah as team lead
    team_payload = {
        "name": "Operations Squad",
        "department": "Operations",
        "team_lead_id": lead_user_id,
    }
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json=team_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_data = team_res.json()
    assert team_data["team_lead_id"] == lead_user_id
    assert team_data["team_lead"]["name"] == "Sarah Connor"
    assert team_data["member_count"] == 1

    # Verify Sarah is automatically in team members as Lead
    team_id = team_data["id"]
    detail_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    members = detail_res.json()["members"]
    assert len(members) == 1
    assert members[0]["user_id"] == lead_user_id
    assert members[0]["role_in_team"] == "Lead"


@pytest.mark.asyncio
async def test_team_lead_from_different_org_rejected(client: AsyncClient):
    token_a, org_a_id = await _create_test_org_and_admin(client, "OrgAlphaLead", "admin.alphalead@test.com")
    _, org_b_id = await _create_test_org_and_admin(client, "OrgBetaLead", "admin.betalead@test.com")

    # Employee in Org B
    emp_b = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_b_id,
        "name": "Bob Foreign",
        "email": "bob.foreign@beta.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    foreign_user_id = emp_b.json()["user"]["id"]

    # Org A tries to create team with Org B employee as lead -> 400 Bad Request
    res = await client.post(
        f"/api/v1/organizations/{org_a_id}/teams",
        json={"name": "Cross Org Team", "team_lead_id": foreign_user_id},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res.status_code == 400
    assert "not an approved member of this organization" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_team_member_management(client: AsyncClient):
    token, org_id = await _create_test_org_and_admin(client, "MemberMgmtCorp", "admin.mgmt@test.com")

    # 1. Create team
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Dev Squad", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    team_id = team_res.json()["id"]

    # 2. Register and approve 2 employees
    emp_ids = []
    for name, email in [("Alice Eng", "alice.eng@mgmt.com"), ("Charlie Eng", "charlie.eng@mgmt.com")]:
        reg = await client.post("/api/v1/onboarding/employee/register", json={
            "organization_id": org_id,
            "name": name,
            "email": email,
            "password": "SecurePassword1",
            "confirm_password": "SecurePassword1",
        })
        user_id = reg.json()["user"]["id"]
        emp_ids.append(user_id)

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    for m in members_res.json():
        if m["email"] in ("alice.eng@mgmt.com", "charlie.eng@mgmt.com"):
            await client.post(
                f"/api/v1/organizations/{org_id}/members/{m['id']}/approve",
                headers={"Authorization": f"Bearer {token}"},
            )

    # 3. Add Alice to team
    add_alice_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        json={"user_id": emp_ids[0], "role_in_team": "Senior Contributor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add_alice_res.status_code == 201
    assert add_alice_res.json()["name"] == "Alice Eng"
    assert add_alice_res.json()["role_in_team"] == "Senior Contributor"

    # 4. Duplicate member add rejected
    dup_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        json={"user_id": emp_ids[0], "role_in_team": "Senior Contributor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dup_res.status_code == 400
    assert "already a member" in dup_res.json()["error"]["message"]

    # 5. Add Charlie to team
    await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        json={"user_id": emp_ids[1], "role_in_team": "Reviewer"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 6. List team members
    list_mem_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_mem_res.status_code == 200
    members_data = list_mem_res.json()
    assert len(members_data) == 2

    # 7. Remove Alice from team
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members/{emp_ids[0]}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    # 8. Verify remaining member is Charlie
    list_after_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert len(list_after_res.json()) == 1
    assert list_after_res.json()[0]["user_id"] == emp_ids[1]


@pytest.mark.asyncio
async def test_team_tenant_isolation(client: AsyncClient):
    token_a, org_a_id = await _create_test_org_and_admin(client, "TenantA", "admin.ta@test.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "TenantB", "admin.tb@test.com")

    # Create team in Org A
    team_a_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/teams",
        json={"name": "Org A Team", "department": "IT"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    team_a_id = team_a_res.json()["id"]

    # Admin B tries to get Org A's team -> 403 or 404
    get_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res.status_code == 403

    # Admin B tries to update Org A's team -> 403
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}",
        json={"name": "Hacked Name"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_res.status_code == 403


@pytest.mark.asyncio
async def test_employee_forbidden_from_team_mutations(client: AsyncClient):
    token_admin, org_id = await _create_test_org_and_admin(client, "SecTeamCorp", "admin.secteam@test.com")

    # Register and approve employee
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Standard Emp",
        "email": "standard.emp@secteam.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    user_id = emp_reg.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "standard.emp@secteam.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token_admin}"},
    )

    # Login as employee
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "standard.emp@secteam.com", "password": "SecurePassword1"},
    )
    emp_token = login_res.json()["access_token"]

    # Employee attempts to create team -> 403 Forbidden
    create_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Rogue Team"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert create_res.status_code == 403

    # But employee CAN list teams in their org -> 200 OK
    list_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert list_res.status_code == 200


@pytest.mark.asyncio
async def test_organization_stats_exposes_live_counts(client: AsyncClient):
    token, org_id = await _create_test_org_and_admin(client, "LiveStatsCorp", "admin.livestats@test.com")

    # Create 2 teams
    await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Team 1", "department": "Eng"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Team 2", "department": "Prod"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Create 1 role
    await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Stats Dev Role", "department": "Eng"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # Get stats
    stats_res = await client.get(
        f"/api/v1/organizations/{org_id}/stats",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["teams_count"] == 2
    assert stats["roles_count"] == 1


@pytest.mark.asyncio
async def test_team_ai_workforce_aggregation_endpoint(client: AsyncClient):
    """
    Verify GET /organizations/{org_id}/teams/{team_id}/ai-workforce:
    1. Team members without AgentGroups return agent_group=None honestly.
    2. After workforce provisioning, endpoint aggregates active AgentGroups and total agents.
    3. No new AgentGroups or agents are created during this query.
    """
    token, org_id = await _create_test_org_and_admin(client, "WorkforceTeamCorp", "admin.wfteam@test.com")

    # 1. Register and approve employee
    emp_payload = {
        "organization_id": org_id,
        "name": "Priya Sharma",
        "email": "priya.sharma@wfteam.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "department": "Engineering",
        "job_title": "Senior Engineer",
    }
    emp_res = await client.post("/api/v1/onboarding/employee/register", json=emp_payload)
    assert emp_res.status_code == 201
    emp_user_id = emp_res.json()["user"]["id"]

    # Approve employee via detailed members list
    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    for m in members_res.json():
        if m["email"] == "priya.sharma@wfteam.com":
            await client.post(
                f"/api/v1/organizations/{org_id}/members/{m['id']}/approve",
                headers={"Authorization": f"Bearer {token}"},
            )

    # 2. Create Team and add employee as member
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Software Engineering Team", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    add_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        json={"user_id": emp_user_id, "role_in_team": "Contributor"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add_res.status_code == 201

    # 3. Query AI Workforce before provisioning -> honest unprovisioned state
    wf_res_1 = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/ai-workforce",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wf_res_1.status_code == 200
    wf_data_1 = wf_res_1.json()
    assert wf_data_1["team_id"] == team_id
    assert wf_data_1["total_members"] == 1
    assert wf_data_1["active_workforces"] == 0
    assert wf_data_1["total_agents"] == 0
    assert len(wf_data_1["members"]) == 1
    assert wf_data_1["members"][0]["user_id"] == emp_user_id
    assert wf_data_1["members"][0]["agent_group"] is None

    # 4. Register capabilities in CapabilityRegistry and create Role
    for cap_name, desc in [("coding", "Code generator"), ("debugging", "Diagnostics"), ("testing", "Tests")]:
        await client.post("/api/v1/agent-capabilities", json={
            "name": cap_name,
            "description": desc,
            "supported_roles": ["Developer"],
            "required_tools": ["terminal", "github"],
            "required_permissions": ["system:execute", "github:write"],
            "input_schema": {},
            "output_schema": {},
            "system_instructions": f"Instructions for {cap_name}.",
            "risk_level": "LOW",
            "approval_required": False,
            "enabled": True,
            "version": "1.0.0",
        })

    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={
            "name": "Backend Engineer",
            "department": "Engineering",
            "required_skills": ["Python", "FastAPI"],
            "responsibilities": ["Build backend services"],
            "tools": ["terminal", "github"],
            "permissions": ["system:execute", "github:write"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert role_res.status_code == 201
    role_id = role_res.json()["id"]

    # Assign capabilities to role
    caps_res = await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["coding", "debugging", "testing"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert caps_res.status_code == 200

    # Assign role
    assign_res = await client.put(
        f"/api/v1/organizations/{org_id}/employees/{emp_user_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert assign_res.status_code == 200

    # Provision workforce
    prov_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{emp_user_id}/agent-workforce/provision",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 200
    prov_group = prov_res.json()
    assert prov_group["status"] == "ACTIVE"
    agent_count = len(prov_group["agents"])
    assert agent_count > 0

    # 5. Query AI Workforce again -> aggregates real provisioned AgentGroup
    wf_res_2 = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/ai-workforce",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert wf_res_2.status_code == 200
    wf_data_2 = wf_res_2.json()
    assert wf_data_2["total_members"] == 1
    assert wf_data_2["active_workforces"] == 1
    assert wf_data_2["total_agents"] == agent_count
    assert len(wf_data_2["members"]) == 1
    member_item = wf_data_2["members"][0]
    assert member_item["user_id"] == emp_user_id
    assert member_item["job_role_name"] == "Backend Engineer"
    assert member_item["agent_group"] is not None
    assert member_item["agent_group"]["id"] == prov_group["id"]
    assert member_item["agent_group"]["status"] == "ACTIVE"
    assert len(member_item["agent_group"]["agents"]) == agent_count


# ── Phase 6: Team AI Mesh Routing Configuration Tests ───────────────────────

@pytest.mark.asyncio
async def test_team_ai_mesh_routing_lifecycle(client: AsyncClient):
    """
    Test complete lifecycle of Team AI Mesh Routing Configuration:
    1. Create 3 roles: Developer, QA, DevOps
    2. Add routes: Developer -> QA (priority 1), QA -> DevOps (priority 2)
    3. List routes and verify ordering & populated role names
    4. Update route (enable/disable, condition, priority)
    5. Delete route
    """
    token, org_id = await _create_test_org_and_admin(client, "MeshLifecycleCorp", "admin.mesh@test.com")

    # Create Team
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Engineering Squad", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    # Create 3 Roles
    role_dev = (await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Developer", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )).json()["id"]

    role_qa = (await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "QA Engineer", "department": "Quality Assurance"},
        headers={"Authorization": f"Bearer {token}"},
    )).json()["id"]

    role_devops = (await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "DevOps Specialist", "department": "Infrastructure"},
        headers={"Authorization": f"Bearer {token}"},
    )).json()["id"]

    # 1. Add Route 1: Developer -> QA
    route1_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes",
        json={
            "source_role_id": role_dev,
            "target_role_id": role_qa,
            "priority": 1,
            "condition": "on_success",
            "description": "Send code to QA on commit completion",
            "enabled": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert route1_res.status_code == 201
    r1 = route1_res.json()
    assert r1["source_role_id"] == role_dev
    assert r1["target_role_id"] == role_qa
    assert r1["source_role_name"] == "Developer"
    assert r1["target_role_name"] == "QA Engineer"
    assert r1["priority"] == 1
    assert r1["condition"] == "on_success"
    assert r1["enabled"] is True

    # 2. Add Route 2: QA -> DevOps
    route2_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes",
        json={
            "source_role_id": role_qa,
            "target_role_id": role_devops,
            "priority": 2,
            "condition": "qa_verified",
            "description": "Trigger deployment when QA verifies test build",
            "enabled": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert route2_res.status_code == 201
    r2 = route2_res.json()
    assert r2["source_role_name"] == "QA Engineer"
    assert r2["target_role_name"] == "DevOps Specialist"

    # 3. List Routes -> Ordered by priority
    list_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] == 2
    assert list_data["routes"][0]["id"] == r1["id"]
    assert list_data["routes"][1]["id"] == r2["id"]

    # 4. Update Route 1: Toggle enabled to False & change priority
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes/{r1['id']}",
        json={"enabled": False, "priority": 5, "condition": "code_review_passed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    updated_r1 = patch_res.json()
    assert updated_r1["enabled"] is False
    assert updated_r1["priority"] == 5
    assert updated_r1["condition"] == "code_review_passed"

    # 5. Delete Route 2
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes/{r2['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    # 6. Verify single remaining route in list
    list_after_del = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_after_del.status_code == 200
    assert list_after_del.json()["total"] == 1
    assert list_after_del.json()["routes"][0]["id"] == r1["id"]


@pytest.mark.asyncio
async def test_prevent_identical_source_and_target_route(client: AsyncClient):
    """Attempting to create a routing rule where source == target must return 400 Bad Request."""
    token, org_id = await _create_test_org_and_admin(client, "SameRoleCorp", "admin.samerole@test.com")

    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Dev Squad", "department": "Eng"},
        headers={"Authorization": f"Bearer {token}"},
    )
    team_id = team_res.json()["id"]

    role_id = (await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Developer", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )).json()["id"]

    # Source == Target role
    dup_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/routes",
        json={
            "source_role_id": role_id,
            "target_role_id": role_id,
            "priority": 1,
            "condition": "on_success",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert dup_res.status_code == 400
    assert "cannot be identical" in dup_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_team_route_tenant_isolation_and_employee_forbidden(client: AsyncClient):
    """
    1. Cross-tenant route creation / query is blocked.
    2. Roles from Org B cannot be used in routes for Org A.
    3. Regular employees cannot create or delete routes (403 Forbidden).
    """
    token_a, org_a_id = await _create_test_org_and_admin(client, "RouteOrgA", "admin.a@route.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "RouteOrgB", "admin.b@route.com")

    # Team in Org A
    team_a_id = (await client.post(
        f"/api/v1/organizations/{org_a_id}/teams",
        json={"name": "Squad A", "department": "Eng"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()["id"]

    # Role in Org A and Role in Org B
    role_a = (await client.post(
        f"/api/v1/organizations/{org_a_id}/roles",
        json={"name": "Role A", "department": "Eng"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()["id"]

    role_b = (await client.post(
        f"/api/v1/organizations/{org_b_id}/roles",
        json={"name": "Role B", "department": "Eng"},
        headers={"Authorization": f"Bearer {token_b}"},
    )).json()["id"]

    # 1. Admin A tries to use Org B's role -> 400 Bad Request
    cross_role_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/routes",
        json={"source_role_id": role_a, "target_role_id": role_b},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert cross_role_res.status_code == 400
    assert "does not exist in this organization" in cross_role_res.json()["error"]["message"]

    # 2. Admin B tries to list Org A's team routes -> 403 Forbidden
    cross_list_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/routes",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert cross_list_res.status_code == 403

    # 3. Employee in Org A tries to create route -> 403 Forbidden
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_a_id,
        "name": "Dev User",
        "email": "dev.user@routea.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    emp_user_id = emp_reg.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/members/detailed",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    for m in members_res.json():
        if m["email"] == "dev.user@routea.com":
            await client.post(f"/api/v1/organizations/{org_a_id}/members/{m['id']}/approve", headers={"Authorization": f"Bearer {token_a}"})

    emp_login = await client.post("/api/v1/auth/login", json={"email": "dev.user@routea.com", "password": "Password123!"})
    emp_token = emp_login.json()["access_token"]

    emp_create_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/routes",
        json={"source_role_id": role_a, "target_role_id": role_a},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert emp_create_res.status_code == 403


# ── Phase 7: Team Knowledge & Memory Boundaries Tests ────────────────────────

@pytest.mark.asyncio
async def test_team_knowledge_policy_and_memory_isolation_lifecycle(client: AsyncClient):
    """
    Test team knowledge policy configuration and memory isolation level:
    1. Query initial knowledge settings (defaults: TEAM_ISOLATED, TEAM scope)
    2. Update knowledge policy (memory_isolation_level, allowed categories, cross-team query)
    3. Verify persisted changes and isolation semantics.
    """
    token, org_id = await _create_test_org_and_admin(client, "KnowledgePolicyCorp", "admin.kpolicy@test.com")

    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Core Backend Squad", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    # 1. Get initial knowledge overview
    init_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert init_res.status_code == 200
    init_data = init_res.json()
    assert init_data["team_id"] == team_id
    assert init_data["shared_knowledge_enabled"] is True
    assert init_data["knowledge_scope"] == "TEAM"
    assert init_data["memory_isolation_level"] == "TEAM_ISOLATED"
    assert init_data["total_sources"] == 0
    assert init_data["sources"] == []

    # 2. Update knowledge policy
    put_res = await client.put(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge/policy",
        json={
            "shared_knowledge_enabled": True,
            "knowledge_scope": "DEPARTMENT",
            "memory_isolation_level": "STRICT_PRIVATE",
            "access_rule": "ROLE_RESTRICTED",
            "accessible_categories": ["TECHNICAL_DOCUMENT", "ARCHITECTURE_SPEC", "POLICY"],
            "allow_cross_team_query": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["knowledge_scope"] == "DEPARTMENT"
    assert updated_data["memory_isolation_level"] == "STRICT_PRIVATE"
    assert updated_data["access_rule"] == "ROLE_RESTRICTED"
    assert "ARCHITECTURE_SPEC" in updated_data["accessible_categories"]
    assert updated_data["allow_cross_team_query"] is True

    # 3. Verify get_team detail also reflects updated memory_isolation_level
    detail_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["memory_isolation_level"] == "STRICT_PRIVATE"


@pytest.mark.asyncio
async def test_team_knowledge_sources_crud(client: AsyncClient):
    """
    Test CRUD for explicit Team Knowledge Sources:
    1. Create 2 sources: Architecture Specs (repo) and API Documentation (wiki)
    2. Retrieve knowledge overview with populated sources
    3. Update source active status and description
    4. Delete a source
    """
    token, org_id = await _create_test_org_and_admin(client, "SourcesCrudCorp", "admin.sources@test.com")

    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "Frontend Platform", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    team_id = team_res.json()["id"]

    # 1. Add Source 1: Architecture Specs
    s1_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge/sources",
        json={
            "name": "Frontend Architecture Specs",
            "source_type": "DOCUMENT_REPOSITORY",
            "source_identifier": "doc-repo-fe-arch",
            "description": "Component design system and state architecture guidelines",
            "is_active": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert s1_res.status_code == 201
    s1 = s1_res.json()
    assert s1["name"] == "Frontend Architecture Specs"
    assert s1["source_type"] == "DOCUMENT_REPOSITORY"
    assert s1["source_identifier"] == "doc-repo-fe-arch"
    assert s1["is_active"] is True

    # 2. Add Source 2: API Documentation
    s2_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge/sources",
        json={
            "name": "Public API Schemas",
            "source_type": "API_DOCUMENTATION",
            "source_identifier": "api-schema-v1",
            "is_active": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert s2_res.status_code == 201
    s2 = s2_res.json()

    # 3. Retrieve overview
    overview_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert overview_res.status_code == 200
    ov = overview_res.json()
    assert ov["total_sources"] == 2
    source_ids = [s["id"] for s in ov["sources"]]
    assert s1["id"] in source_ids
    assert s2["id"] in source_ids

    # 4. Update Source 1
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge/sources/{s1['id']}",
        json={"is_active": False, "description": "Updated deprecated specs"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False
    assert patch_res.json()["description"] == "Updated deprecated specs"

    # 5. Delete Source 2
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge/sources/{s2['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    # 6. Verify single remaining source
    after_del_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/knowledge",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert after_del_res.status_code == 200
    assert after_del_res.json()["total_sources"] == 1
    assert after_del_res.json()["sources"][0]["id"] == s1["id"]


@pytest.mark.asyncio
async def test_team_knowledge_tenant_isolation_and_employee_forbidden(client: AsyncClient):
    """
    1. Admin B cannot view or update Org A's team knowledge policy.
    2. Admin B cannot add knowledge sources to Org A's team.
    3. Regular employee in Org A cannot update policy or add sources (403 Forbidden).
    """
    token_a, org_a_id = await _create_test_org_and_admin(client, "KnowOrgA", "admin.a@know.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "KnowOrgB", "admin.b@know.com")

    # Team in Org A
    team_a_id = (await client.post(
        f"/api/v1/organizations/{org_a_id}/teams",
        json={"name": "Alpha Team", "department": "Eng"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()["id"]

    # 1. Admin B tries to get Org A's team knowledge -> 403 Forbidden
    cross_get_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/knowledge",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert cross_get_res.status_code == 403

    # 2. Admin B tries to add knowledge source to Org A's team -> 403 Forbidden
    cross_post_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/knowledge/sources",
        json={"name": "Hacked Source", "source_identifier": "hacked"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert cross_post_res.status_code == 403

    # 3. Regular employee in Org A tries to mutate policy -> 403 Forbidden
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_a_id,
        "name": "Knowledge Emp",
        "email": "emp.know@knowa.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    members_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/members/detailed",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    for m in members_res.json():
        if m["email"] == "emp.know@knowa.com":
            await client.post(f"/api/v1/organizations/{org_a_id}/members/{m['id']}/approve", headers={"Authorization": f"Bearer {token_a}"})

    emp_login = await client.post("/api/v1/auth/login", json={"email": "emp.know@knowa.com", "password": "Password123!"})
    emp_token = emp_login.json()["access_token"]

    emp_put_res = await client.put(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/knowledge/policy",
        json={"knowledge_scope": "ORGANIZATION"},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert emp_put_res.status_code == 403


# ── Phase 8: Team Workload & Performance Metrics Tests ───────────────────────

@pytest.mark.asyncio
async def test_team_metrics_workload_and_ai_runtime_endpoint(client: AsyncClient):
    """
    Test Phase 8 Workload & Performance Metrics:
    1. Enroll employee, assign role, provision real AI workforce
    2. Query metrics endpoint
    3. Verify real AI runtime metrics aggregation from SQLite (total_executions, completed, failed)
    4. Verify honest unintegrated state for Task Workload and Project Velocity
    """
    token, org_id = await _create_test_org_and_admin(client, "MetricsCorp", "admin.metrics@test.com")

    # 1. Create Team
    team_res = await client.post(
        f"/api/v1/organizations/{org_id}/teams",
        json={"name": "DevOps SRE Squad", "department": "Infrastructure"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert team_res.status_code == 201
    team_id = team_res.json()["id"]

    # 2. Register & approve employee
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "DevOps Specialist",
        "email": "devops.lead@metricscorp.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    })
    assert emp_reg.status_code == 201
    emp_user_id = emp_reg.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    for m in members_res.json():
        if m["email"] == "devops.lead@metricscorp.com":
            await client.post(f"/api/v1/organizations/{org_id}/members/{m['id']}/approve", headers={"Authorization": f"Bearer {token}"})

    # Add member to team
    add_mem = await client.post(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/members",
        json={"user_id": emp_user_id, "role_in_team": "Lead"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add_mem.status_code == 201

    # 3. Create Role, assign capabilities, assign to employee, provision workforce
    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "SRE Engineer", "department": "Infrastructure"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_id = role_res.json()["id"]

    await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["debugging", "testing"]},
        headers={"Authorization": f"Bearer {token}"},
    )

    await client.put(
        f"/api/v1/organizations/{org_id}/employees/{emp_user_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    prov_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{emp_user_id}/agent-workforce/provision",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 200

    # 4. Query Team Metrics
    metrics_res = await client.get(
        f"/api/v1/organizations/{org_id}/teams/{team_id}/metrics",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()

    # Verify AI Runtime Metrics
    assert metrics_data["team_id"] == team_id
    assert "ai_runtime_metrics" in metrics_data
    assert metrics_data["ai_runtime_metrics"]["total_executions"] >= 0
    assert metrics_data["ai_runtime_metrics"]["completed_executions"] >= 0
    assert metrics_data["ai_runtime_metrics"]["failed_executions"] >= 0

    # Verify Member Runtime Breakdown
    assert len(metrics_data["member_runtime_breakdown"]) == 1
    m_stat = metrics_data["member_runtime_breakdown"][0]
    assert m_stat["user_id"] == emp_user_id
    assert m_stat["name"] == "DevOps Specialist"
    assert m_stat["role_in_team"] == "Lead"
    assert m_stat["job_role_name"] == "SRE Engineer"
    assert m_stat["total_agents"] > 0

    # Verify Honest Workload & Velocity Status
    assert metrics_data["workload_metrics_integrated"] is False
    assert "Workload data unavailable" in metrics_data["workload_status_message"]
    assert len(metrics_data["member_workloads"]) == 1
    w_stat = metrics_data["member_workloads"][0]
    assert w_stat["user_id"] == emp_user_id
    assert w_stat["active_tasks"] is None
    assert w_stat["is_available"] is False
    assert w_stat["status_message"] == "Workload data unavailable"

    assert metrics_data["project_velocity_integrated"] is False
    assert "Project velocity will be available" in metrics_data["project_velocity_message"]


@pytest.mark.asyncio
async def test_team_metrics_tenant_isolation(client: AsyncClient):
    """Admin from Org B cannot query Org A team metrics."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "MetricsOrgA", "admin.a@met.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "MetricsOrgB", "admin.b@met.com")

    team_a_id = (await client.post(
        f"/api/v1/organizations/{org_a_id}/teams",
        json={"name": "Team A", "department": "Eng"},
        headers={"Authorization": f"Bearer {token_a}"},
    )).json()["id"]

    # Cross-tenant query -> 403 Forbidden
    cross_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/teams/{team_a_id}/metrics",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert cross_res.status_code == 403

