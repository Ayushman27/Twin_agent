"""
Unit Tests for Phase 2 — Google OAuth & Gmail API Configuration
================================================================
"""
import pytest
from app.core.config import Settings
from app.integrations.google.config import (
    GMAIL_SEND_SCOPE,
    DEFAULT_GMAIL_SCOPES,
    GoogleOAuthConfig,
    get_google_oauth_config,
    is_google_oauth_configured,
)


def test_default_gmail_scope_least_privilege():
    """Verify that only gmail.send and identity scopes are requested by default (least privilege)."""
    assert GMAIL_SEND_SCOPE == "https://www.googleapis.com/auth/gmail.send"
    assert GMAIL_SEND_SCOPE in DEFAULT_GMAIL_SCOPES
    # Ensure sensitive full/modify scopes are not present by default
    assert "https://mail.google.com/" not in DEFAULT_GMAIL_SCOPES
    assert "https://www.googleapis.com/auth/gmail.modify" not in DEFAULT_GMAIL_SCOPES
    assert "https://www.googleapis.com/auth/gmail.readonly" not in DEFAULT_GMAIL_SCOPES


def test_google_oauth_config_unconfigured():
    """Verify behavior when environment variables are not yet set."""
    config = GoogleOAuthConfig(
        client_id=None,
        client_secret=None,
        redirect_uri="http://localhost:8000/api/v1/integrations/google/callback",
        scopes=DEFAULT_GMAIL_SCOPES,
    )
    assert config.is_configured is False
    pub = config.get_public_dict()
    assert pub["configured"] is False
    assert pub["client_id"] is None
    assert "client_secret" not in pub
    assert pub["scopes"] == DEFAULT_GMAIL_SCOPES

    with pytest.raises(ValueError, match="Google OAuth is not configured"):
        config.get_client_config()


def test_google_oauth_config_configured_and_security():
    """Verify configured flow dictionary and secret masking."""
    dummy_id = "123456789-dummy.apps.googleusercontent.com"
    dummy_secret = "GOCSPX-dummy_secret_value"
    redirect_uri = "http://localhost:8000/api/v1/integrations/google/callback"

    config = GoogleOAuthConfig(
        client_id=dummy_id,
        client_secret=dummy_secret,
        redirect_uri=redirect_uri,
        scopes=DEFAULT_GMAIL_SCOPES,
    )
    assert config.is_configured is True

    # Security check: Public dict MUST NEVER expose secret
    pub = config.get_public_dict()
    assert pub["configured"] is True
    assert pub["client_id"] == dummy_id
    assert pub["redirect_uri"] == redirect_uri
    assert "client_secret" not in pub

    # Client config check for Flow.from_client_config()
    client_cfg = config.get_client_config()
    assert "web" in client_cfg
    web = client_cfg["web"]
    assert web["client_id"] == dummy_id
    assert web["client_secret"] == dummy_secret
    assert web["redirect_uris"] == [redirect_uri]
    assert web["auth_uri"] == "https://accounts.google.com/o/oauth2/auth"
    assert web["token_uri"] == "https://oauth2.googleapis.com/token"


def test_settings_load_google_configuration(monkeypatch):
    """Verify Settings class loads Google OAuth environment variables correctly."""
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/google/callback")
    monkeypatch.setenv("GOOGLE_GMAIL_SCOPES", "https://www.googleapis.com/auth/gmail.send")

    s = Settings()
    assert s.GOOGLE_CLIENT_ID == "test-client-id.apps.googleusercontent.com"
    assert s.GOOGLE_CLIENT_SECRET == "test-client-secret"
    assert s.GOOGLE_REDIRECT_URI == "http://localhost:8000/api/v1/integrations/google/callback"
    assert s.GOOGLE_GMAIL_SCOPES == ["https://www.googleapis.com/auth/gmail.send"]
