"""
Telegram Polling Runner — Twin Agent Platform
==============================================
Runs Telegram long-polling in the background when a webhook URL is NOT configured.
This is the recommended mode for LOCAL DEVELOPMENT — no ngrok or public URL needed.

Telegram sends updates directly to this process via getUpdates (long-polling).
Each update is processed by TelegramIntegrationService exactly as the webhook would.

Usage:
  Run as a standalone script:
      python -m app.integrations.telegram.polling

  Or import and start programmatically:
      from app.integrations.telegram.polling import start_polling
      asyncio.create_task(start_polling())

The polling loop:
  - Calls getUpdates with timeout=30 (long-poll, Telegram holds the connection)
  - Tracks offset to avoid reprocessing the same update
  - Reconnects automatically on network errors
  - Stops cleanly on KeyboardInterrupt or when the stop_event is set
"""
import asyncio
import json
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_TELEGRAM_API_BASE = "https://api.telegram.org"
_stop_event: Optional[asyncio.Event] = None


async def start_polling(token: str, poll_timeout: int = 30) -> None:
    """
    Long-poll Telegram for updates and dispatch each one through
    TelegramIntegrationService (same pipeline as the webhook endpoint).

    This coroutine runs indefinitely. Cancel it or set the stop_event to stop.
    """
    global _stop_event
    _stop_event = asyncio.Event()

    from app.core.database import AsyncSessionLocal
    from app.integrations.telegram.schemas import TelegramUpdate
    from app.integrations.telegram.service import TelegramIntegrationService

    offset = 0
    logger.info("Telegram polling started — bot token configured ✅")
    logger.info("Tip: Send /start to your bot in Telegram to link your account.")

    async with httpx.AsyncClient(timeout=poll_timeout + 5) as client:
        while not _stop_event.is_set():
            try:
                url = f"{_TELEGRAM_API_BASE}/bot{token}/getUpdates"
                params = {
                    "timeout": poll_timeout,
                    "offset": offset,
                    "allowed_updates": json.dumps(
                        ["message", "edited_message", "callback_query"]
                    ),
                }
                resp = await client.get(url, params=params)
                data = resp.json()

                if not data.get("ok"):
                    err_code = data.get("error_code", 0)
                    description = data.get("description", "")
                    if err_code == 409 or "Conflict" in description:
                        # Another getUpdates session is active (e.g. old reloaded process).
                        # Wait for it to expire (Telegram long-poll default is 30 s).
                        logger.warning(
                            "getUpdates Conflict — another instance is running. "
                            "Retrying in 35s..."
                        )
                        await asyncio.sleep(35)
                    else:
                        logger.warning(
                            "getUpdates returned non-ok: %s", description
                        )
                        await asyncio.sleep(5)
                    continue

                updates = data.get("result", [])
                for raw_update in updates:
                    update_id = raw_update.get("update_id", 0)
                    offset = update_id + 1  # advance offset so we don't replay

                    try:
                        update = TelegramUpdate.model_validate(raw_update)
                    except Exception as exc:
                        logger.warning(
                            "Failed to parse update_id=%s: %s", update_id, exc
                        )
                        continue

                    logger.info(
                        "Polling update_id=%s chat_id=%s text=%r",
                        update.update_id,
                        update.effective_chat_id,
                        (update.effective_text or "")[:60],
                    )

                    # Process through the same pipeline as the webhook
                    async with AsyncSessionLocal() as session:
                        service = TelegramIntegrationService(session=session)
                        await service.handle_update(update)

            except asyncio.CancelledError:
                logger.info("Telegram polling cancelled.")
                break
            except httpx.ReadTimeout:
                # Normal — Telegram held the connection for poll_timeout with no updates
                continue
            except Exception as exc:
                logger.exception("Polling error: %s — retrying in 5s", exc)
                await asyncio.sleep(5)

    logger.info("Telegram polling stopped.")


def stop_polling() -> None:
    """Signal the polling loop to stop gracefully."""
    global _stop_event
    if _stop_event:
        _stop_event.set()


# ── Standalone entry point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    import os

    # Allow running as: python -m app.integrations.telegram.polling
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))

    from app.core.config import settings

    tok = settings.TELEGRAM_BOT_TOKEN
    if not tok:
        print("ERROR: TELEGRAM_BOT_TOKEN is not set in .env")
        sys.exit(1)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    print(f"Starting Telegram polling for token {tok[:10]}...")

    try:
        asyncio.run(start_polling(tok))
    except KeyboardInterrupt:
        print("Polling stopped by user.")
