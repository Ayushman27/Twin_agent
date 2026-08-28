"""
Action Recorder Service.
Non-LLM service responsible for recording and persisting every step in the agent workflow.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agentic.models import AgentTaskExecution, AgentActionLog
from app.agentic.workflow.state import ActionRecord, AgentState


class ActionRecorder:
    """
    Service tool for recording audit actions, state transitions, and step summaries.
    """
    def __init__(self, db: Optional[AsyncSession] = None, execution_id: Optional[str] = None):
        self.db = db
        self.execution_id = execution_id

    async def record_action(
        self,
        state: AgentState,
        agent_name: str,
        action: str,
        status: str = "completed",
        input_summary: Optional[str] = None,
        output_summary: Optional[str] = None,
        error: Optional[str] = None,
        retry_number: int = 0
    ) -> ActionRecord:
        """
        Appends an action to the in-memory state and persists to database if session is present.
        """
        now_iso = datetime.utcnow().isoformat()
        record = ActionRecord(
            task_id=state.task_id,
            agent_name=agent_name,
            action=action,
            status=status,
            timestamp=now_iso,
            input_summary=input_summary,
            output_summary=output_summary,
            error=error,
            retry_number=retry_number
        )
        state.actions.append(record)
        state.updated_at = datetime.utcnow()

        if self.db and self.execution_id:
            try:
                db_log = AgentActionLog(
                    execution_id=self.execution_id,
                    task_id=state.task_id,
                    agent_name=agent_name,
                    action=action,
                    status=status,
                    input_summary=input_summary,
                    output_summary=output_summary,
                    error=error,
                    retry_number=retry_number
                )
                self.db.add(db_log)
                await self.db.commit()
            except Exception as e:
                # Logging shouldn't crash the workflow
                print(f"[ActionRecorder] Failed to persist action log to DB: {e}")

        return record

    async def get_logs_for_execution(self, execution_id: str) -> List[Dict[str, Any]]:
        """Fetch all action logs for a given execution ID."""
        if not self.db:
            return []
        res = await self.db.execute(
            select(AgentActionLog)
            .where(AgentActionLog.execution_id == execution_id)
            .order_by(AgentActionLog.created_at.asc())
        )
        logs = res.scalars().all()
        return [
            {
                "id": log.id,
                "execution_id": log.execution_id,
                "task_id": log.task_id,
                "agent_name": log.agent_name,
                "action": log.action,
                "status": log.status,
                "input_summary": log.input_summary,
                "output_summary": log.output_summary,
                "error": log.error,
                "retry_number": log.retry_number,
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ]
