"""
Messaging WebSocket Endpoint — Twin Agent Platform
====================================================
Real-time bidirectional messaging between employees over WebSocket.

Architecture:
  - Each connected client registers with their user_id (from query param or token).
  - Messages are routed to the target recipient's active WebSocket connection.
  - If the recipient is offline, messages are stored in an in-memory queue
    (can be swapped for Redis pub/sub in production).
  - The Telegram integration layer can later hook into this same message bus.

Endpoints:
  WS  /api/v1/messaging/ws/{user_id}         — persistent connection per employee
  GET /api/v1/messaging/online                — list of currently online user IDs
  GET /api/v1/messaging/history/{peer_id}    — last N messages with a peer (in-memory)
"""
import json
import logging
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

logger = logging.getLogger(__name__)

router = APIRouter()

# ── In-memory connection registry ─────────────────────────────────────────────
# user_id → active WebSocket connection (one connection per user)
_connections: Dict[str, WebSocket] = {}

# In-memory message history: (user_a, user_b) sorted key → deque of messages
# In production replace with Redis Streams or a DB table.
_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))


def _convo_key(a: str, b: str) -> str:
    """Stable key for a conversation between two users."""
    return "|".join(sorted([a, b]))


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


async def broadcast_message_event(payload: dict) -> None:
    """
    Broadcast a message payload to active WebSocket connections of sender and receiver.
    Callable from external services (e.g. Telegram webhook, Voice Agent).
    """
    sender_id = payload.get("from")
    to_user = payload.get("to")
    payload_str = json.dumps(payload)

    target_uids = {uid for uid in [sender_id, to_user] if uid}
    for uid in target_uids:
        ws = _connections.get(uid)
        if ws:
            try:
                await ws.send_text(payload_str)
            except Exception as exc:
                logger.warning("Failed to push WS event to %s: %s", uid, exc)
                _connections.pop(uid, None)


async def _broadcast_presence(user_id: str, online: bool) -> None:
    """Notify all connected clients of a presence change."""
    payload = json.dumps({
        "type": "presence",
        "user_id": user_id,
        "online": online,
        "timestamp": _now_iso(),
    })
    dead = []
    sent_sockets = set()
    for uid, ws in list(_connections.items()):
        if ws in sent_sockets:
            continue
        sent_sockets.add(ws)
        if uid == user_id:
            continue
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(uid)
    for uid in dead:
        _connections.pop(uid, None)


