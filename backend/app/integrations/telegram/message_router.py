"""
Telegram Integration — Message Router
=======================================
Orchestrates the full inbound message processing pipeline:

  TelegramUpdate
      ↓
  EmployeeIdentityResolver  (chat_id → user_id)
      ↓
  TwinAgentContext           (user context → reply text)
      ↓
  reply_text  (returned to TelegramIntegrationService for sending)

Special commands handled at this layer (before identity check):
  /start  — links the employee's Telegram account to their Twin Agent identity.
             A platform JWT or employee_id lookup is done via the linking strategy.
"""
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.telegram.context import TwinAgentContext, UserContext
from app.integrations.telegram.identity_resolver import EmployeeIdentityResolver
from app.integrations.telegram.schemas import TelegramUpdate

logger = logging.getLogger(__name__)

# ── Messages ──────────────────────────────────────────────────────────────────

_MSG_UNLINKED = (
    "👋 Welcome to *Twin Agent*!\n\n"
    "Your Telegram account is not yet linked to a platform identity.\n\n"
    "To link your account, visit your Twin Agent employee portal and go to:\n"
    "*Settings → Integrations → Telegram*\n\n"
    "You will receive a one-time link command to paste here."
)

_MSG_LINKED_OK = (
    "✅ Your Telegram account has been successfully linked to Twin Agent!\n\n"
    "You can now send messages and interact with your digital twin here."
)

_MSG_LINK_INVALID = (
    "❌ The link token is invalid or has expired.\n"
    "Please generate a new one from your employee portal."
)

_MSG_EMPTY = "🤔 I didn't catch that. Please send a text message."


class TelegramMessageRouter:
    """
    Routes a TelegramUpdate through identity resolution and context processing.

    Returns a reply string (or None if the update should be silently ignored).
    """

    def __init__(
        self,
        session: AsyncSession,
        twin_context: Optional[TwinAgentContext] = None,
    ) -> None:
        self._resolver = EmployeeIdentityResolver(session)
        self._context = twin_context or TwinAgentContext()

    async def route(self, update: TelegramUpdate) -> Optional[str]:
        """
        Process an incoming Telegram Update.
        Returns the reply text to send back, or None to send nothing.
        """
        msg = update.effective_message
        chat_id = update.effective_chat_id
        text = (update.effective_text or "").strip()
        sender = update.effective_sender

        if chat_id is None:
            logger.warning("Update %s has no resolvable chat_id — skipped.", update.update_id)
            return None

        logger.debug(
            "Routing update_id=%s chat_id=%s text=%r",
            update.update_id,
            chat_id,
            text[:80],
        )

        # ── /start command ────────────────────────────────────────────────────
        if text.startswith("/start"):
            return await self._handle_start(chat_id, text, sender)

        # ── Empty message guard ────────────────────────────────────────────────
        if not text:
            return _MSG_EMPTY

        # ── Identity resolution ────────────────────────────────────────────────
        user_id = await self._resolver.resolve(chat_id)
        if user_id is None:
            return _MSG_UNLINKED

        # ── Build user context ─────────────────────────────────────────────────
        user_ctx = UserContext(
            user_id=user_id,
            telegram_chat_id=chat_id,
            telegram_username=sender.username if sender else None,
            telegram_first_name=sender.first_name if sender else None,
        )

        # ── Process via TwinAgentContext (SLM stub) ────────────────────────────
        return await self._context.process(user_ctx, text)

    # ── Command handlers ──────────────────────────────────────────────────────

    async def _handle_start(
        self,
        chat_id: int,
        text: str,
        sender,
    ) -> str:
        """
        Handle the /start command.

        /start          → show welcome / registration prompt
        /start <token>  → link the account using a one-time token

        Token-based linking flow (future):
          The employee portal generates a signed JWT or random token,
          stores it temporarily (Redis / DB), and the employee pastes:
              /start eyJhbGci...
          The token is validated here, user_id is extracted, and
          EmployeeIdentityResolver.link() is called.

        Currently: token validation is a TODO stub that accepts any non-empty
        token as "valid" for demonstration. Replace _validate_link_token() with
        real logic.
        """
        parts = text.split(maxsplit=1)
        token = parts[1].strip() if len(parts) > 1 else None

        if token:
            # ── Token-based linking ────────────────────────────────────────
            user_id = await self._validate_link_token(token)
            if user_id is None:
                return _MSG_LINK_INVALID

            await self._resolver.link(
                chat_id=chat_id,
                user_id=user_id,
                username=getattr(sender, "username", None),
                first_name=getattr(sender, "first_name", None),
            )
            return _MSG_LINKED_OK

        # ── No token — check if already linked ────────────────────────────
        existing_user_id = await self._resolver.resolve(chat_id)
        if existing_user_id:
            return (
                f"✅ Your account is already linked to Twin Agent.\n\n"
                f"Send /help to see available commands."
            )

        return _MSG_UNLINKED

    @staticmethod
    async def _validate_link_token(token: str):
        """
        Validate a one-time link token and return the associated user_id.

        TODO: Replace with real implementation:
          1. Look up the token in Redis (or a tokens table).
          2. Verify expiry and single-use.
          3. Return the associated user_id, then delete the token.

        Returns None if invalid / expired.
        """
        # STUB: Tokens of the form "uid:<user_uuid>" are accepted for testing.
        if token.startswith("uid:"):
            return token[4:].strip() or None
        return None
