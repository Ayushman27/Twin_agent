"""
Tests for Neon PostgreSQL configuration, credential masking, and connectivity checks.
"""
import pytest
from httpx import AsyncClient

from app.db.postgres import check_neon_connection, mask_database_url
from app.db.sqlite import check_sqlite_connection


def test_mask_database_url_redacts_password():
    """Verify passwords are masked and never exposed in logs or errors."""
    raw_url = "postgresql+asyncpg://neon_user:SuperSecretPassword123@ep-sample-pool.us-east-2.aws.neon.tech/twin_agent?sslmode=require"
    masked = mask_database_url(raw_url)

    assert "SuperSecretPassword123" not in masked
    assert "neon_user:****@" in masked
    assert "ep-sample-pool.us-east-2.aws.neon.tech" in masked


def test_mask_database_url_none_or_empty():
    """Empty or None URLs return a safe placeholder."""
    assert mask_database_url(None) == "<none>"
    assert mask_database_url("") == "<none>"


@pytest.mark.asyncio
async def test_neon_connection_unconfigured_handling():
    """When NEON_DATABASE_URL is not set, check_neon_connection returns unconfigured cleanly."""
    result = await check_neon_connection(database_url="")
    assert result["status"] == "unconfigured"
    assert result["database"] == "neon_postgresql"


@pytest.mark.asyncio
async def test_neon_connection_invalid_credentials_fails_cleanly_and_redacts():
    """Invalid credentials fail gracefully with sanitized error and no raw password leak."""
    fake_url = "postgresql+asyncpg://fakeuser:SuperSecretPassword123@127.0.0.1:59999/nonexistent_db"
    result = await check_neon_connection(database_url=fake_url)

    assert result["status"] == "error"
    assert result["database"] == "neon_postgresql"
    # Verify password is not in target or error message
    assert "SuperSecretPassword123" not in result["target"]
    assert "SuperSecretPassword123" not in result.get("error_message", "")


@pytest.mark.asyncio
async def test_sqlite_agent_connection_succeeds():
    """SQLite Agent database connection and SELECT 1 succeeds without touching tables."""
    result = await check_sqlite_connection()
    assert result["status"] == "connected"
    assert result["database"] == "sqlite_agent"
    assert result["result"] == 1


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    """Health endpoints for Neon and SQLite respond with status objects."""
    res_sqlite = await client.get("/api/v1/health/sqlite")
    assert res_sqlite.status_code == 200
    assert res_sqlite.json()["status"] == "connected"
    assert res_sqlite.json()["result"] == 1

    res_neon = await client.get("/api/v1/health/neon")
    assert res_neon.status_code == 200
    assert "status" in res_neon.json()
