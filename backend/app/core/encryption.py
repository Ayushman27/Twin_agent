"""
Token Encryption and OAuth State Utilities
==========================================
Provides AES/Fernet symmetric encryption for OAuth tokens and cryptographically
signed, tamper-proof state tokens to prevent CSRF and state injection attacks.
"""
import base64
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt

from app.core.config import settings
from app.core.exceptions import BadRequestException, UnauthorizedException


def _get_fernet_key() -> bytes:
    """
    Derives a consistent 32-byte url-safe base64 key from JWT_SECRET_KEY.
    """
    key_hash = hashlib.sha256(settings.JWT_SECRET_KEY.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(key_hash)


def encrypt_token(token: Optional[str]) -> str:
    """
    Encrypts a token string with Fernet (AES-128-CBC + HMAC).
    Returns an empty string if token is None or empty.
    """
    if not token:
        return ""
    f = Fernet(_get_fernet_key())
    return f.encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(encrypted_token: Optional[str]) -> str:
    """
    Decrypts a Fernet-encrypted token string.
    Returns an empty string if encrypted_token is None or empty.
    """
    if not encrypted_token:
        return ""
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(encrypted_token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception) as exc:
        raise BadRequestException(f"Failed to decrypt OAuth token: {exc}")


def create_oauth_state(
    user_id: str,
    organization_id: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expiry_minutes: int = 15,
) -> str:
    """
    Generates a cryptographically signed, short-lived JWT state token
    binding user_id, organization_id, and a cryptographic nonce.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "org_id": organization_id,
        "type": "gmail_oauth_state",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "nonce": secrets.token_hex(16),
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_oauth_state(state: str) -> Dict[str, Any]:
    """
    Decodes and validates a signed OAuth state token.
    Enforces expiration, integrity, and token type.
    """
    if not state:
        raise BadRequestException("Missing OAuth state parameter.")

    try:
        payload = jwt.decode(
            state,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise BadRequestException(f"Invalid or expired OAuth state parameter: {exc}")

    if payload.get("type") != "gmail_oauth_state":
        raise BadRequestException("Invalid OAuth state token type.")

    if not payload.get("sub") or not payload.get("org_id"):
        raise BadRequestException("OAuth state is missing essential identity claims.")

    return payload
