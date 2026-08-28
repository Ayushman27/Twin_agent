"""
Google Integration Package — Twin Agent Platform
=================================================
Centralized Google OAuth 2.0 and Gmail API integration.
"""
from app.integrations.google.config import (
    GMAIL_SEND_SCOPE,
    DEFAULT_GMAIL_SCOPES,
    GoogleOAuthConfig,
    get_google_oauth_config,
    is_google_oauth_configured,
)

__all__ = [
    "GMAIL_SEND_SCOPE",
    "DEFAULT_GMAIL_SCOPES",
    "GoogleOAuthConfig",
    "get_google_oauth_config",
    "is_google_oauth_configured",
]
