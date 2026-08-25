"""
Telegram Integration — Message Sender
=======================================
Thin async wrapper around the Telegram Bot API sendMessage endpoint.
Uses httpx for all HTTP calls. No polling; webhook-only architecture.

Token is read exclusively from settings (environment variable).
It is never logged or exposed in responses.
"""
import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramSenderError(Exception):
    """Raised when the Telegram API returns a non-ok response."""


class TelegramSender:
    """
    Sends messages and performs Bot API administrative calls.

    Usage::

        sender = TelegramSender()
        await sender.send_message(chat_id=123456, text="Hello!")
    """

    def __init__(self, bot_token: Optional[str] = None) -> None:
        # Token sourced from settings; accept override for testing.
        self._token = bot_token or settings.TELEGRAM_BOT_TOKEN
        if not self._token:
            raise TelegramSenderError(
                "TELEGRAM_BOT_TOKEN is not configured. "
                "Set it in your .env file."
            )

    # ── Public API ─────────────────────────────────────────────────────────────

    async def send_message(
        self,
        chat_id: int,
        text: str,
        parse_mode: str = "Markdown",
        disable_web_page_preview: bool = True,
    ) -> Dict[str, Any]:
        """
        Send a text message to *chat_id*.
        Returns the raw Telegram API response dict.
        """
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview,
        }
        return await self._post("sendMessage", payload)

    async def set_webhook(
        self,
        url: str,
        secret_token: Optional[str] = None,
        allowed_updates: Optional[list] = None,
        drop_pending_updates: bool = False,
    ) -> Dict[str, Any]:
        """
        Register a webhook URL with the Telegram Bot API.
        Call this once after deployment to point Telegram at your server.
        """
        payload: Dict[str, Any] = {
            "url": url,
            "drop_pending_updates": drop_pending_updates,
        }
        if secret_token:
            payload["secret_token"] = secret_token
        if allowed_updates is not None:
            payload["allowed_updates"] = allowed_updates
        return await self._post("setWebhook", payload)

    async def delete_webhook(self) -> Dict[str, Any]:
        """Remove the registered webhook (switches bot to polling mode)."""
        return await self._post("deleteWebhook", {})

    async def get_webhook_info(self) -> Dict[str, Any]:
        """Return current webhook configuration from Telegram."""
        return await self._get("getWebhookInfo")

    async def get_me(self) -> Dict[str, Any]:
        """Return basic bot information."""
        return await self._get("getMe")

    # ── Internal HTTP helpers ──────────────────────────────────────────────────

    def _bot_url(self, method: str) -> str:
        return f"{_TELEGRAM_API_BASE}/bot{self._token}/{method}"

    async def _post(self, method: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = self._bot_url(method)
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)

        data = resp.json()
        if not data.get("ok"):
            logger.error(
                "Telegram API error | method=%s status=%s description=%s",
                method,
                data.get("error_code"),
                data.get("description"),
            )
            raise TelegramSenderError(
                f"Telegram API error [{data.get('error_code')}]: "
                f"{data.get('description', 'Unknown error')}"
            )

        logger.debug("Telegram API ok | method=%s", method)
        return data

    async def _get(self, method: str) -> Dict[str, Any]:
        url = self._bot_url(method)
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)

        data = resp.json()
        if not data.get("ok"):
            raise TelegramSenderError(
                f"Telegram API error [{data.get('error_code')}]: "
                f"{data.get('description', 'Unknown error')}"
            )
        return data
