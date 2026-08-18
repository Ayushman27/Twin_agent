"""Demo Agent module — Pydantic schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.modules.demo_agent.models import MessageSender, SessionStatus


class SessionCreateRequest(BaseModel):
    organization_id: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: str
    message:    str


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}
    id:         str
    session_id: str
    sender:     MessageSender
    message:    str
    meta_data:   Optional[Dict[str, Any]]
    created_at: datetime


class ChatResponse(BaseModel):
    session_id:   str
    user_message: MessageResponse
    agent_reply:  MessageResponse


class SessionResponse(BaseModel):
    model_config = {"from_attributes": True}
    id:              str
    user_id:         Optional[str]
    organization_id: Optional[str]
    agent_type:      str
    session_status:  SessionStatus
    created_at:      datetime
    updated_at:      datetime


class SessionDetailResponse(BaseModel):
    session:  SessionResponse
    messages: List[MessageResponse]
