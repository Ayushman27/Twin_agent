"""
Communication Service — Twin Agent Platform
=============================================
Centralized communication engine for sending messages to employees
over Telegram and WebSockets with identity resolution & status tracking.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.message import Message
from app.integrations.telegram.models import TelegramIdentity
from app.integrations.telegram.sender import TelegramSender, TelegramSenderError
from app.modules.auth.models import User

logger = logging.getLogger(__name__)


def _convo_key(a: str, b: str) -> str:
    """Stable key for a conversation between two users."""
    return "|".join(sorted([a, b]))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class CommunicationService:
    """
    Service layer providing unified messaging, recipient resolution,
    and Telegram dispatch for Voice Agent and Messaging UI.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db = session

    async def resolve_recipient(
        self, recipient_identifier: str, sender_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resolves a recipient string (name, user_id, email, or username)
        to a platform User and their linked Telegram identity.

        Returns:
          {
            "success": True,
            "user_id": "...",
            "user_name": "...",
            "chat_id": 12345678
          }
          OR
          {
            "success": False,
            "error_code": "RECIPIENT_NOT_FOUND" | "AMBIGUOUS_RECIPIENT" | "TELEGRAM_NOT_CONNECTED",
            "message": "..."
          }
        """
        clean = (recipient_identifier or "").strip()
        if not clean:
            return {
                "success": False,
                "error_code": "RECIPIENT_NOT_FOUND",
                "message": "Recipient identifier is empty.",
            }

        # 1. Search Users table from Neon PostgreSQL / active identity session
        from app.db.postgres import get_neon_session_maker
        neon_maker = get_neon_session_maker()
        identity_session_factory = neon_maker if neon_maker is not None else lambda: self.db

        async with identity_session_factory() as id_session:
            stmt = select(User).where(
                or_(
                    User.id == clean,
                    User.email.ilike(clean),
                    User.name.ilike(f"%{clean}%"),
                )
            )
            res = await id_session.execute(stmt)
            users: List[User] = res.scalars().all()

            if not users:
                res_local = await self.db.execute(stmt)
                users = res_local.scalars().all()

            # If full name search yielded no match, fallback to first-name search (e.g. 'Shreyasi' from 'Shreyasi Panigrahi')
            if not users and " " in clean:
                first_name = clean.split()[0].strip()
                if len(first_name) >= 3:
                    stmt_fn = select(User).where(User.name.ilike(f"%{first_name}%"))
                    res_fn = await id_session.execute(stmt_fn)
                    users = res_fn.scalars().all()
                    if not users:
                        res_fn_local = await self.db.execute(stmt_fn)
                        users = res_fn_local.scalars().all()

            # If still no match, fallback to prefix search (e.g. 'Shre' prefix)
            if not users and len(clean) >= 3:
                prefix = clean[:4] if len(clean) >= 4 else clean
                stmt_pref = select(User).where(User.name.ilike(f"%{prefix}%"))
                res_pref = await id_session.execute(stmt_pref)
                users = res_pref.scalars().all()
                if not users:
                    res_pref_local = await self.db.execute(stmt_pref)
                    users = res_pref_local.scalars().all()

            # If no direct user match in DB, check TelegramIdentity by username or chat_id
            if not users:
                stmt_tg = select(TelegramIdentity).where(
                    or_(
                        TelegramIdentity.telegram_username.ilike(clean.lstrip("@")),
                        TelegramIdentity.user_id == clean,
                    )
                )
                res_tg = await self.db.execute(stmt_tg)
                tg_identities = res_tg.scalars().all()
                if tg_identities:
                    # Find user for this identity
                    user_id = tg_identities[0].user_id
                    user_res = await id_session.execute(select(User).where(User.id == user_id))
                    u = user_res.scalar_one_or_none()
                    if u:
                        users = [u]

            # Deduplicate users by unique ID
            unique_users = {}
            for u in users:
                if u.id not in unique_users:
                    unique_users[u.id] = u
            users = list(unique_users.values())

        if not users:
            # Fallback: Check if the clean string itself is an active demo/peer user_id string
            # e.g. "employee-demo" or "employee-xyz" or "Rahul"
            # If so, create a virtual lookup attempt
            return {
                "success": False,
                "error_code": "RECIPIENT_NOT_FOUND",
                "message": f"No employee found matching '{clean}'.",
            }

        if len(users) > 1 and sender_id:
            # 1. Filter out sender if sender matches clean name search
            other_users = [u for u in users if u.id != sender_id]
            if len(other_users) == 1:
                users = other_users

        if len(users) > 1:
            # 2. Prefer user with linked Telegram identity
            stmt_linked = select(TelegramIdentity.user_id).where(
                TelegramIdentity.user_id.in_([u.id for u in users])
            )
            res_linked = await self.db.execute(stmt_linked)
            linked_ids = set(res_linked.scalars().all())
            linked_users = [u for u in users if u.id in linked_ids]
            if len(linked_users) == 1:
                users = linked_users

        if len(users) > 1:
            names = ", ".join([u.name for u in users[:3]])
            return {
                "success": False,
                "error_code": "AMBIGUOUS_RECIPIENT",
                "message": f"Found multiple employees matching '{clean}': {names}. Which one do you mean?",
                "matches": [{"user_id": u.id, "name": u.name} for u in users],
            }

        target_user = users[0]

        # 2. Check Telegram connection for target_user
        stmt_link = select(TelegramIdentity).where(
            TelegramIdentity.user_id == target_user.id
        )
        res_link = await self.db.execute(stmt_link)
        tg_identity = res_link.scalar_one_or_none()

        if not tg_identity:
            # Check if there is a TelegramIdentity matching target_user's name or email if user.id is string
            stmt_alt = select(TelegramIdentity).where(
                or_(
                    TelegramIdentity.telegram_first_name.ilike(f"%{target_user.name}%"),
                    TelegramIdentity.telegram_username.ilike(target_user.name.replace(" ", "")),
                )
            )
            res_alt = await self.db.execute(stmt_alt)
            tg_identity = res_alt.scalar_one_or_none()

        if not tg_identity:
            # Check if there is a TelegramIdentity matching target_user's name or email if user.id is string
            stmt_alt = select(TelegramIdentity).where(
                or_(
                    TelegramIdentity.telegram_first_name.ilike(f"%{target_user.name}%"),
                    TelegramIdentity.telegram_username.ilike(target_user.name.replace(" ", "")),
                )
            )
            res_alt = await self.db.execute(stmt_alt)
            tg_identity = res_alt.scalar_one_or_none()

        return {
            "success": True,
            "user_id": target_user.id,
            "user_name": target_user.name,
            "chat_id": tg_identity.telegram_chat_id if tg_identity else None,
            "telegram_connected": tg_identity is not None,
        }

    async def send_message(
        self,
        sender_id: str,
        recipient_identifier: str,
        content: str,
        channel: str = "telegram",
        sender_name: Optional[str] = None,
        message_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends a message to recipient over Telegram & records it in the database.
        Always broadcasts to platform WebSockets and saves in database.
        """
        # Resolve recipient
        res = await self.resolve_recipient(recipient_identifier, sender_id=sender_id)
        if not res["success"]:
            return res

        target_user_id = res["user_id"]
        target_name = res["user_name"]
        chat_id = res.get("chat_id")
        telegram_connected = res.get("telegram_connected", False)
        convo_id = _convo_key(sender_id, target_user_id)

        # 1. Create SENT Message record in DB
        msg = Message(
            id=message_id or str(uuid.uuid4()),
            conversation_id=convo_id,
            sender_id=sender_id,
            receiver_id=target_user_id,
            channel="telegram" if (telegram_connected and chat_id) else "websocket",
            content=content,
            chat_id=chat_id,
            status="SENT",
        )
        self.db.add(msg)
        await self.db.commit()

        # 2. Broadcast real-time event to connected WebSockets & in-memory history
        await self._broadcast_to_websockets(
            msg_id=msg.id,
            sender_id=sender_id,
            sender_name=sender_name or sender_id,
            receiver_id=target_user_id,
            text=content,
        )

        # 3. Dispatch to Telegram API if connected
        telegram_sent = False
        if telegram_connected and chat_id:
            try:
                sender = TelegramSender()
                formatted_text = f"💬 *Message from {sender_name or sender_id}*:\n\n{content}"
                tg_res = await sender.send_message(chat_id=chat_id, text=formatted_text)
                tg_msg_id = str(tg_res.get("result", {}).get("message_id", ""))
                msg.telegram_message_id = tg_msg_id
                await self.db.commit()
                telegram_sent = True
                logger.info("Message %s sent via Telegram to %s (chat_id=%s)", msg.id, target_name, chat_id)
            except Exception as exc:
                logger.warning("Telegram dispatch error for chat_id=%s: %s", chat_id, exc)

        return {
            "success": True,
            "message_id": msg.id,
            "recipient": target_name,
            "status": "SENT",
            "channel": "telegram" if telegram_sent else "websocket",
            "telegram_sent": telegram_sent,
            "websocket_delivered": True,
        }

    @staticmethod
    async def _broadcast_to_websockets(
        msg_id: str,
        sender_id: str,
        sender_name: str,
        receiver_id: str,
        text: str,
    ) -> None:
        """Broadcast message event to active frontend WebSockets."""
        try:
            from app.api.v1.endpoints.messaging import broadcast_message_event, _history, _convo_key
            payload = {
                "type": "message",
                "id": msg_id,
                "from": sender_id,
                "from_name": sender_name,
                "to": receiver_id,
                "text": text,
                "timestamp": _now_iso(),
            }
            key = _convo_key(sender_id, receiver_id)
            _history[key].append(payload)

            await broadcast_message_event(payload)
        except Exception as exc:
            logger.warning("Failed broadcasting WebSocket event: %s", exc)