# ── WebSocket endpoint ─────────────────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def messaging_ws(
    websocket: WebSocket,
    user_id: str,
    display_name: Optional[str] = Query(None, description="Display name for presence events"),
):
    """
    Persistent WebSocket connection for a single employee.
    """
    await websocket.accept()
    logger.info("WS connect: user_id=%s", user_id)

    # Register connection (replace any stale one)
    old_ws = _connections.get(user_id)
    if old_ws and old_ws is not websocket:
        try:
            await old_ws.close(code=1001, reason="replaced")
        except Exception:
            pass

    # Store connection under user_id + resolve email/name aliases
    _connections[user_id] = websocket
    try:
        from app.core.database import AsyncSessionLocal
        from app.db.postgres import get_neon_session_maker
        from app.modules.auth.models import User
        from sqlalchemy import select, or_
        neon_maker = get_neon_session_maker()
        identity_session_factory = neon_maker if neon_maker is not None else AsyncSessionLocal
        async with identity_session_factory() as id_session:
            r = await id_session.execute(select(User).where(or_(User.id == user_id, User.email == user_id, User.name == user_id)))
            u = r.scalars().first()
            if u:
                _connections[u.id] = websocket
                if u.email:
                    _connections[u.email] = websocket
                if u.name:
                    _connections[u.name] = websocket
    except Exception:
        pass

    # Announce presence to everyone
    await _broadcast_presence(user_id, online=True)

    # Send current online list to the newly connected client
    await websocket.send_text(json.dumps({
        "type": "online_list",
        "users": list(set(_connections.keys())),
        "timestamp": _now_iso(),
    }))

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON",
                }))
                continue

            msg_type = data.get("type", "message")

            # ── Ping/Pong keepalive ────────────────────────────────────────
            if msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
                continue

            # ── Message routing ───────────────────────────────────────────
            if msg_type == "message":
                to_user = data.get("to", "").strip()
                text = data.get("text", "").strip()

                if not to_user or not text:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": "Fields 'to' and 'text' are required.",
                    }))
                    continue

                msg_id = str(uuid.uuid4())
                msg_payload = {
                    "type": "message",
                    "id": msg_id,
                    "from": user_id,
                    "from_name": display_name or user_id,
                    "to": to_user,
                    "text": text,
                    "timestamp": _now_iso(),
                }

                # Persist to in-memory history
                key = _convo_key(user_id, to_user)
                _history[key].append(msg_payload)

                # Persist to Database & dispatch via CommunicationService
                delivered_ws = False
                delivered_tg = False
                try:
                    from app.core.database import AsyncSessionLocal
                    from app.services.communication import CommunicationService
                    from app.db.models.message import Message

                    async with AsyncSessionLocal() as session:
                        comm = CommunicationService(session)
                        tg_res = await comm.send_message(
                            sender_id=user_id,
                            recipient_identifier=to_user,
                            content=text,
                            sender_name=display_name or user_id,
                            message_id=msg_id,
                        )
                        if tg_res and tg_res.get("success"):
                            delivered_tg = True
                        else:
                            # If recipient is purely WS / not Telegram, persist DB record
                            existing_db = await session.get(Message, msg_id)
                            if not existing_db:
                                db_msg = Message(
                                    id=msg_id,
                                    conversation_id=key,
                                    sender_id=user_id,
                                    receiver_id=to_user,
                                    channel="websocket",
                                    content=text,
                                    status="SENT",
                                )
                                session.add(db_msg)
                                await session.commit()
                except Exception as exc:
                    logger.warning("DB/Telegram persistence error in WS message: %s", exc)

                # Deliver to recipient via WebSocket if online
                recipient_ws = _connections.get(to_user)
                if not recipient_ws:
                    try:
                        from app.core.database import AsyncSessionLocal
                        from app.db.postgres import get_neon_session_maker
                        from app.modules.auth.models import User
                        from sqlalchemy import select, or_
                        neon_maker = get_neon_session_maker()
                        id_fac = neon_maker if neon_maker is not None else AsyncSessionLocal
                        async with id_fac() as id_session:
                            r_u = await id_session.execute(select(User).where(or_(User.id == to_user, User.email.ilike(to_user), User.name.ilike(to_user))))
                            target_u = r_u.scalars().first()
                            if target_u:
                                recipient_ws = _connections.get(target_u.id) or _connections.get(target_u.email) or _connections.get(target_u.name)
                    except Exception:
                        pass

                if recipient_ws:
                    try:
                        await recipient_ws.send_text(json.dumps({
                            **msg_payload,
                            "delivered": True,
                        }))
                        delivered_ws = True
                    except Exception as exc:
                        logger.warning("Failed to deliver to %s: %s", to_user, exc)

                # Confirmation back to sender
                await websocket.send_text(json.dumps({
                    **msg_payload,
                    "delivered": delivered_ws or delivered_tg,
                    "telegram_sent": delivered_tg,
                }))

                logger.info("Message %s → %s (%d chars)", user_id, to_user, len(text))
                continue

            # ── Unknown type ──────────────────────────────────────────────
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Unknown message type: {msg_type!r}",
            }))

    except WebSocketDisconnect:
        logger.info("WS disconnect: user_id=%s", user_id)
    except Exception as exc:
        logger.exception("WS error for user_id=%s: %s", user_id, exc)
    finally:
        for k in list(_connections.keys()):
            if _connections.get(k) is websocket:
                _connections.pop(k, None)
        await _broadcast_presence(user_id, online=False)


# ── REST helpers ───────────────────────────────────────────────────────────────

@router.get(
    "/online",
    summary="Online Users",
    description="Returns the list of user IDs currently connected via WebSocket.",
)
async def get_online_users() -> dict:
    return {
        "online": list(_connections.keys()),
        "count": len(_connections),
    }


