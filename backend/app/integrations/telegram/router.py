"""
Telegram Integration — FastAPI Router
=======================================
Provides two endpoints:

  POST /api/v1/telegram/webhook
    ├── Called by Telegram Bot API on every incoming message.
    ├── Validates optional X-Telegram-Bot-Api-Secret-Token header.
    ├── Parses the Update, dispatches to TelegramIntegrationService.
    └── Always returns HTTP 200 so Telegram does not retry.

  GET /api/v1/telegram/setup-webhook
    ├── Convenience endpoint to register the webhook URL with Telegram.
    ├── Call once after deployment (e.g. after setting up ngrok or your domain).
    └── Requires ?webhook_url=https://your.domain/api/v1/telegram/webhook

  GET /api/v1/telegram/webhook-info
    └── Returns current webhook status from Telegram.

  GET /api/v1/telegram/health
    └── Sanity-check: confirms the bot token is configured and the bot is reachable.
"""
import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.integrations.telegram.schemas import (
    TelegramUpdate,
    WebhookAckResponse,
    WebhookSetupResponse,
)
from app.integrations.telegram.sender import TelegramSender, TelegramSenderError
from app.integrations.telegram.service import TelegramIntegrationService

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Dependency: validate optional webhook secret ───────────────────────────────

async def verify_telegram_secret(
    x_telegram_bot_api_secret_token: Optional[str] = Header(None),
) -> None:
    """
    If TELEGRAM_WEBHOOK_SECRET is configured, validate the incoming header.
    Rejects the request with 403 if the secret does not match.
    """
    expected = settings.TELEGRAM_WEBHOOK_SECRET
    if not expected:
        # No secret configured → accept all requests (useful for local dev).
        return
    if x_telegram_bot_api_secret_token != expected:
        logger.warning("Telegram webhook received with invalid secret token.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid webhook secret token.",
        )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/webhook",
    response_model=WebhookAckResponse,
    status_code=status.HTTP_200_OK,
    summary="Telegram Webhook Receiver",
    description=(
        "Receives Telegram Bot API Update objects. "
        "Always returns 200 OK so Telegram does not retry the delivery."
    ),
    dependencies=[Depends(verify_telegram_secret)],
)
async def telegram_webhook(
    update_data: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> WebhookAckResponse:
    """
    Main webhook endpoint called by Telegram on every incoming event.

    Processing is dispatched as a background task so that Telegram
    receives the 200 ACK immediately, well within its 60-second timeout.
    """
    try:
        update = TelegramUpdate.model_validate(update_data)
    except Exception as exc:
        # Log but still return 200 so Telegram does not retry.
        logger.error("Failed to parse Telegram Update: %s | raw=%s", exc, update_data)
        return WebhookAckResponse(status="parse_error")

    logger.info(
        "Telegram update received | update_id=%s chat_id=%s",
        update.update_id,
        update.effective_chat_id,
    )

    # Process in background — do not block the ACK response.
    background_tasks.add_task(_process_update, update, db)

    return WebhookAckResponse(status="ok")


@router.get(
    "/setup-webhook",
    response_model=WebhookSetupResponse,
    summary="Register Telegram Webhook",
    description=(
        "Convenience endpoint: registers your server URL as the Telegram webhook. "
        "Call once after deployment. Requires the webhook_url query parameter."
    ),
)
async def setup_webhook(
    webhook_url: str = Query(
        ...,
        description="Full HTTPS URL of your webhook endpoint, e.g. https://your.domain/api/v1/telegram/webhook",
        examples=["https://your.domain/api/v1/telegram/webhook"],
    ),
) -> WebhookSetupResponse:
    """
    Calls the Telegram Bot API to register the webhook.
    The TELEGRAM_WEBHOOK_SECRET (if set) is forwarded so Telegram includes it
    in every subsequent webhook request.
    """
    try:
        sender = TelegramSender()
    except TelegramSenderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    try:
        result = await sender.set_webhook(
            url=webhook_url,
            secret_token=settings.TELEGRAM_WEBHOOK_SECRET or None,
            allowed_updates=["message", "edited_message", "callback_query"],
            drop_pending_updates=True,
        )
    except TelegramSenderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Telegram API error: {exc}",
        ) from exc

    logger.info("Telegram webhook registered at %s", webhook_url)
    return WebhookSetupResponse(
        ok=True,
        telegram_response=result,
        webhook_url=webhook_url,
    )


@router.get(
    "/webhook-info",
    summary="Telegram Webhook Info",
    description="Returns the current webhook configuration as reported by the Telegram Bot API.",
)
async def webhook_info() -> dict:
    """Returns Telegram's current webhook status."""
    try:
        sender = TelegramSender()
        return await sender.get_webhook_info()
    except TelegramSenderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get(
    "/health",
    summary="Telegram Integration Health",
    description="Confirms the bot token is set and the bot is reachable via Telegram API.",
)
async def telegram_health() -> dict:
    """
    Lightweight health check. Returns bot info from Telegram.
    Does NOT expose the token — only the bot username and id.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        return {
            "status": "unconfigured",
            "detail": "TELEGRAM_BOT_TOKEN is not set in the environment.",
        }

    try:
        sender = TelegramSender()
        me = await sender.get_me()
        bot = me.get("result", {})
        return {
            "status": "ok",
            "bot_id": bot.get("id"),
            "bot_username": bot.get("username"),
            "bot_name": bot.get("first_name"),
        }
    except TelegramSenderError as exc:
        return {
            "status": "error",
            "detail": str(exc),
        }


# ── Background task helper ─────────────────────────────────────────────────────

async def _process_update(update: TelegramUpdate, db: AsyncSession) -> None:
    """
    Called by BackgroundTasks. Wraps the service call with exception guard
    so background errors don't surface as unhandled exceptions.
    """
    try:
        service = TelegramIntegrationService(session=db)
        await service.handle_update(update)
    except Exception as exc:
        logger.exception(
            "Unhandled error in background Telegram update processing: %s", exc
        )
