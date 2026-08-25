"""
Telegram Integration — Top-Level Service
==========================================
TelegramIntegrationService is the single orchestrator called by the
FastAPI webhook router. It ties together:

  TelegramUpdate
      ↓
  TelegramMessageRouter   (identity + context)
      ↓
  TelegramSender          (send reply to Telegram)

Error handling strategy:
  - Sender failures are caught and logged; the webhook still returns 200 to
    Telegram to prevent it from retrying the same update in a tight loop.
  - All exceptions are surfaced via structured logging.
"""
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.telegram.context import TwinAgentContext
from app.integrations.telegram.message_router import TelegramMessageRouter
from app.integrations.telegram.schemas import TelegramUpdate
from app.integrations.telegram.sender import TelegramSender, TelegramSenderError

logger = logging.getLogger(__name__)


class TelegramIntegrationService:
    """
    Stateless service that processes one Telegram Update end-to-end.

    Instantiate per-request (inside the FastAPI dependency or route handler)
    so that the SQLAlchemy session is properly scoped.

    Example::

        service = TelegramIntegrationService(db_session)
        await service.handle_update(update)
    """

    def __init__(
        self,
        session: AsyncSession,
        twin_context: Optional[TwinAgentContext] = None,
        sender: Optional[TelegramSender] = None,
    ) -> None:
        self._router = TelegramMessageRouter(session, twin_context=twin_context)
        # Sender is lazily instantiated so that missing token only errors if
        # the bot actually needs to send a message (not during healthchecks).
        self._sender: Optional[TelegramSender] = sender

    async def handle_update(self, update: TelegramUpdate) -> None:
        """
        Process an incoming Telegram update and send the reply (if any).

        Never raises — errors are logged so Telegram receives 200 OK and
        does not retry the webhook call.
        """
        chat_id = update.effective_chat_id
        try:
            reply_text = await self._router.route(update)
        except Exception as exc:
            logger.exception(
                "Error routing Telegram update_id=%s: %s",
                update.update_id,
                exc,
            )
            return

        if reply_text is None or chat_id is None:
            # Router explicitly signalled: nothing to send.
            return

        await self._send_reply(chat_id, reply_text)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _send_reply(self, chat_id: int, text: str) -> None:
        """Send *text* to *chat_id*, swallowing sender errors gracefully."""
        try:
            sender = self._get_sender()
            await sender.send_message(chat_id=chat_id, text=text)
            logger.info(
                "Reply sent | chat_id=%s length=%d", chat_id, len(text)
            )
        except TelegramSenderError as exc:
            logger.error(
                "Failed to send reply to chat_id=%s: %s", chat_id, exc
            )
        except Exception as exc:
            logger.exception(
                "Unexpected error sending reply to chat_id=%s: %s", chat_id, exc
            )

    def _get_sender(self) -> TelegramSender:
        """Return the sender, initializing it on first use."""
        if self._sender is None:
            self._sender = TelegramSender()
        return self._sender
