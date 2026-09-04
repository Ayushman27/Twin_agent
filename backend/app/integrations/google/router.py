"""
Gmail Integration HTTP Router — Twin Agent Platform
===================================================
Endpoints for initiating OAuth 2.0 flow, processing callback, checking connection status,
and disconnecting Gmail accounts.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_employee
from app.core.exceptions import BadRequestException
from app.db.session import get_neon_db
from app.modules.auth.schemas import CurrentUser
from app.integrations.google.service import GmailOAuthService

router = APIRouter()


@router.get(
    "/connect",
    summary="Initiate Gmail OAuth Connection",
    description="Generates a Google OAuth authorization URL for the authenticated employee.",
)
async def connect_gmail(
    redirect: bool = Query(True, description="If True, redirects directly to Google consent screen"),
    current_user: CurrentUser = Depends(require_employee),
):
    service = GmailOAuthService()
    auth_url = service.generate_auth_url(
        user_id=current_user.user_id,
        organization_id=current_user.organization_id,
        login_hint=current_user.email,
    )
    if redirect:
        return RedirectResponse(url=auth_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    return {"auth_url": auth_url}


@router.get(
    "/callback",
    summary="Google OAuth Callback Handler",
    description="Handles authorization code redirect from Google, stores encrypted tokens, and returns to frontend.",
)
async def google_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_neon_db),
):
    # If employee cancelled OAuth on Google consent screen
    if error:
        frontend_url = f"http://localhost:3001/integrations?error={error}"
        return RedirectResponse(url=frontend_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    if not code or not state:
        raise BadRequestException("Missing required OAuth parameters 'code' or 'state'.")

    service = GmailOAuthService()
    try:
        await service.handle_callback(code=code, state=state, db=db)
        frontend_url = "http://localhost:3001/integrations?success=gmail_connected"
        return RedirectResponse(url=frontend_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except Exception as exc:
        frontend_url = f"http://localhost:3001/integrations?error={str(exc)}"
        return RedirectResponse(url=frontend_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get(
    "/status",
    summary="Get Employee Gmail Connection Status",
    description="Returns whether the caller has connected their Gmail account, with email address.",
)
async def get_gmail_status(
    current_user: CurrentUser = Depends(require_employee),
    db: AsyncSession = Depends(get_neon_db),
):
    service = GmailOAuthService()
    return await service.get_status(
        user_id=current_user.user_id,
        organization_id=current_user.organization_id,
        db=db,
    )


@router.delete(
    "/disconnect",
    summary="Disconnect Gmail Account",
    description="Invalidates and deletes the stored Gmail authorization for the authenticated employee.",
)
async def disconnect_gmail(
    current_user: CurrentUser = Depends(require_employee),
    db: AsyncSession = Depends(get_neon_db),
):
    service = GmailOAuthService()
    disconnected = await service.disconnect(
        user_id=current_user.user_id,
        organization_id=current_user.organization_id,
        db=db,
    )
    return {
        "success": disconnected,
        "message": "Gmail account disconnected successfully." if disconnected else "No active Gmail connection found.",
    }
