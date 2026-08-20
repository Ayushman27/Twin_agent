"""
Agent Executions and Approvals Endpoints
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.agentic.models import AgentExecution, ApprovalRequest
from app.agentic.schemas import AgentExecutionResponse
from app.agentic.orchestrator.orchestrator import Orchestrator


router = APIRouter()


@router.post("/agents/{agent_id}/execute")
async def execute_agent(
    agent_id: str,
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """Execute a task via a specific agent (bypassing orchestrator)."""
    # Just an example endpoint, usually this goes through orchestrator
    pass


@router.post("/agent-groups/{group_id}/execute")
async def execute_group(
    group_id: str,
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """Execute a task via the Agent Group Orchestrator."""
    orchestrator = Orchestrator(db)
    
    task_id = payload.get("task_id", "task-123")
    objective = payload.get("objective", "Default objective")
    inputs = payload.get("inputs", {})
    
    result = await orchestrator.process_task(
        agent_group_id=group_id,
        task_id=task_id,
        objective=objective,
        inputs=inputs
    )
    
    return result


@router.get("/agent-executions/{execution_id}", response_model=AgentExecutionResponse)
async def get_execution(
    execution_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get details of a specific execution, including evidence."""
    result = await db.execute(
        select(AgentExecution).where(AgentExecution.id == execution_id)
    )
    execution = result.scalars().first()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.post("/agent-executions/{execution_id}/approve")
async def approve_execution(
    execution_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Approve a paused execution."""
    result = await db.execute(
        select(ApprovalRequest).where(ApprovalRequest.execution_id == execution_id, ApprovalRequest.status == "PENDING")
    )
    req = result.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    req.status = "APPROVED"
    await db.commit()
    
    # Resume execution...
    return {"status": "APPROVED", "execution_id": execution_id}
