"""Demo Agent module — Service."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.factory import get_ai_provider
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.modules.auth.models import User
from app.modules.demo_agent.agent import DEMO_AGENT_SYSTEM_PROMPT, build_context
from app.modules.demo_agent.models import (
    AgentMessage, AgentSession, MessageSender, SessionStatus,
)
from app.modules.demo_agent.schemas import (
    ChatResponse, MessageResponse, SessionDetailResponse, SessionResponse,
)


class DemoAgentService:
    def __init__(self, db: AsyncSession):
        self.db       = db
        self.provider = get_ai_provider()

    async def create_session(
        self,
        user: Optional[User] = None,
        organization_id: Optional[str] = None,
    ) -> AgentSession:
        session = AgentSession(
            user_id=user.id if user else None,
            organization_id=organization_id,
            agent_type="DEMO",
            context=build_context(
                user_id=user.id if user else None,
                org_id=organization_id,
            ),
        )
        self.db.add(session)
        await self.db.flush()
        await self.db.refresh(session)
        return session

    async def chat(
        self,
        session_id: str,
        message: str,
        current_user: Optional[User] = None,
    ) -> ChatResponse:
        session = await self._get_session(session_id)
        self._assert_session_owner(session, current_user)

        if session.session_status != SessionStatus.ACTIVE:
            raise ValidationException("Session is not active")

        # Save user message
        user_msg = AgentMessage(
            session_id=session.id,
            sender=MessageSender.USER,
            message=message,
        )
        self.db.add(user_msg)
        await self.db.flush()
        await self.db.refresh(user_msg)

        # Generate AI response
        reply_text = await self.provider.generate(DEMO_AGENT_SYSTEM_PROMPT, message)

        # Save agent reply
        agent_msg = AgentMessage(
            session_id=session.id,
            sender=MessageSender.AGENT,
            message=reply_text,
            metadata={"provider": type(self.provider).__name__},
        )
        self.db.add(agent_msg)
        await self.db.flush()
        await self.db.refresh(agent_msg)

        return ChatResponse(
            session_id=session_id,
            user_message=MessageResponse.model_validate(user_msg),
            agent_reply=MessageResponse.model_validate(agent_msg),
        )

    async def get_session(
        self, session_id: str, current_user: Optional[User] = None
    ) -> SessionDetailResponse:
        session = await self._get_session(session_id)
        self._assert_session_owner(session, current_user)

        result = await self.db.execute(
            select(AgentMessage)
            .where(AgentMessage.session_id == session_id)
            .order_by(AgentMessage.created_at)
        )
        messages = list(result.scalars().all())

        return SessionDetailResponse(
            session=SessionResponse.model_validate(session),
            messages=[MessageResponse.model_validate(m) for m in messages],
        )

    async def end_session(
        self, session_id: str, current_user: Optional[User] = None
    ) -> None:
        session = await self._get_session(session_id)
        self._assert_session_owner(session, current_user)
        session.session_status = SessionStatus.ENDED
        await self.db.flush()

    async def _get_session(self, session_id: str) -> AgentSession:
        result = await self.db.execute(
            select(AgentSession).where(AgentSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise NotFoundException("Session", session_id)
        return session

    @staticmethod
    def _assert_session_owner(session: AgentSession, user: Optional[User]) -> None:
        if session.user_id and user and session.user_id != user.id:
            from app.modules.auth.models import UserRole
            if user.role != UserRole.SUPER_ADMIN:
                raise ForbiddenException("Not your session")
