"""
Comprehensive tests for Organizational Role Management & Role-Capability Mapping (Neon PostgreSQL + Agent DB).
Covers CRUD, tenant isolation, uniqueness constraints, role permissions, capability mapping, and validation.
"""
import pytest
from httpx import AsyncClient


async def _get_seed_admin_token(client: AsyncClient) -> tuple[str, str]:
    """Helper to login as seed admin and return (token, organization_id)."""
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.ai", "password": "SecureAdmin1"},
    )
    data = res.json()
    return data["access_token"], data["user"]["organization_id"]


async def _create_test_org_and_admin(client: AsyncClient, org_name: str, admin_email: str) -> tuple[str, str]:
    """Helper to register a company through official onboarding and return (token, organization_id)."""
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
    data = res.json()
    return data["access_token"], data["organization"]["id"]


@pytest.mark.asyncio
async def test_create_role_success(client: AsyncClient):
    """Test creating an organizational role blueprint with full specifications."""
    token, org_id = await _get_seed_admin_token(client)
    
    payload = {
        "name": "Senior Full-Stack Engineer",
        "description": "Designs, develops, and maintains scalable web applications.",
        "department": "Engineering",
        "responsibilities": [
            "Implement high-throughput backend APIs",
            "Build responsive frontends",
            "Write comprehensive test suites",
        ],
        "required_skills": ["Python", "FastAPI", "TypeScript", "Next.js", "PostgreSQL"],
        "tools": ["github", "jira", "terminal"],
        "permissions": ["github:read", "github:write", "jira:write"],
        "persona": {
            "tone": "concise",
            "communication_style": "technical",
            "coding_standards": "PEP8, ESLint strict",
        },
        "risk_level": "LOW",
        "approval_rules": {
            "require_approval_for_prod_deploy": True,
            "max_autonomous_file_edits": 10,
        },
        "status": "ACTIVE",
    }
    
    res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Senior Full-Stack Engineer"
    assert data["organization_id"] == org_id
    assert data["department"] == "Engineering"
    assert "Python" in data["required_skills"]
    assert "github" in data["tools"]
    assert data["risk_level"] == "LOW"
    assert data["status"] == "ACTIVE"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_duplicate_role_name_in_same_org_rejected(client: AsyncClient):
    """Test that role names must be unique within an organization."""
    token, org_id = await _get_seed_admin_token(client)

    payload = {
        "name": "DevOps Specialist",
        "department": "Infrastructure",
    }
    # First creation
    res1 = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201

    # Second creation with same name in same org -> 409 Conflict
    res2 = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["error"]["message"]


