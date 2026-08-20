"""Onboarding module tests — Company registration."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_company_success(client: AsyncClient):
    """Valid company registration succeeds, creates org, admin user and membership."""
    payload = {
        "company_name": "Nexus Dynamics Inc",
        "company_email": "contact@nexusdynamics.io",
        "industry": "Technology",
        "company_size": "51-200",
        "employee_count": 120,
        "company_phone": "+1-555-0199",
        "website": "https://nexusdynamics.io",
        "country": "United States",
        "city": "San Francisco",
        "business_model": "B2B SaaS",
        "description": "Autonomous AI workforce platform",
        "primary_contact": "Marcus Vance",
        "admin_name": "Marcus Vance",
        "admin_email": "marcus@nexusdynamics.io",
        "admin_phone": "+1-555-0198",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["success"] is True
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    org = data["organization"]
    assert org["company_name"] == "Nexus Dynamics Inc"
    assert org["company_email"] == "contact@nexusdynamics.io"
    assert org["industry"] == "Technology"
    assert org["employee_count"] == 120
    assert org["status"] == "ACTIVE"

    user = data["user"]
    assert user["name"] == "Marcus Vance"
    assert user["email"] == "marcus@nexusdynamics.io"
    assert user["role"] == "ORG_ADMIN"
    assert user["organization_id"] == org["id"]

    # Security check: no passwords in response
    assert "password" not in user
    assert "password_hash" not in user


@pytest.mark.asyncio
async def test_register_duplicate_company_email(client: AsyncClient):
    """Attempting to register with an existing company email is rejected."""
    payload = {
        "company_name": "Twin Clone Corp",
        "company_email": "contact@company.ai",  # Already seeded
        "industry": "Artificial Intelligence",
        "company_size": "51-200",
        "employee_count": 80,
        "admin_name": "Clone Admin",
        "admin_email": "clone@clonecorp.ai",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert response.status_code == 409
    data = response.json()
    assert "already registered" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_company_name(client: AsyncClient):
    """Attempting to register with an existing company name is rejected."""
    payload = {
        "company_name": "Twin Agent Technologies Inc.",  # Already seeded
        "company_email": "newcontact@otherdomain.ai",
        "industry": "Artificial Intelligence",
        "company_size": "51-200",
        "employee_count": 80,
        "admin_name": "Clone Admin",
        "admin_email": "clone2@clonecorp.ai",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert response.status_code == 409
    data = response.json()
    assert "already registered" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_register_duplicate_admin_email(client: AsyncClient):
    """Attempting to register with an existing administrator user email is rejected."""
    payload = {
        "company_name": "Brand New Org",
        "company_email": "info@brandneworg.com",
        "industry": "Consulting",
        "company_size": "11-50",
        "employee_count": 25,
        "admin_name": "Asha Verma",
        "admin_email": "admin@company.ai",  # Already seeded user
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert response.status_code == 409
    data = response.json()
    assert "already exists" in data["error"]["message"].lower()


@pytest.mark.asyncio
async def test_register_invalid_employee_count(client: AsyncClient):
    """Employee count must be a positive integer >= 1."""
    payload = {
        "company_name": "Invalid Emp Org",
        "company_email": "info@invaliddemo.com",
        "industry": "Retail",
        "company_size": "1-10",
        "employee_count": 0,  # Invalid
        "admin_name": "Demo Admin",
        "admin_email": "demo@invaliddemo.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_mismatch(client: AsyncClient):
    """Confirm password mismatch triggers validation error."""
    payload = {
        "company_name": "Mismatch Org",
        "company_email": "info@mismatchdemo.com",
        "industry": "Finance",
        "company_size": "1-10",
        "employee_count": 5,
        "admin_name": "Mismatch Admin",
        "admin_email": "admin@mismatchdemo.com",
        "admin_password": "SecurePassword1",
        "confirm_password": "DifferentPassword2",
    }
    response = await client.post("/api/v1/onboarding/company/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_companies_public(client: AsyncClient):
    """Public discovery returns only safe fields without authentication."""
    response = await client.get("/api/v1/onboarding/companies")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total"] >= 1

    # Verify safe fields only
    first_org = data["data"][0]
    assert "id" in first_org
    assert "company_name" in first_org
    assert "company_email" not in first_org
    assert "company_phone" not in first_org
    assert "employee_count" not in first_org
    assert "password" not in first_org


@pytest.mark.asyncio
async def test_search_companies_case_insensitive_and_partial(client: AsyncClient):
    """Search matches partially and case-insensitively."""
    # Lowercase search
    res_lower = await client.get("/api/v1/onboarding/companies?search=twin")
    assert res_lower.status_code == 200
    data_lower = res_lower.json()
    assert len(data_lower["data"]) >= 1
    assert "Twin" in data_lower["data"][0]["company_name"]

    # Uppercase partial search
    res_upper = await client.get("/api/v1/onboarding/companies?search=TECHNOLOGIES")
    assert res_upper.status_code == 200
    data_upper = res_upper.json()
    assert len(data_upper["data"]) >= 1

    # Nonexistent company search
    res_none = await client.get("/api/v1/onboarding/companies?search=NonExistentCorpXYZ123")
    assert res_none.status_code == 200
    data_none = res_none.json()
    assert data_none["total"] == 0
    assert len(data_none["data"]) == 0


@pytest.mark.asyncio
async def test_register_employee_success(client: AsyncClient):
    """Employee registration succeeds with valid existing org, creates user with EMPLOYEE role."""
    # 1. Admin login to get their registered organization
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@company.ai", "password": "SecureAdmin1"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    org_id = admin_login.json()["user"]["organization_id"]

    # 2. Register employee
    payload = {
        "organization_id": org_id,
        "name": "Vikram Sen",
        "email": "vikram.sen@company.ai",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
        "employee_id": "EMP-9021",
        "department": "Engineering",
        "job_title": "AI Systems Engineer",
        "phone": "+1-555-0988",
    }
    response = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["success"] is True
    assert data["requires_approval"] is True

    user = data["user"]
    assert user["name"] == "Vikram Sen"
    assert user["email"] == "vikram.sen@company.ai"
    assert user["role"] == "EMPLOYEE"  # Forced by backend
    assert user["organization_id"] == org_id
    assert "password" not in user
    assert "password_hash" not in user

    # Admin fetches detailed pending requests and approves
    pending_list = await client.get(
        f"/api/v1/organizations/{org_id}/members/detailed?status=INVITED",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert pending_list.status_code == 200
    target_mem = next(m for m in pending_list.json() if m["email"] == "vikram.sen@company.ai")
    approve_res = await client.post(
        f"/api/v1/organizations/{org_id}/members/{target_mem['id']}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert approve_res.status_code == 200

    # 3. Verify employee can log in and access /api/v1/auth/me after approval
    emp_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "vikram.sen@company.ai", "password": "SecurePassword1"},
    )
    assert emp_login.status_code == 200
    token = emp_login.json()["access_token"]
    res_me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["data"]["email"] == "vikram.sen@company.ai"
    assert res_me.json()["data"]["role"] == "EMPLOYEE"
    assert res_me.json()["data"]["organization_id"] == org_id


@pytest.mark.asyncio
async def test_register_employee_duplicate_email(client: AsyncClient):
    """Attempting to register employee with already existing email is rejected."""
    res_orgs = await client.get("/api/v1/onboarding/companies")
    org_id = res_orgs.json()["data"][0]["id"]

    payload = {
        "organization_id": org_id,
        "name": "Duplicate User",
        "email": "employee@company.ai",  # Already seeded
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_register_employee_invalid_organization(client: AsyncClient):
    """Attempting to register employee with invalid/non-existent organization ID is rejected."""
    payload = {
        "organization_id": "00000000-0000-0000-0000-000000000000",
        "name": "Invalid Org Employee",
        "email": "invalid.org.emp@company.ai",
        "password": "SecurePassword1",
        "confirm_password": "SecurePassword1",
    }
    response = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_register_employee_password_mismatch(client: AsyncClient):
    """Password mismatch triggers validation error."""
    res_orgs = await client.get("/api/v1/onboarding/companies")
    org_id = res_orgs.json()["data"][0]["id"]

    payload = {
        "organization_id": org_id,
        "name": "Mismatch User",
        "email": "mismatch.emp@company.ai",
        "password": "SecurePassword1",
        "confirm_password": "DifferentPassword2",
    }
    response = await client.post("/api/v1/onboarding/employee/register", json=payload)
    assert response.status_code == 422

