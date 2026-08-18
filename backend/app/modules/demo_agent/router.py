"""Demo Agent module — HTTP router."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_optional_user
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.demo_agent.schemas import (
    ChatRequest, ChatResponse, SessionCreateRequest,
    SessionDetailResponse, SessionResponse,
)
from app.modules.demo_agent.service import DemoAgentService

router = APIRouter()


@router.post(
    "/session",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new demo agent session",
)
async def create_session(
    body: SessionCreateRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    service = DemoAgentService(db)
    session = await service.create_session(
        user=current_user,
        organization_id=body.organization_id,
    )
    return SessionResponse.model_validate(session)


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Send a message to the demo agent",
)
async def chat(
    body: ChatRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    service = DemoAgentService(db)
    return await service.chat(body.session_id, body.message, current_user)


@router.get(
    "/session/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get session history",
)
async def get_session(
    session_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    service = DemoAgentService(db)
    return await service.get_session(session_id, current_user)


@router.delete(
    "/session/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="End a demo agent session",
)
async def end_session(
    session_id: str,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    service = DemoAgentService(db)
    await service.end_session(session_id, current_user)
