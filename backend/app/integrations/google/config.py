"""
Google OAuth 2.0 and Gmail API Configuration
=============================================
Centralized settings, scopes, and OAuth helper utilities for per-employee Gmail authorization.
Adheres strictly to the principle of least privilege.
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.core.config import settings

# Principle of Least Privilege: Request gmail.send + userinfo.email (for account email display)
GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
USERINFO_EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email"
OPENID_SCOPE = "openid"

# Centralized scopes list
DEFAULT_GMAIL_SCOPES: List[str] = [
    GMAIL_SEND_SCOPE,
    USERINFO_EMAIL_SCOPE,
    OPENID_SCOPE,
]


@dataclass(frozen=True)
class GoogleOAuthConfig:
    """
    Centralized Google OAuth 2.0 configuration wrapper.
    """
    client_id: Optional[str]
    client_secret: Optional[str]
    redirect_uri: str
    scopes: List[str]

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.redirect_uri)

    def get_public_dict(self) -> Dict[str, Any]:
        """
        Returns public-safe metadata.
        NEVER exposes client_secret.
        """
        return {
            "configured": self.is_configured,
            "client_id": self.client_id if self.client_id else None,
            "redirect_uri": self.redirect_uri,
            "scopes": self.scopes,
        }

    def get_client_config(self) -> Dict[str, Any]:
        """
        Returns Google OAuth 2.0 Web Application client configuration
        compatible with google_auth_oauthlib.flow.Flow.from_client_config().
        """
        if not self.is_configured:
            raise ValueError("Google OAuth is not configured. Missing client_id or client_secret.")

        return {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "redirect_uris": [self.redirect_uri],
            }
        }


def get_google_oauth_config() -> GoogleOAuthConfig:
    """
    Retrieves the active Google OAuth configuration from central settings.
    """
    scopes = settings.GOOGLE_GMAIL_SCOPES
    if isinstance(scopes, str):
        scopes = [s.strip() for s in scopes.split(",") if s.strip()]

    return GoogleOAuthConfig(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        scopes=scopes or DEFAULT_GMAIL_SCOPES,
    )


def is_google_oauth_configured() -> bool:
    """Helper to check if Google OAuth is ready for authentication flow."""
    return get_google_oauth_config().is_configured
