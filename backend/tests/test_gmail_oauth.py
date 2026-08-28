"""
Automated Test Suite for Phase 3 — Per-Employee Gmail OAuth Connection
======================================================================
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.encryption import (
    create_oauth_state,
    decrypt_token,
    encrypt_token,
    verify_oauth_state,
)
from app.core.security import create_access_token, hash_password
from app.db.models.gmail_connection import GmailConnection
from app.modules.auth.models import User, UserRole
from app.modules.organizations.models import MemberStatus, Organization, OrganizationMember, OrgStatus


@pytest.fixture(autouse=True)
def setup_google_settings(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "mock-client-secret-12345")
    monkeypatch.setattr(settings, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/google/callback")


@pytest.mark.asyncio
async def test_token_encryption_and_decryption():
    """Verify AES/Fernet token encryption round-trip."""
    raw_token = "ya29.a0AfH6SMD_MockAccessTokenWithSpecialChars!@#$%^&*()"
    encrypted = encrypt_token(raw_token)
    assert encrypted != raw_token
    assert len(encrypted) > 20

    decrypted = decrypt_token(encrypted)
    assert decrypted == raw_token


@pytest.mark.asyncio
async def test_oauth_state_signing_and_tamper_proofing():
    """Verify signed state token creation, claim recovery, and tampering rejection."""
    state = create_oauth_state(user_id="user_123", organization_id="org_456")
    claims = verify_oauth_state(state)
    assert claims["sub"] == "user_123"
    assert claims["org_id"] == "org_456"
    assert claims["type"] == "gmail_oauth_state"
    assert "nonce" in claims

    # Tampered state must be rejected
    tampered = state[:-4] + "abcd"
    with pytest.raises(Exception):
        verify_oauth_state(tampered)

    # Expired state must be rejected
    expired_state = create_oauth_state(user_id="user_123", organization_id="org_456", expiry_minutes=-5)
    with pytest.raises(Exception):
        verify_oauth_state(expired_state)


@pytest.mark.asyncio
async def test_gmail_oauth_full_lifecycle_and_isolation(client: AsyncClient, db_session: AsyncSession):
    # ── 1. Seed Organizations and Employees ───────────────────────────────────
    org_a = Organization(
        company_name="Acme Corporation",
        company_email="contact@acme.ai",
        status=OrgStatus.ACTIVE,
    )
    org_b = Organization(
        company_name="Beta Corporation",
        company_email="contact@beta.ai",
        status=OrgStatus.ACTIVE,
    )
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    emp_a1 = User(
        name="Alice Engineer",
        email="alice@acme.ai",
        password_hash=hash_password("SecurePass1!"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    emp_a2 = User(
        name="Bob Manager",
        email="bob@acme.ai",
        password_hash=hash_password("SecurePass2!"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    emp_b1 = User(
        name="Charlie Foreign",
        email="charlie@beta.ai",
        password_hash=hash_password("SecurePass3!"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db_session.add_all([emp_a1, emp_a2, emp_b1])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org_a.id, user_id=emp_a1.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org_a.id, user_id=emp_a2.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org_b.id, user_id=emp_b1.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])
    await db_session.commit()

    token_a1 = create_access_token(emp_a1.id)
    token_a2 = create_access_token(emp_a2.id)
    token_b1 = create_access_token(emp_b1.id)

    headers_a1 = {"Authorization": f"Bearer {token_a1}"}
    headers_a2 = {"Authorization": f"Bearer {token_a2}"}
    headers_b1 = {"Authorization": f"Bearer {token_b1}"}

    # ── 2. Initial Status: NOT_CONNECTED ──────────────────────────────────────
    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a1)
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is False
    assert data["status"] == "NOT_CONNECTED"
    assert data["email"] is None

    # ── 3. Connect Initiation ─────────────────────────────────────────────────
    res = await client.get("/api/v1/integrations/gmail/connect?redirect=false", headers=headers_a1)
    assert res.status_code == 200
    auth_data = res.json()
    assert "auth_url" in auth_data
    assert "accounts.google.com/o/oauth2/auth" in auth_data["auth_url"]
    assert "scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send" in auth_data["auth_url"]
    assert "state=" in auth_data["auth_url"]

    # ── 4. Cancel OAuth Handling ──────────────────────────────────────────────
    res = await client.get("/api/v1/integrations/gmail/callback?error=access_denied", follow_redirects=False)
    assert res.status_code == 307
    assert "http://localhost:3001/integrations?error=access_denied" in res.headers["location"]

    # ── 5. Invalid / Tampered State Rejection ─────────────────────────────────
    res = await client.get(
        "/api/v1/integrations/gmail/callback?code=mock_code&state=invalid_tampered_state",
        follow_redirects=False,
    )
    assert res.status_code == 307
    assert "error=" in res.headers["location"]

    # ── 6. Successful OAuth Callback (Alice) ──────────────────────────────────
    valid_state_a1 = create_oauth_state(user_id=emp_a1.id, organization_id=org_a.id)

    mock_credentials = MagicMock()
    mock_credentials.token = "mock_google_access_token_alice"
    mock_credentials.refresh_token = "mock_google_refresh_token_alice"
    mock_credentials.expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    mock_credentials.scopes = ["https://www.googleapis.com/auth/gmail.send"]
    mock_credentials.id_token = {"email": "alice.google@gmail.com"}

    with patch("google_auth_oauthlib.flow.Flow.from_client_config") as mock_flow_cls:
        mock_flow = MagicMock()
        mock_flow.credentials = mock_credentials
        mock_flow_cls.return_value = mock_flow

        res = await client.get(
            f"/api/v1/integrations/gmail/callback?code=valid_google_code&state={valid_state_a1}",
            follow_redirects=False,
        )
        assert res.status_code == 307
        assert "success=gmail_connected" in res.headers["location"]

    # ── 7. Verify Alice's Connection & Security ───────────────────────────────
    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a1)
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert data["email"] == "alice.google@gmail.com"
    assert data["status"] == "CONNECTED"
    # SECURITY: Ensure tokens are NEVER leaked in API responses
    assert "access_token" not in data
    assert "refresh_token" not in data
    assert "client_secret" not in data

    # Verify tokens are encrypted in Database
    stmt = select(GmailConnection).where(GmailConnection.employee_id == emp_a1.id)
    db_res = await db_session.execute(stmt)
    conn_rec = db_res.scalar_one()
    assert conn_rec.encrypted_access_token != "mock_google_access_token_alice"
    assert decrypt_token(conn_rec.encrypted_access_token) == "mock_google_access_token_alice"
    assert decrypt_token(conn_rec.encrypted_refresh_token) == "mock_google_refresh_token_alice"

    # ── 8. Multiple Employees Isolation (Bob is not connected) ────────────────
    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a2)
    assert res.status_code == 200
    assert res.json()["connected"] is False

    # Connect Bob with separate account
    valid_state_a2 = create_oauth_state(user_id=emp_a2.id, organization_id=org_a.id)
    mock_credentials_bob = MagicMock()
    mock_credentials_bob.token = "mock_google_access_token_bob"
    mock_credentials_bob.refresh_token = "mock_google_refresh_token_bob"
    mock_credentials_bob.expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    mock_credentials_bob.scopes = ["https://www.googleapis.com/auth/gmail.send"]
    mock_credentials_bob.id_token = {"email": "bob.google@gmail.com"}

    with patch("google_auth_oauthlib.flow.Flow.from_client_config") as mock_flow_cls:
        mock_flow = MagicMock()
        mock_flow.credentials = mock_credentials_bob
        mock_flow_cls.return_value = mock_flow

        res = await client.get(
            f"/api/v1/integrations/gmail/callback?code=valid_code_bob&state={valid_state_a2}",
            follow_redirects=False,
        )
        assert res.status_code == 307

    # Verify Bob is connected with Bob's email, and Alice's remains unchanged
    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a2)
    assert res.json()["email"] == "bob.google@gmail.com"

    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a1)
    assert res.json()["email"] == "alice.google@gmail.com"

    # ── 9. Disconnect Gmail ───────────────────────────────────────────────────
    res = await client.delete("/api/v1/integrations/gmail/disconnect", headers=headers_a1)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Alice status is now NOT_CONNECTED
    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a1)
    assert res.json()["connected"] is False

    # Bob remains connected
    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a2)
    assert res.json()["connected"] is True

    # ── 10. Reconnect Gmail (Alice reconnects with new token) ──────────────────
    mock_credentials_alice_reconnect = MagicMock()
    mock_credentials_alice_reconnect.token = "new_token_alice"
    mock_credentials_alice_reconnect.refresh_token = "new_refresh_alice"
    mock_credentials_alice_reconnect.expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    mock_credentials_alice_reconnect.scopes = ["https://www.googleapis.com/auth/gmail.send"]
    mock_credentials_alice_reconnect.id_token = {"email": "alice.reconnected@gmail.com"}

    with patch("google_auth_oauthlib.flow.Flow.from_client_config") as mock_flow_cls:
        mock_flow = MagicMock()
        mock_flow.credentials = mock_credentials_alice_reconnect
        mock_flow_cls.return_value = mock_flow

        res = await client.get(
            f"/api/v1/integrations/gmail/callback?code=reconnect_code&state={valid_state_a1}",
            follow_redirects=False,
        )
        assert res.status_code == 307

    res = await client.get("/api/v1/integrations/gmail/status", headers=headers_a1)
    assert res.json()["connected"] is True
    assert res.json()["email"] == "alice.reconnected@gmail.com"
