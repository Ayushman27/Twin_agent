"""
Telegram Integration — Employee Identity Resolver
===================================================
Maps an incoming Telegram chat_id to a Twin Agent User record.

The resolver reads from the `telegram_identities` table in the SQLite
agent database. It does NOT touch Neon PostgreSQL or any existing module.

SLM hook point:
  Once the SLM/RAG layer is connected, pass the resolved user_id into the
  Human Twin context builder to load the employee's knowledge graph.
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.telegram.models import TelegramIdentity

logger = logging.getLogger(__name__)


class EmployeeIdentityResolver:
    """
    Resolves a Telegram chat_id to a Twin Agent user_id (UUID string).

    Usage::

        resolver = EmployeeIdentityResolver(db_session)
        user_id = await resolver.resolve(chat_id=123456789)
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Public API ────────────────────────────────────────────────────────────

    async def resolve(self, chat_id: int) -> Optional[str]:
        """
        Return the user_id linked to *chat_id*, or None if no link exists.
        """
        identity = await self._get_identity(chat_id)
        if identity is None:
            logger.debug("No TelegramIdentity found for chat_id=%s", chat_id)
            return None
        logger.debug(
            "Resolved chat_id=%s → user_id=%s", chat_id, identity.user_id
        )
        return identity.user_id

    async def link(
        self,
        *,
        chat_id: int,
        user_id: str,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
    ) -> TelegramIdentity:
        """
        Create or update the Telegram ↔ User link.

        Called when an employee sends /start to the bot.
        If the chat_id is already linked to a different user_id, it is
        re-linked (the employee may have re-authenticated).
        """
        identity = await self._get_identity(chat_id)
        if identity is None:
            identity = TelegramIdentity(
                user_id=user_id,
                telegram_chat_id=chat_id,
                telegram_username=username,
                telegram_first_name=first_name,
            )
            self._session.add(identity)
        else:
            identity.user_id = user_id
            identity.telegram_username = username
            identity.telegram_first_name = first_name

        await self._session.flush()
        logger.info(
            "Linked Telegram chat_id=%s → user_id=%s (username=%r)",
            chat_id,
            user_id,
            username,
        )
        return identity

    async def unlink(self, chat_id: int) -> bool:
        """
        Remove the Telegram ↔ User link for *chat_id*.
        Returns True if a link was removed, False if none existed.
        """
        identity = await self._get_identity(chat_id)
        if identity is None:
            return False
        await self._session.delete(identity)
        await self._session.flush()
        logger.info("Unlinked Telegram chat_id=%s", chat_id)
        return True

    async def get_identity(self, chat_id: int) -> Optional[TelegramIdentity]:
        """Expose the full TelegramIdentity row (for use by the router layer)."""
        return await self._get_identity(chat_id)

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _get_identity(self, chat_id: int) -> Optional[TelegramIdentity]:
        stmt = select(TelegramIdentity).where(
            TelegramIdentity.telegram_chat_id == chat_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
