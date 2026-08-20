"""
Execution Engine - Handles execution of tasks by agents.
"""
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agentic.models import AgentExecution, Agent, ExecutionStatus
from app.agentic.policy.policy_engine import PolicyEngine
from app.agentic.verification.evidence_engine import EvidenceEngine


class ExecutionEngine:
    """
    Executes a task assigned to a specific agent.
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.evidence_engine = EvidenceEngine(db)
        
    async def execute_task(
        self,
        agent_id: str,
        task_id: str,
        objective: str,
        inputs: Dict[str, Any]
    ) -> AgentExecution:
        """
        Starts task execution. If a tool action is needed, it checks Policy Engine.
        """
        # Fetch agent
        result = await self.db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalars().first()
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
            
        execution = AgentExecution(
            agent_id=agent_id,
            task_id=task_id,
            objective=objective,
            inputs=inputs,
            status=ExecutionStatus.RUNNING
        )
        self.db.add(execution)
        await self.db.flush()
        
        # Here, the LLM would normally perform reasoning and decide on an action.
        # We simulate a tool execution and validation check.
        action_name = "test_action"
        tool_id = "jira" if "jira" in agent.assigned_tools else None
        
        if tool_id:
            policy_check = PolicyEngine.validate_action(agent_id, tool_id, action_name, agent.permissions)
            if policy_check["requires_approval"]:
                execution.status = ExecutionStatus.AWAITING_APPROVAL
                # In real scenario, create ApprovalRequest here.
            elif not policy_check["allowed"]:
                execution.status = ExecutionStatus.FAILED
                execution.error_message = policy_check["reason"]
            else:
                execution.status = ExecutionStatus.COMPLETED
                execution.outputs = {"result": "success", "action": action_name}
                
                await self.evidence_engine.log_evidence(
                    execution_id=execution.id,
                    action_taken=f"Executed {action_name} on {tool_id}",
                    evidence_type="log",
                    evidence_data={"status": "success"},
                    confidence_score=0.95
                )
        else:
            # Simple text task completed without tools
            execution.status = ExecutionStatus.COMPLETED
            execution.outputs = {"response": "Task completed successfully"}
            
        await self.db.commit()
        await self.db.refresh(execution)
        return execution
