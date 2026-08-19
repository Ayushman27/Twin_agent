"""Auth endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "SecurePass1",
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"name": "User", "email": "dup@example.com", "password": "SecurePass1"}
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


@pytest.mark.asyncio
async def test_register_weak_password(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "name": "Test",
        "email": "weak@example.com",
        "password": "weakpass",  # no uppercase, no digit
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "name": "Login User",
        "email": "login@example.com",
        "password": "SecurePass1",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "SecurePass1",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "name": "Wrong", "email": "wrong@example.com", "password": "SecurePass1"
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "wrong@example.com", "password": "WrongPass1"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "name": "Me User", "email": "me@example.com", "password": "SecurePass1"
    })
    token = reg.json()["access_token"]
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_seed_login_and_role(client: AsyncClient):
    """Seed admin can authenticate and receives ORG_ADMIN role."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "admin@company.ai",
        "password": "SecureAdmin1",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@company.ai"
    assert data["user"]["role"] == "ORG_ADMIN"

    # Verify /me endpoint returns ORG_ADMIN
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"}
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["data"]["role"] == "ORG_ADMIN"


@pytest.mark.asyncio
async def test_employee_seed_login_and_role(client: AsyncClient):
    """Seed employee can authenticate, receives EMPLOYEE role and organization_id."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "employee@company.ai",
        "password": "SecureEmployee1",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "employee@company.ai"
    assert data["user"]["role"] == "EMPLOYEE"
    assert data["user"]["organization_id"] is not None


@pytest.mark.asyncio
async def test_unaffiliated_employee_login(client: AsyncClient):
    """Unaffiliated employee authenticates but has organization_id == None."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "unaffiliated@company.ai",
        "password": "SecureUnaffiliated1",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "unaffiliated@company.ai"
    assert data["user"]["role"] == "EMPLOYEE"
    assert data["user"]["organization_id"] is None
