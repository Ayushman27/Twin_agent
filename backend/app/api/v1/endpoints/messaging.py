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
    return datetime.now(timezone.utc).isoformat()


async def _broadcast_presence(user_id: str, online: bool) -> None:
    """Notify all connected clients of a presence change."""
    payload = json.dumps({
        "type": "presence",
        "user_id": user_id,
        "online": online,
        "timestamp": _now_iso(),
    })
    dead = []
    for uid, ws in list(_connections.items()):
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

    Client sends JSON:
      { "type": "message", "to": "<target_user_id>", "text": "Hello!" }
      { "type": "ping" }

    Server pushes JSON:
      { "type": "message",  "from": "...", "to": "...", "text": "...", "id": "...", "timestamp": "..." }
      { "type": "presence", "user_id": "...", "online": true/false, "timestamp": "..." }
      { "type": "online_list", "users": ["uid1", "uid2", ...] }
      { "type": "pong" }
      { "type": "error", "message": "..." }
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

    _connections[user_id] = websocket

    # Announce presence to everyone
    await _broadcast_presence(user_id, online=True)

    # Send current online list to the newly connected client
    await websocket.send_text(json.dumps({
        "type": "online_list",
        "users": [uid for uid in _connections if uid != user_id],
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

                msg_payload = {
                    "type": "message",
                    "id": str(uuid.uuid4()),
                    "from": user_id,
                    "from_name": display_name or user_id,
                    "to": to_user,
                    "text": text,
                    "timestamp": _now_iso(),
                }

                # Persist to in-memory history
                key = _convo_key(user_id, to_user)
                _history[key].append(msg_payload)

                # Deliver to recipient if online
                recipient_ws = _connections.get(to_user)
                if recipient_ws:
                    try:
                        await recipient_ws.send_text(json.dumps(msg_payload))
                    except Exception as exc:
                        logger.warning("Failed to deliver to %s: %s", to_user, exc)
                        _connections.pop(to_user, None)

                # Echo back to sender as confirmation
                await websocket.send_text(json.dumps({**msg_payload, "delivered": bool(recipient_ws)}))

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
        _connections.pop(user_id, None)
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
    description="Returns the last messages exchanged between the caller and a peer (in-memory).",
)
async def get_history(
    peer_id: str,
    user_id: str = Query(..., description="Caller's user ID"),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    key = _convo_key(user_id, peer_id)
    messages = list(_history.get(key, []))
    return {
        "peer_id": peer_id,
        "messages": messages[-limit:],
        "total": len(messages),
    }
