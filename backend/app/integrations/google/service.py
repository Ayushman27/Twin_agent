"""
Gmail OAuth 2.0 Service — Twin Agent Platform
==============================================
Manages authorization initiation, code exchange, encrypted credential persistence,
connection status introspection, and disconnection.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import (
    create_oauth_state,
    decrypt_token,
    encrypt_token,
    verify_oauth_state,
)
from app.core.exceptions import BadRequestException, NotFoundException
from app.db.models.gmail_connection import GmailConnection
from app.integrations.google.config import get_google_oauth_config

logger = logging.getLogger(__name__)


class GmailOAuthService:
    """
    Service layer handling Google OAuth authorization and Gmail connection lifecycle.
    """

    def __init__(self) -> None:
        self.config = get_google_oauth_config()

    def generate_auth_url(
        self,
        user_id: str,
        organization_id: str,
        login_hint: Optional[str] = None,
    ) -> str:
        """
        Generates Google OAuth 2.0 authorization URL with cryptographically signed state.
        Enforces offline access and consent prompt to ensure refresh token is returned.
        Captures PKCE code_verifier and securely persists it within the HMAC-signed state.
        """
        if not self.config.is_configured:
            raise BadRequestException(
                "Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
            )

        flow = Flow.from_client_config(
            self.config.get_client_config(),
            scopes=self.config.scopes,
            redirect_uri=self.config.redirect_uri,
        )

        # Generate initial authorization URL to populate flow.code_verifier
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            login_hint=login_hint,
        )

        code_verifier = getattr(flow, "code_verifier", None)

        # Embed PKCE code_verifier inside the HMAC-SHA256 signed state
        state = create_oauth_state(
            user_id=user_id,
            organization_id=organization_id,
            extra_claims={"code_verifier": code_verifier} if code_verifier else None,
        )

        # Build final authorization URL with the signed state containing the code_verifier
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=state,
            login_hint=login_hint,
        )

        return auth_url

    async def handle_callback(
        self,
        code: str,
        state: str,
        db: AsyncSession,
    ) -> GmailConnection:
        """
        Validates state, exchanges authorization code for Google credentials,
        retrieves the Google account email, encrypts tokens, and stores/updates
        the employee's GmailConnection in Neon PostgreSQL.
        """
        # 1. Cryptographically verify state token (CSRF & identity integrity check)
        claims = verify_oauth_state(state)
        user_id = claims["sub"]
        org_id = claims["org_id"]
        code_verifier = claims.get("code_verifier")

        if not self.config.is_configured:
            raise BadRequestException("Google OAuth is not configured on this server.")

        # 2. Exchange authorization code for tokens
        flow = Flow.from_client_config(
            self.config.get_client_config(),
            scopes=self.config.scopes,
            redirect_uri=self.config.redirect_uri,
            state=state,
        )
        if code_verifier:
            flow.code_verifier = code_verifier

        try:
            flow.fetch_token(code=code, code_verifier=code_verifier)
        except Exception as exc:
            logger.error("Failed to fetch Google OAuth token: %s", exc)
            raise BadRequestException(f"Failed to complete Google OAuth code exchange: {exc}")

        credentials = flow.credentials
        access_token = credentials.token
        refresh_token = credentials.refresh_token
        token_expiry = credentials.expiry

        # 3. Retrieve authorized Google account email address
        account_email = None
        try:
            async with httpx.AsyncClient() as client:
                # 3a. Try Gmail Profile API (natively authorized with gmail.send scope)
                res_gmail = await client.get(
                    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
                    headers={"Authorization": f"Bearer {access_token}"},
                )
                if res_gmail.status_code == 200:
                    data_gmail = res_gmail.json()
                    account_email = data_gmail.get("emailAddress")

                # 3b. Fallback to userinfo if available
                if not account_email:
                    res = await client.get(
                        "https://www.googleapis.com/oauth2/v2/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"},
                    )
                    if res.status_code == 200:
                        data = res.json()
                        account_email = data.get("email")
        except Exception as exc:
            logger.warning("Could not fetch userinfo via Google API: %s", exc)

        if not account_email:
            # Fallback: check if id_token claims contain email
            if hasattr(credentials, "id_token") and credentials.id_token:
                if isinstance(credentials.id_token, dict):
                    account_email = credentials.id_token.get("email")
                elif isinstance(credentials.id_token, str):
                    try:
                        from jose import jwt as jose_jwt
                        unverified = jose_jwt.get_unverified_claims(credentials.id_token)
                        account_email = unverified.get("email")
                    except Exception:
                        pass

        if not account_email:
            from app.modules.auth.models import User
            r_user = await db.execute(select(User).where(User.id == user_id))
            u = r_user.scalar_one_or_none()
            if u and u.email:
                account_email = u.email

        if not account_email:
            account_email = f"user_{user_id[:8]}@gmail.com"

        # 4. Encrypt tokens before storing
        encrypted_access = encrypt_token(access_token)
        encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None

        # 5. Check if employee already has an existing connection (Single connection per employee rule)
        stmt = select(GmailConnection).where(
            and_(
                GmailConnection.organization_id == org_id,
                GmailConnection.employee_id == user_id,
            )
        )
        res = await db.execute(stmt)
        existing_conn = res.scalar_one_or_none()

        if existing_conn:
            existing_conn.google_account_email = account_email
            existing_conn.encrypted_access_token = encrypted_access
            if encrypted_refresh:
                existing_conn.encrypted_refresh_token = encrypted_refresh
            existing_conn.token_expiry = token_expiry
            existing_conn.scopes = list(credentials.scopes or self.config.scopes)
            existing_conn.status = "CONNECTED"
            conn = existing_conn
        else:
            conn = GmailConnection(
                organization_id=org_id,
                employee_id=user_id,
                google_account_email=account_email,
                encrypted_access_token=encrypted_access,
                encrypted_refresh_token=encrypted_refresh,
                token_expiry=token_expiry,
                scopes=list(credentials.scopes or self.config.scopes),
                status="CONNECTED",
            )
            db.add(conn)

        await db.commit()
        await db.refresh(conn)
        logger.info(
            "Successfully connected Gmail for employee %s in org %s (account: %s)",
            user_id,
            org_id,
            account_email,
        )
        return conn

    async def get_connection(
        self,
        user_id: str,
        organization_id: str,
        db: AsyncSession,
    ) -> Optional[GmailConnection]:
        """
        Internal method: Retrieves active Gmail connection ORM object.
        """
        stmt = select(GmailConnection).where(
            and_(
                GmailConnection.organization_id == organization_id,
                GmailConnection.employee_id == user_id,
                GmailConnection.status == "CONNECTED",
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    async def get_status(
        self,
        user_id: str,
        organization_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Public-safe status metadata.
        NEVER returns access_token, refresh_token, or client_secret.
        """
        conn = await self.get_connection(user_id=user_id, organization_id=organization_id, db=db)
        if not conn:
            return {
                "connected": False,
                "email": None,
                "status": "NOT_CONNECTED",
                "last_used_at": None,
            }

        return {
            "connected": True,
            "email": conn.google_account_email,
            "status": conn.status,
            "last_used_at": conn.last_used_at.isoformat() if conn.last_used_at else None,
            "scopes": conn.scopes,
        }

    async def disconnect(
        self,
        user_id: str,
        organization_id: str,
        db: AsyncSession,
    ) -> bool:
        """
        Disconnects and removes the employee's Gmail connection.
        """
        stmt = select(GmailConnection).where(
            and_(
                GmailConnection.organization_id == organization_id,
                GmailConnection.employee_id == user_id,
            )
        )
        res = await db.execute(stmt)
        conn = res.scalar_one_or_none()
        if not conn:
            return False

        await db.delete(conn)
        await db.commit()
        logger.info("Disconnected Gmail for employee %s in org %s", user_id, organization_id)
        return True
