"""Organization endpoint tests."""
import pytest
from httpx import AsyncClient


async def _register_and_token(client: AsyncClient, email: str) -> str:
    r = await client.post("/api/v1/auth/register", json={
        "name": "Org User", "email": email, "password": "SecurePass1"
    })
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_create_organization(client: AsyncClient):
    token = await _register_and_token(client, "orgcreate@example.com")
    response = await client.post(
        "/api/v1/organizations/",
        json={"company_name": "Acme Corp", "industry": "Technology"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "Acme Corp"
    assert data["status"] == "PENDING"


@pytest.mark.asyncio
async def test_get_organization(client: AsyncClient):
    token = await _register_and_token(client, "orgget@example.com")
    create_r = await client.post(
        "/api/v1/organizations/",
        json={"company_name": "Get Corp"},
        headers={"Authorization": f"Bearer {token}"},
    )
    org_id = create_r.json()["id"]
    response = await client.get(
        f"/api/v1/organizations/{org_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["id"] == org_id


@pytest.mark.asyncio
async def test_tenant_isolation(client: AsyncClient):
    """User from Org A cannot access Org B's data."""
    token_a = await _register_and_token(client, "isola@example.com")
    token_b = await _register_and_token(client, "isolb@example.com")

    create_r = await client.post(
        "/api/v1/organizations/",
        json={"company_name": "Org A"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    org_a_id = create_r.json()["id"]

    # Token B tries to access Org A
    response = await client.get(
        f"/api/v1/organizations/{org_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 403