@router.get(
    "/history/{peer_id}",
    summary="Conversation History",
    description="Returns the last messages exchanged between the caller and a peer (persisted + memory).",
)
async def get_history(
    peer_id: str,
    user_id: str = Query(..., description="Caller's user ID"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    key = _convo_key(user_id, peer_id)
    in_memory = list(_history.get(key, []))

    # Query DB records
    db_messages = []
    try:
        from app.core.database import AsyncSessionLocal
        from app.db.postgres import get_neon_session_maker
        from app.db.models.message import Message
        from app.modules.auth.models import User
        from sqlalchemy import select, or_, and_

        # Map user display names
        user_name_map = {}
        try:
            neon_maker = get_neon_session_maker()
            id_fac = neon_maker if neon_maker is not None else AsyncSessionLocal
            async with id_fac() as id_session:
                res_u = await id_session.execute(select(User.id, User.name))
                for uid, uname in res_u.all():
                    if uname:
                        user_name_map[uid] = uname
        except Exception:
            pass

        async with AsyncSessionLocal() as session:
            stmt = (
                select(Message)
                .where(
                    or_(
                        Message.conversation_id == key,
                        Message.conversation_id == f"{user_id}|telegram",
                        Message.conversation_id == f"{peer_id}|telegram",
                        and_(Message.sender_id == user_id, Message.receiver_id == peer_id),
                        and_(Message.sender_id == peer_id, Message.receiver_id == user_id),
                    )
                )
                .order_by(Message.created_at.desc())
                .limit(limit)
            )
            res = await session.execute(stmt)
            rows = res.scalars().all()
            for r in reversed(rows):
                sender_name = user_name_map.get(r.sender_id, r.sender_id)
                db_messages.append({
                    "id": r.id,
                    "from": r.sender_id,
                    "from_name": sender_name,
                    "to": r.receiver_id,
                    "text": r.content,
                    "timestamp": r.created_at.isoformat() if r.created_at else _now_iso(),
                    "status": r.status,
                    "delivered": r.status in ("SENT", "DELIVERED", "RECEIVED"),
                })
    except Exception as exc:
        logger.warning("Failed querying DB history: %s", exc)

    # Merge DB and in-memory messages with ID and timestamp-minute aware deduplication
    seen_ids = set()
    seen_signatures = set()
    combined = []

    # Process DB messages first (they are authoritative)
    for m in db_messages:
        mid = m.get("id")
        ts_min = (m.get("timestamp") or "")[:16]
        sig = f"{m.get('from')}|{m.get('to')}|{m.get('text')}|{ts_min}"
        if mid not in seen_ids and sig not in seen_signatures:
            seen_ids.add(mid)
            seen_signatures.add(sig)
            combined.append(m)

    # Process in-memory messages if not already in DB
    for m in in_memory:
        mid = m.get("id")
        ts_min = (m.get("timestamp") or "")[:16]
        sig = f"{m.get('from')}|{m.get('to')}|{m.get('text')}|{ts_min}"
        if mid not in seen_ids and sig not in seen_signatures:
            seen_ids.add(mid)
            seen_signatures.add(sig)
            combined.append(m)

    return {
        "peer_id": peer_id,
        "messages": combined[-limit:],
        "total": len(combined),
    }


@router.get(
    "/contacts",
    summary="List Employees for Messaging",
    description="Returns employees belonging to the caller's organization with their Telegram connection status.",
)
async def list_contacts(user_id: Optional[str] = Query(None)) -> dict:
    contacts = []
    try:
        from app.core.database import AsyncSessionLocal
        from app.db.postgres import get_neon_session_maker
        from app.modules.auth.models import User
        from app.modules.roles.models import Role
        from app.modules.organizations.models import OrganizationMember
        from app.integrations.telegram.models import TelegramIdentity
        from sqlalchemy import select, or_

        # 1. Query TelegramIdentities from SQLite
        tg_map = {}
        try:
            async with AsyncSessionLocal() as agent_session:
                stmt_tg = select(TelegramIdentity)
                res_tg = await agent_session.execute(stmt_tg)
                tg_map = {tg.user_id: tg for tg in res_tg.scalars().all()}
        except Exception as e:
            logger.warning("Error reading telegram identities: %s", e)

        # 2. Query Users isolated by Organization from Neon PostgreSQL
        neon_maker = get_neon_session_maker()
        identity_session_factory = neon_maker if neon_maker is not None else AsyncSessionLocal

        async with identity_session_factory() as id_session:
            target_user_id = None
            if user_id:
                clean_uid = user_id.strip()
                res_u = await id_session.execute(
                    select(User.id).where(
                        or_(User.id == clean_uid, User.email.ilike(clean_uid), User.name.ilike(clean_uid))
                    )
                )
                target_user_id = res_u.scalar_one_or_none()

            org_ids = []
            if target_user_id:
                res_mem = await id_session.execute(
                    select(OrganizationMember.organization_id).where(
                        OrganizationMember.user_id == target_user_id
                    )
                )
                org_ids = res_mem.scalars().all()

            # Default to active organization
            if not org_ids:
                res_mem_default = await id_session.execute(
                    select(OrganizationMember.organization_id).limit(1)
                )
                first_org = res_mem_default.scalar_one_or_none()
                if first_org:
                    org_ids = [first_org]

            if org_ids:
                stmt_users = (
                    select(User)
                    .join(OrganizationMember, User.id == OrganizationMember.user_id)
                    .where(OrganizationMember.organization_id.in_(org_ids))
                    .distinct()
                )
            else:
                stmt_users = select(User)

            res_users = await id_session.execute(stmt_users)
            users = res_users.scalars().all()

            for u in users:
                tg = tg_map.get(u.id)
                contacts.append({
                    "user_id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "job_title": getattr(u, "job_title", None) or getattr(u, "role", "Employee"),
                    "telegram_connected": tg is not None,
                    "telegram_username": tg.telegram_username if tg else None,
                })
    except Exception as exc:
        logger.exception("Error fetching contacts: %s", exc)

    return {"contacts": contacts, "count": len(contacts)}


