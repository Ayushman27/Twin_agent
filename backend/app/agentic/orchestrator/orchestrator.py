"""
Agent Orchestrator - Coordinates execution across multiple agents in a group.
"""
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agentic.models import AgentGroup, Agent, ExecutionStatus
from app.agentic.runtime.execution_engine import ExecutionEngine


class Orchestrator:
    """
    Central Agent Orchestrator.
    Responsible for selecting the right agent from a group, handling handoffs,
    and coordinating complex tasks.
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.execution_engine = ExecutionEngine(db)
        
    async def process_task(
        self,
        agent_group_id: str,
        task_id: str,
        objective: str,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes a top-level task using the assigned Agent Group.
        """
        # Fetch the group and its agents
        result = await self.db.execute(
            select(AgentGroup).where(AgentGroup.id == agent_group_id)
        )
        group = result.scalars().first()
        if not group:
            raise ValueError(f"Agent Group {agent_group_id} not found")
            
        result = await self.db.execute(
            select(Agent).where(Agent.agent_group_id == agent_group_id)
        )
        agents = result.scalars().all()
        if not agents:
            raise ValueError("No agents available in this group")
            
        # In a real system, the Orchestrator LLM would decompose the task 
        # and select the first agent. We'll simply pick the first available agent.
        primary_agent = agents[0]
        
        # Execute the task
        execution = await self.execution_engine.execute_task(
            agent_id=primary_agent.id,
            task_id=task_id,
            objective=objective,
            inputs=inputs
        )
        
        return {
            "execution_id": execution.id,
            "status": execution.status.value,
            "agent": primary_agent.name,
            "outputs": execution.outputs,
            "error": execution.error_message
        }
