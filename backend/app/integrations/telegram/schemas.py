"""
Telegram Integration — Pydantic Schemas
=========================================
Typed representations of the Telegram Bot API Update object.
Only the fields actually used by this integration are declared;
extra fields from Telegram are silently ignored via model_config.
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TelegramUser(BaseModel):
    """Telegram User / Bot object (sender identity)."""

    model_config = ConfigDict(extra="ignore")

    id: int
    is_bot: bool = False
    first_name: str = ""
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None


class TelegramChat(BaseModel):
    """Telegram Chat object."""

    model_config = ConfigDict(extra="ignore")

    id: int
    type: str  # "private" | "group" | "supergroup" | "channel"
    title: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None


class TelegramMessage(BaseModel):
    """Telegram Message object (subset of fields)."""

    model_config = ConfigDict(extra="ignore")

    message_id: int
    from_: Optional[TelegramUser] = None
    chat: TelegramChat
    date: int  # Unix timestamp
    text: Optional[str] = None

    # Allow Telegram's 'from' field (reserved keyword in Python)
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):  # type: ignore[override]
        """Remap Telegram's 'from' key to 'from_' before validation."""
        if isinstance(obj, dict) and "from" in obj and "from_" not in obj:
            obj = {**obj, "from_": obj.pop("from")}
        return super().model_validate(obj, *args, **kwargs)


class TelegramCallbackQuery(BaseModel):
    """Telegram CallbackQuery (inline button press)."""

    model_config = ConfigDict(extra="ignore")

    id: str
    from_: Optional[TelegramUser] = None
    data: Optional[str] = None
    message: Optional[TelegramMessage] = None

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):  # type: ignore[override]
        if isinstance(obj, dict) and "from" in obj and "from_" not in obj:
            obj = {**obj, "from_": obj.pop("from")}
        return super().model_validate(obj, *args, **kwargs)


class TelegramUpdate(BaseModel):
    """Top-level Telegram Update object sent to the webhook."""

    model_config = ConfigDict(extra="ignore")

    update_id: int
    message: Optional[TelegramMessage] = None
    edited_message: Optional[TelegramMessage] = None
    callback_query: Optional[TelegramCallbackQuery] = None

    @property
    def effective_message(self) -> Optional[TelegramMessage]:
        """Return whichever message variant is present."""
        return self.message or self.edited_message

    @property
    def effective_chat_id(self) -> Optional[int]:
        """Return the chat ID regardless of update type."""
        if self.effective_message:
            return self.effective_message.chat.id
        if self.callback_query and self.callback_query.message:
            return self.callback_query.message.chat.id
        return None

    @property
    def effective_text(self) -> Optional[str]:
        """Return message text or callback data."""
        if self.effective_message:
            return self.effective_message.text
        if self.callback_query:
            return self.callback_query.data
        return None

    @property
    def effective_sender(self) -> Optional[TelegramUser]:
        """Return the sender User object regardless of update type."""
        if self.effective_message:
            return self.effective_message.from_
        if self.callback_query:
            return self.callback_query.from_
        return None


# ── Response Schemas (used by the API layer) ──────────────────────────────────

class WebhookSetupResponse(BaseModel):
    """Response from the setup-webhook convenience endpoint."""

    ok: bool
    telegram_response: dict
    webhook_url: str


class WebhookAckResponse(BaseModel):
    """Minimal acknowledgment returned to Telegram after processing an update."""

    status: str = "ok"