@pytest.mark.asyncio
async def test_same_role_name_in_different_org_allowed(client: AsyncClient):
    """Test that identical role names in DIFFERENT organizations are allowed."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "Company Alpha", "admin.alpha@test.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "Company Beta", "admin.beta@test.com")

    role_payload = {
        "name": "Product Manager",
        "department": "Product",
    }

    # Create in Org A
    res_a = await client.post(
        f"/api/v1/organizations/{org_a_id}/roles",
        json=role_payload,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_a.status_code == 201

    # Create in Org B (should succeed)
    res_b = await client.post(
        f"/api/v1/organizations/{org_b_id}/roles",
        json=role_payload,
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b.status_code == 201
    assert res_a.json()["id"] != res_b.json()["id"]


@pytest.mark.asyncio
async def test_list_and_filter_roles(client: AsyncClient):
    """Test listing roles with department, status, and search filters."""
    token, org_id = await _create_test_org_and_admin(client, "Filter Corp", "admin.filter@test.com")

    # Seed 3 roles
    await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Frontend Dev", "department": "Engineering", "status": "ACTIVE"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "QA Specialist", "department": "QA", "status": "ACTIVE"},
        headers={"Authorization": f"Bearer {token}"},
    )
    await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Draft Role", "department": "Engineering", "status": "DRAFT"},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 1. List all
    res_all = await client.get(
        f"/api/v1/organizations/{org_id}/roles",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_all.status_code == 200
    assert res_all.json()["total"] == 3

    # 2. Filter by department
    res_eng = await client.get(
        f"/api/v1/organizations/{org_id}/roles?department=Engineering",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_eng.status_code == 200
    assert res_eng.json()["total"] == 2

    # 3. Filter by status
    res_draft = await client.get(
        f"/api/v1/organizations/{org_id}/roles?status=DRAFT",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_draft.status_code == 200
    assert res_draft.json()["total"] == 1
    assert res_draft.json()["roles"][0]["name"] == "Draft Role"

    # 4. Search filter
    res_search = await client.get(
        f"/api/v1/organizations/{org_id}/roles?search=specialist",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    assert res_search.json()["roles"][0]["name"] == "QA Specialist"


@pytest.mark.asyncio
async def test_get_patch_and_delete_role(client: AsyncClient):
    """Test GET single, PATCH update, and DELETE for a role."""
    token, org_id = await _create_test_org_and_admin(client, "CRUD Corp", "admin.crud@test.com")

    # 1. Create
    create_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Initial Role", "department": "Design"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    role_id = create_res.json()["id"]

    # 2. Get single
    get_res = await client.get(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Initial Role"

    # 3. Patch
    patch_res = await client.patch(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        json={"name": "Updated Role Name", "risk_level": "MEDIUM"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Updated Role Name"
    assert patch_res.json()["risk_level"] == "MEDIUM"

    # 4. Delete
    del_res = await client.delete(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 204

    # 5. Verify deleted
    get_again = await client.get(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_again.status_code == 404


@pytest.mark.asyncio
async def test_role_tenant_isolation(client: AsyncClient):
    """Test that Admin A cannot access, edit, or delete roles in Admin B's organization."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "TenA Corp", "admin.tena@test.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "TenB Corp", "admin.tenb@test.com")

    # Create role in Org A
    res_create = await client.post(
        f"/api/v1/organizations/{org_a_id}/roles",
        json={"name": "Org A Role"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_create.status_code == 201
    role_a_id = res_create.json()["id"]

    # Admin B tries to list Org A's roles -> 403 Forbidden
    res_list = await client.get(
        f"/api/v1/organizations/{org_a_id}/roles",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_list.status_code == 403

    # Admin B tries to get Org A's role -> 403 Forbidden
    res_get = await client.get(
        f"/api/v1/organizations/{org_a_id}/roles/{role_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_get.status_code == 403

    # Admin B tries to patch Org A's role -> 403 Forbidden
    res_patch = await client.patch(
        f"/api/v1/organizations/{org_a_id}/roles/{role_a_id}",
        json={"name": "Hacked Name"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_patch.status_code == 403

    # Admin B tries to delete Org A's role -> 403 Forbidden
    res_del = await client.delete(
        f"/api/v1/organizations/{org_a_id}/roles/{role_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_del.status_code == 403


@pytest.mark.asyncio
async def test_employee_forbidden_from_role_management(client: AsyncClient):
    """Test that a regular EMPLOYEE is forbidden from role management endpoints."""
    # Login as employee
    emp_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@company.ai", "password": "SecureEmployee1"},
    )
    emp_token = emp_res.json()["access_token"]
    emp_org_id = emp_res.json()["user"]["organization_id"]

    # Employee tries to list roles -> 403 Forbidden
    res = await client.get(
        f"/api/v1/organizations/{emp_org_id}/roles",
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert res.status_code == 403


# ── Phase 2: Role Capability Mapping Tests ────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_capabilities_listing_remains_functional(client: AsyncClient):
    """Test that existing GET /agent-capabilities remains fully functional and returns seeded capabilities."""
    # Register test capabilities
    cap_res1 = await client.post(
        "/api/v1/agent-capabilities",
        json={
            "name": "coding",
            "description": "Autonomous code generation and syntax synthesis",
            "supported_roles": ["Developer"],
            "required_tools": ["terminal", "github"],
            "required_permissions": ["system:execute", "github:write"],
            "input_schema": {},
            "output_schema": {},
            "system_instructions": "Write safe code.",
            "risk_level": "LOW",
            "approval_required": False,
            "enabled": True,
            "version": "1.0.0",
        },
    )
    assert cap_res1.status_code == 200

    cap_res2 = await client.post(
        "/api/v1/agent-capabilities",
        json={
            "name": "debugging",
            "description": "Trace inspection and bug fixing",
            "supported_roles": ["Developer", "QA"],
            "required_tools": ["terminal"],
            "required_permissions": ["system:execute"],
            "input_schema": {},
            "output_schema": {},
            "system_instructions": "Fix errors.",
            "risk_level": "LOW",
            "approval_required": False,
            "enabled": True,
            "version": "1.0.0",
        },
    )
    assert cap_res2.status_code == 200

    list_res = await client.get("/api/v1/agent-capabilities")
    assert list_res.status_code == 200
    caps = list_res.json()
    names = [c["name"] for c in caps]
    assert "coding" in names
    assert "debugging" in names


@pytest.mark.asyncio
async def test_role_capability_assignment_and_retrieval(client: AsyncClient):
    """Test assigning capabilities to an organizational role and fetching them."""
    token, org_id = await _create_test_org_and_admin(client, "Mapping Corp", "admin.map@test.com")

    # 1. Ensure capabilities exist
    await client.post("/api/v1/agent-capabilities", json={
        "name": "testing", "description": "Automated testing", "supported_roles": ["QA"],
        "required_tools": ["terminal"], "required_permissions": ["system:execute"],
        "input_schema": {}, "output_schema": {}, "system_instructions": "Run tests.",
        "risk_level": "LOW", "approval_required": False, "enabled": True, "version": "1.0.0",
    })
    await client.post("/api/v1/agent-capabilities", json={
        "name": "github", "description": "Git operations", "supported_roles": ["Developer"],
        "required_tools": ["github"], "required_permissions": ["github:write"],
        "input_schema": {}, "output_schema": {}, "system_instructions": "Manage git.",
        "risk_level": "HIGH", "approval_required": True, "enabled": True, "version": "1.0.0",
    })

    # 2. Create role
    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "QA Lead", "department": "Quality Assurance"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_id = role_res.json()["id"]

    # 3. Assign capabilities (using capability names)
    put_res = await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["testing", "github"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 200
    put_data = put_res.json()
    assert put_data["role_id"] == role_id
    assert put_data["total"] == 2
    assigned_names = [c["name"] for c in put_data["capabilities"]]
    assert "testing" in assigned_names
    assert "github" in assigned_names

    # 4. Fetch capabilities via GET /capabilities endpoint
    get_caps_res = await client.get(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_caps_res.status_code == 200
    assert get_caps_res.json()["total"] == 2

    # 5. Fetch role details via GET /roles/{role_id} and verify capabilities are embedded
    get_role_res = await client.get(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_role_res.status_code == 200
    role_data = get_role_res.json()
    assert "capabilities" in role_data
    assert len(role_data["capabilities"]) == 2
    first_cap = role_data["capabilities"][0]
    assert "id" in first_cap
    assert "name" in first_cap
    assert "description" in first_cap
    assert "risk_level" in first_cap
    assert "approval_required" in first_cap
    assert "enabled" in first_cap
    assert "version" in first_cap


@pytest.mark.asyncio
async def test_assign_invalid_capability_rejected(client: AsyncClient):
    """Test that assigning a nonexistent capability is rejected with 400 Bad Request."""
    token, org_id = await _create_test_org_and_admin(client, "InvalidCap Corp", "admin.inv@test.com")

    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Architect", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_id = role_res.json()["id"]

    put_res = await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["nonexistent_magic_capability"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 400
    assert "does not exist" in put_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_assign_disabled_capability_rejected(client: AsyncClient):
    """Test that assigning a disabled capability is rejected with 400 Bad Request."""
    token, org_id = await _create_test_org_and_admin(client, "DisabledCap Corp", "admin.dis@test.com")

    # Register disabled capability
    await client.post("/api/v1/agent-capabilities", json={
        "name": "dangerous_eval", "description": "Disabled eval engine", "supported_roles": ["Admin"],
        "required_tools": ["terminal"], "required_permissions": ["system:execute"],
        "input_schema": {}, "output_schema": {}, "system_instructions": "Eval.",
        "risk_level": "CRITICAL", "approval_required": True, "enabled": False, "version": "1.0.0",
    })

    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Security Tester", "department": "Security"},
        headers={"Authorization": f"Bearer {token}"},
    )
    role_id = role_res.json()["id"]

    put_res = await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["dangerous_eval"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 400
    assert "disabled" in put_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_role_capabilities_tenant_isolation(client: AsyncClient):
    """Test that Admin A cannot view or update capability mappings of Admin B's role."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "TenCapA Corp", "admin.tencapa@test.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "TenCapB Corp", "admin.tencapb@test.com")

    role_a_res = await client.post(
        f"/api/v1/organizations/{org_a_id}/roles",
        json={"name": "Role A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    role_a_id = role_a_res.json()["id"]

    # Admin B tries to get capabilities for Role A -> 403 Forbidden
    get_res = await client.get(
        f"/api/v1/organizations/{org_a_id}/roles/{role_a_id}/capabilities",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_res.status_code == 403

    # Admin B tries to update capabilities for Role A -> 403 Forbidden
    put_res = await client.put(
        f"/api/v1/organizations/{org_a_id}/roles/{role_a_id}/capabilities",
        json={"capabilities": ["coding"]},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert put_res.status_code == 403


# ── Phase 5: Role Persona, Permissions & Criteria Engine Conversion Tests ─────

@pytest.mark.asyncio
async def test_unsupported_tool_rejected_by_tool_registry(client: AsyncClient):
    """Test that specifying an unrecognized tool is rejected with 400 Bad Request."""
    token, org_id = await _create_test_org_and_admin(client, "ToolCorp", "admin.tool@test.com")

    payload = {
        "name": "Invalid Tool Role",
        "department": "Engineering",
        "tools": ["unsupported_quantum_laser_tool"],
    }
    res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400
    assert "Unsupported tool" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_role_persona_permissions_and_criteria_engine_conversion(client: AsyncClient):
    """
    Test creating a comprehensive Developer role with persona, responsibilities, skills, tools, and permissions,
    and verifying it converts seamlessly into the exact RoleCriteria structure expected by AgentPlanner.
    """
    token, org_id = await _create_test_org_and_admin(client, "CriteriaCorp", "admin.crit@test.com")

    # 1. Ensure standard capabilities exist
    await client.post("/api/v1/agent-capabilities", json={
        "name": "coding", "description": "Autonomous code synthesis", "supported_roles": ["Developer"],
        "required_tools": ["terminal", "github"], "required_permissions": ["system:execute", "github:write"],
        "input_schema": {}, "output_schema": {}, "system_instructions": "Write code.",
        "risk_level": "LOW", "approval_required": False, "enabled": True, "version": "1.0.0",
    })
    await client.post("/api/v1/agent-capabilities", json={
        "name": "debugging", "description": "Bug diagnostics", "supported_roles": ["Developer"],
        "required_tools": ["terminal"], "required_permissions": ["system:execute"],
        "input_schema": {}, "output_schema": {}, "system_instructions": "Debug code.",
        "risk_level": "LOW", "approval_required": False, "enabled": True, "version": "1.0.0",
    })

    # 2. Create rich Developer role
    role_payload = {
        "name": "Lead Developer",
        "description": "Architects and implements scalable microservices.",
        "department": "Engineering",
        "responsibilities": [
            "implement_features",
            "write_tests",
            "code_review",
            "production_deployment",
        ],
        "required_skills": ["Python", "FastAPI", "TypeScript", "PostgreSQL"],
        "tools": ["github", "terminal"],
        "permissions": ["code:read", "code:write", "github:read", "github:write", "deploy:production"],
        "persona": {
            "name": "Developer Twin",
            "communication_style": "Technical & Direct",
            "behavioral_traits": ["Analytical", "Technical", "Detail-oriented"],
            "decision_style": "Data-Driven",
            "additional_instructions": "Adhere strictly to PEP8 and type annotations.",
        },
        "risk_level": "HIGH",
        "approval_rules": {
            "require_approval_for_prod_deploy": True,
            "max_autonomous_file_edits": 15,
        },
        "status": "ACTIVE",
    }

    create_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=role_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_res.status_code == 201
    role_data = create_res.json()
    role_id = role_data["id"]

    # 3. Assign capabilities bundle
    put_cap_res = await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["coding", "debugging"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_cap_res.status_code == 200

    # 4. Fetch full role with capabilities
    get_role_res = await client.get(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_role_res.status_code == 200
    full_role = get_role_res.json()

    # 5. Convert full_role through CriteriaEngine directly
    from app.agentic.planner.criteria_engine import CriteriaEngine
    from app.agentic.planner.agent_planner import AgentPlanner
    from app.agentic.models import RiskLevel

    human_twin = {
        "skills": {
            "technical_skills": ["Python", "Docker"],
        },
        "preferences": {
            "tone": "concise",
        }
    }

    criteria = CriteriaEngine.generate_role_criteria(
        role_id=full_role["id"],
        role_twin=full_role,
        human_twin=human_twin,
    )

    # Validate generated Criteria structure
    assert criteria["role_id"] == role_id
    assert "coding" in criteria["capabilities_required"]
    assert "debugging" in criteria["capabilities_required"]
    assert "Python" in criteria["skills"]
    assert "Docker" in criteria["skills"]
    assert "github" in [t.lower() for t in criteria["tools"]]
    assert criteria["persona"]["name"] == "Developer Twin"
    assert criteria["persona"]["communication_style"] == "Technical & Direct"
    assert "deploy:production" in criteria["permissions"]
    assert criteria["risk_level"] == RiskLevel.CRITICAL  # Elevated due to production_deployment responsibility

    # 6. Execute AgentPlanner with generated criteria
    planner = AgentPlanner()
    planned_capabilities = await planner.plan_agent_group(
        employee_id="emp_test_123",
        role_twin=full_role,
        human_twin=human_twin,
    )

    assert "coding" in planned_capabilities
    assert "debugging" in planned_capabilities


# ── Phase 6: Employee to Role Assignment Tests ─────────────────────────────────

@pytest.mark.asyncio
async def test_assign_employee_to_role_success(client: AsyncClient):
    """
    Test assigning an employee to a Job/AI Role blueprint.
    Verifies that the assignment persists and that organization_members.role remains 'EMPLOYEE'.
    """
    token, org_id = await _create_test_org_and_admin(client, "EmpAssignCorp", "admin.emp@test.com")

    # 1. Create a Role blueprint
    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Frontend Architect", "department": "Design & Engineering", "risk_level": "LOW"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert role_res.status_code == 201
    role_id = role_res.json()["id"]

    # 2. Register an employee
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Jane Developer",
        "email": "jane.dev@test.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
        "job_title": "Developer",
        "department": "Engineering",
    })
    assert emp_res.status_code == 201

    # 3. Approve employee
    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    members = members_res.json()
    emp_member = next(m for m in members if m["email"] == "jane.dev@test.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    # 4. Assign Job/AI Role via PUT /organizations/{org_id}/employees/{employee_id}/role
    assign_res = await client.put(
        f"/api/v1/organizations/{org_id}/employees/{emp_member['user_id']}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert assign_res.status_code == 200
    assignment_data = assign_res.json()
    assert assignment_data["organization_id"] == org_id
    assert assignment_data["user_id"] == emp_member["user_id"]
    assert assignment_data["assigned_role"]["name"] == "Frontend Architect"
    assert assignment_data["membership_role"] == "EMPLOYEE"  # Clean separation!

    # 5. Fetch role assignment via GET
    get_assign_res = await client.get(
        f"/api/v1/organizations/{org_id}/employees/{emp_member['user_id']}/role",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_assign_res.status_code == 200
    assert get_assign_res.json()["assigned_role"]["name"] == "Frontend Architect"

    # 6. Verify organization_members.role in detailed members list is still EMPLOYEE
    detailed_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    updated_emp = next(m for m in detailed_res.json() if m["email"] == "jane.dev@test.com")
    assert updated_emp["role"] == "EMPLOYEE"
    assert updated_emp["job_role_name"] == "Frontend Architect"


@pytest.mark.asyncio
async def test_assign_role_from_different_org_rejected(client: AsyncClient):
    """Test that assigning a role belonging to Org B to an employee in Org A is rejected."""
    token_a, org_a_id = await _create_test_org_and_admin(client, "CrossOrgA", "admin.a@cross.com")
    token_b, org_b_id = await _create_test_org_and_admin(client, "CrossOrgB", "admin.b@cross.com")

    # Role in Org B
    role_b_res = await client.post(
        f"/api/v1/organizations/{org_b_id}/roles",
        json={"name": "Org B Role", "department": "IT"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    role_b_id = role_b_res.json()["id"]

    # Employee in Org A
    emp_a_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_a_id,
        "name": "Alice OrgA",
        "email": "alice.orga@test.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    emp_a_user_id = emp_a_res.json()["user"]["id"]

    # Admin A attempts to assign Org B's role to Alice -> 400 Bad Request
    put_res = await client.put(
        f"/api/v1/organizations/{org_a_id}/employees/{emp_a_user_id}/role",
        json={"role_id": role_b_id},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert put_res.status_code == 400
    assert "does not exist in this organization" in put_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_non_admin_cannot_assign_employee_role(client: AsyncClient):
    """Test that a regular employee cannot assign roles (403 Forbidden)."""
    token_admin, org_id = await _create_test_org_and_admin(client, "SecurityRoleOrg", "admin.secrole@test.com")

    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Dev", "department": "Eng"},
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    role_id = role_res.json()["id"]

    # Register employee
    emp_reg = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Regular Joe",
        "email": "joe.regular@test.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    user_id = emp_reg.json()["user"]["id"]

    # Approve and login as employee
    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token_admin}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "joe.regular@test.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token_admin}"},
    )

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "joe.regular@test.com", "password": "SecurePassword1"},
    )
    emp_token = login_res.json()["access_token"]

    # Joe tries to assign role -> 403 Forbidden
    put_res = await client.put(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {emp_token}"},
    )
    assert put_res.status_code == 403


# ── Phase 7: Role Assignment -> AgentFactory Provisioning Tests ───────────────

@pytest.mark.asyncio
async def test_workforce_provisioning_flow_creates_agent_group_and_agents(client: AsyncClient):
    """
    Test the complete end-to-end workforce provisioning flow:
    Neon Employee + Role -> CriteriaEngine -> AgentPlanner -> AgentFactory -> SQLite AgentGroup + Agents.
    """
    token, org_id = await _create_test_org_and_admin(client, "WorkforceCorp", "admin.wf@test.com")

    # 1. Register Capabilities in CapabilityRegistry
    for cap_name, desc, tools, perms in [
        ("coding", "Code generator", ["terminal", "github"], ["system:execute", "github:write"]),
        ("debugging", "Bug diagnostics", ["terminal"], ["system:execute"]),
        ("testing", "Test suite execution", ["terminal"], ["system:execute"]),
        ("github", "GitHub PR manager", ["github"], ["github:read", "github:write"]),
    ]:
        await client.post("/api/v1/agent-capabilities", json={
            "name": cap_name,
            "description": desc,
            "supported_roles": ["Developer"],
            "required_tools": tools,
            "required_permissions": perms,
            "input_schema": {},
            "output_schema": {},
            "system_instructions": f"Standard instructions for {cap_name}.",
            "risk_level": "LOW",
            "approval_required": False,
            "enabled": True,
            "version": "1.0.0",
        })

    # 2. Create Developer Role Blueprint in Neon
    role_payload = {
        "name": "Backend Developer",
        "department": "Engineering",
        "description": "Develops microservices and test suites.",
        "responsibilities": ["implement_features", "write_tests"],
        "required_skills": ["Python", "FastAPI"],
        "tools": ["github", "terminal"],
        "permissions": ["github:read", "github:write", "system:execute"],
        "persona": {
            "name": "Developer Twin",
            "communication_style": "Technical & Direct",
        },
        "risk_level": "LOW",
        "status": "ACTIVE",
    }
    role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=role_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert role_res.status_code == 201
    role_id = role_res.json()["id"]

    # Map capabilities in Neon
    await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["coding", "debugging", "testing", "github"]},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 3. Register and Approve Employee
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Alex Dev",
        "email": "alex.dev@workforce.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    user_id = emp_res.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "alex.dev@workforce.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    # 4. Assign Role
    await client.put(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )

    # 5. Provision Agent Workforce via POST /organizations/{org_id}/employees/{user_id}/agent-workforce/provision
    prov_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/agent-workforce/provision",
        json={"force_regenerate": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 200
    group_data = prov_res.json()

    # Validate AgentGroup & Agents created by AgentFactory
    assert group_data["organization_id"] == org_id
    assert group_data["employee_id"] == user_id
    assert group_data["status"] == "ACTIVE"
    assert "Backend Developer" in group_data["name"]

    agents = group_data["agents"]
    assert len(agents) >= 3
    agent_names = [a["name"] for a in agents]
    assert any("coding" in name.lower() for name in agent_names)
    assert any("debugging" in name.lower() for name in agent_names)

    # Verify personalized instructions contain communication style
    for agent in agents:
        assert "Technical & Direct" in agent["custom_instructions"]
        assert agent["status"] == "ACTIVE"

    # 6. Fetch provisioned workforce via GET
    get_wf_res = await client.get(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/agent-workforce",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_wf_res.status_code == 200
    assert get_wf_res.json()["id"] == group_data["id"]


@pytest.mark.asyncio
async def test_role_transition_archives_old_group_and_provisions_new_group(client: AsyncClient):
    """
    Test that when an employee's role changes (e.g. Developer -> DevOps),
    the prior AgentGroup is archived and a new active AgentGroup is provisioned.
    """
    token, org_id = await _create_test_org_and_admin(client, "TransitionCorp", "admin.trans@test.com")

    # 1. Create Developer and DevOps roles
    dev_role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "Developer Role", "department": "Engineering"},
        headers={"Authorization": f"Bearer {token}"},
    )
    dev_role_id = dev_role_res.json()["id"]

    ops_role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json={"name": "DevOps Role", "department": "Infrastructure"},
        headers={"Authorization": f"Bearer {token}"},
    )
    ops_role_id = ops_role_res.json()["id"]

    # 2. Register Employee
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Sam Morph",
        "email": "sam.morph@test.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    user_id = emp_res.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "sam.morph@test.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    # 3. Provision for Developer Role
    prov_dev_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/agent-workforce/provision",
        json={"role_id": dev_role_id, "force_regenerate": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_dev_res.status_code == 200
    first_group_id = prov_dev_res.json()["id"]

    # 4. Transition to DevOps Role and Re-provision
    prov_ops_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/agent-workforce/provision",
        json={"role_id": ops_role_id, "force_regenerate": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_ops_res.status_code == 200
    second_group_data = prov_ops_res.json()
    assert second_group_data["id"] != first_group_id
    assert "DevOps Role" in second_group_data["name"]
    assert second_group_data["status"] == "ACTIVE"


# ── Phase 9: Complete 11-Step End-to-End Integration Test ─────────────────────

@pytest.mark.asyncio
async def test_phase9_complete_e2e_workflow(client: AsyncClient):
    """
    Complete 11-Step Integration Workflow:
    1. Create Developer role.
    2. Add capabilities (coding, debugging, testing, github, code_review).
    3. Configure permissions (github:read, github:write, system:execute).
    4. Configure persona (communication_style, behavioral_traits).
    5. Register & approve employee (Rahul Sharma, EMP-001).
    6. Assign Developer role (clean separation from membership).
    7. Provision AI workforce via AgentPlanner & AgentFactory.
    8. Verify AgentGroup created in SQLite Agent DB.
    9. Verify individual Agents instantiated.
    10. Verify capability/permission/tool assignments.
    11. Retrieve employee AgentGroup from Company Portal endpoint.
    """
    token, org_id = await _create_test_org_and_admin(client, "ApexTech", "admin.apex@test.com")

    # Step 1: Create Developer Role
    role_payload = {
        "name": "Senior Full-Stack Developer",
        "department": "Engineering",
        "description": "Architects microservices, reviews pull requests, and runs tests.",
        "responsibilities": ["implement_features", "code_review", "write_tests"],
        "required_skills": ["Python", "FastAPI", "React", "Docker"],
        "tools": ["github", "terminal"],
        "permissions": ["github:read", "github:write", "system:execute"],
        "persona": {
            "name": "Apex Developer Twin",
            "communication_style": "Technical & Analytical",
            "behavioral_traits": ["Analytical", "Pragmatic", "Detail-oriented"],
            "decision_style": "Autonomous with Code Review Verification",
        },
        "risk_level": "LOW",
        "approval_rules": {"require_human_review_for_db_writes": True},
        "status": "ACTIVE",
    }
    create_role_res = await client.post(
        f"/api/v1/organizations/{org_id}/roles",
        json=role_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_role_res.status_code == 201
    role_id = create_role_res.json()["id"]

    # Step 2: Add capabilities
    caps_to_register = [
        ("coding", "Generates and edits code", ["terminal", "github"], ["system:execute", "github:write"]),
        ("debugging", "Analyzes stacktraces and bug logs", ["terminal"], ["system:execute"]),
        ("testing", "Executes unit and integration test suites", ["terminal"], ["system:execute"]),
        ("github", "Manages branches, issues, and PR comments", ["github"], ["github:read", "github:write"]),
        ("code_review", "Conducts static code reviews against guidelines", ["github"], ["github:read"]),
    ]
    for cap_name, desc, tools, perms in caps_to_register:
        await client.post("/api/v1/agent-capabilities", json={
            "name": cap_name,
            "description": desc,
            "supported_roles": ["Senior Full-Stack Developer"],
            "required_tools": tools,
            "required_permissions": perms,
            "input_schema": {},
            "output_schema": {},
            "system_instructions": f"System guidance for {cap_name}.",
            "risk_level": "LOW",
            "approval_required": False,
            "enabled": True,
            "version": "1.0.0",
        })

    cap_res = await client.put(
        f"/api/v1/organizations/{org_id}/roles/{role_id}/capabilities",
        json={"capabilities": ["coding", "debugging", "testing", "github", "code_review"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert cap_res.status_code == 200
    assert len(cap_res.json()["capabilities"]) == 5

    # Step 3, 4: Verify permissions & persona in role get
    role_get_res = await client.get(
        f"/api/v1/organizations/{org_id}/roles/{role_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    role_data = role_get_res.json()
    assert "github:write" in role_data["permissions"]
    assert role_data["persona"]["communication_style"] == "Technical & Analytical"

    # Step 5: Register and approve employee (Rahul Sharma, EMP-001)
    emp_res = await client.post("/api/v1/onboarding/employee/register", json={
        "organization_id": org_id,
        "name": "Rahul Sharma",
        "email": "rahul.sharma@apex.com",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    })
    assert emp_res.status_code == 201
    user_id = emp_res.json()["user"]["id"]

    members_res = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed",
        headers={"Authorization": f"Bearer {token}"},
    )
    emp_member = next(m for m in members_res.json() if m["email"] == "rahul.sharma@apex.com")
    await client.post(
        f"/api/v1/organizations/{org_id}/members/{emp_member['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Step 6: Assign Developer role
    assign_res = await client.put(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/role",
        json={"role_id": role_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert assign_res.status_code == 200
    assignment = assign_res.json()
    assert assignment["membership_role"] == "EMPLOYEE"
    assert assignment["assigned_role"]["name"] == "Senior Full-Stack Developer"

    # Step 7: Provision AI workforce via AgentPlanner & AgentFactory
    prov_res = await client.post(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/agent-workforce/provision",
        json={"force_regenerate": True},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert prov_res.status_code == 200
    workforce = prov_res.json()

    # Step 8: Verify AgentGroup created in SQLite Agent DB
    assert workforce["organization_id"] == org_id
    assert workforce["employee_id"] == user_id
    assert workforce["status"] == "ACTIVE"
    assert "Senior Full-Stack Developer" in workforce["name"]

    # Step 9: Verify individual Agents instantiated
    agents = workforce["agents"]
    assert len(agents) == 5
    agent_names = [a["name"] for a in agents]
    for expected in ["coding Agent", "debugging Agent", "testing Agent", "github Agent", "code_review Agent"]:
        assert expected in agent_names

    # Step 10: Verify capability/permission/tool assignments & personalized instructions
    for agent in agents:
        assert agent["status"] == "ACTIVE"
        assert "Technical & Analytical" in agent["custom_instructions"]
        if "coding" in agent["name"]:
            assert "terminal" in agent["assigned_tools"]
            assert "github" in agent["assigned_tools"]
            assert "system:execute" in agent["permissions"]

    # Step 11: Retrieve employee AgentGroup from Company Portal endpoint
    portal_res = await client.get(
        f"/api/v1/organizations/{org_id}/employees/{user_id}/agent-workforce",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert portal_res.status_code == 200
    retrieved_wf = portal_res.json()
    assert retrieved_wf["id"] == workforce["id"]
    assert len(retrieved_wf["agents"]) == 5




