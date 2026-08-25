"""
Telegram Integration — Twin Agent Context (SLM Stub)
======================================================
TwinAgentContext is the bridge between the Telegram channel and the
Twin Agent platform's intelligence layer (Human Twin → RAG → SLM → LLM).

Current state: STUB
  Returns a structured acknowledgment reply. All inputs are captured so
  that the SLM/RAG integration can be dropped in without changing the
  caller (TelegramMessageRouter).

SLM Integration hook:
  Replace or extend `_process_with_slm()` with your SLM/RAG call.
  The method signature and return contract (str reply text) must stay stable.
"""
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
    """
    Minimal resolved context about the sending employee.
    Passed to TwinAgentContext for intelligence processing.
    """

    user_id: str
    telegram_chat_id: int
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    # Extend with org_id, department, role, human-twin memory_id, etc.
    extra: Dict[str, Any] = field(default_factory=dict)


class TwinAgentContext:
    """
    Accepts a resolved UserContext and an incoming message text.
    Returns a reply string to send back to the employee via Telegram.

    Architecture note
    -----------------
    This class deliberately has no direct imports from the agentic /
    SLM / RAG subsystems. When those are ready, inject them via the
    constructor or replace `_process_with_slm()`.

    Example future wiring::

        context = TwinAgentContext(slm_client=your_slm, rag_client=your_rag)
        reply = await context.process(user_ctx, text)
    """

    def __init__(
        self,
        slm_client: Any = None,
        rag_client: Any = None,
    ) -> None:
        # SLM and RAG clients are optional — wired later when available.
        self._slm = slm_client
        self._rag = rag_client

    async def process(self, user_context: UserContext, text: str) -> str:
        """
        Main entry point. Returns a reply string.

        Flow (stubbed):
          1. Log the incoming context (for observability).
          2. Detect command intent (/start, /help, /status, etc.).
          3. Delegate to _process_with_slm() [currently returns stub reply].
        """
        logger.info(
            "TwinAgentContext.process | user_id=%s chat_id=%s text=%r",
            user_context.user_id,
            user_context.telegram_chat_id,
            text[:80] if text else "",
        )

        # ── Command routing (pre-SLM) ──────────────────────────────────────
        stripped = (text or "").strip()
        if stripped.startswith("/help"):
            return self._help_reply(user_context)
        if stripped.startswith("/status"):
            return self._status_reply(user_context)

        # ── SLM processing ─────────────────────────────────────────────────
        return await self._process_with_slm(user_context, stripped)

    # ── Internal handlers ─────────────────────────────────────────────────────

    async def _process_with_slm(
        self, user_context: UserContext, text: str
    ) -> str:
        """
        SLM/RAG integration hook — currently a stub.

        Replace this method body with your SLM call, e.g.:
            response = await self._slm.complete(
                user_id=user_context.user_id,
                messages=[{"role": "user", "content": text}],
            )
            return response.text
        """
        name = user_context.telegram_first_name or user_context.user_id[:8]
        return (
            f"✅ *Twin Agent* received your message, {name}.\n\n"
            f"📨 *You said:* {text}\n\n"
            f"🔗 Your Twin Agent identity is linked. "
            f"The SLM/RAG layer will be connected here in the next sprint."
        )

    @staticmethod
    def _help_reply(user_context: UserContext) -> str:
        name = user_context.telegram_first_name or "there"
        return (
            f"👋 Hi {name}! Here are the available commands:\n\n"
            f"/help   — Show this help message\n"
            f"/status — Check your Twin Agent link status\n\n"
            f"Just type any message to interact with your Twin Agent."
        )

    @staticmethod
    def _status_reply(user_context: UserContext) -> str:
        return (
            f"🟢 *Twin Agent Status*\n\n"
            f"User ID: `{user_context.user_id}`\n"
            f"Chat ID: `{user_context.telegram_chat_id}`\n"
            f"Channel: Telegram ✅\n"
            f"SLM: ⏳ Pending integration"
        )
