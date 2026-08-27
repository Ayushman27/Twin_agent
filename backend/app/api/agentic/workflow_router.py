"""
FastAPI router for the Modular Agentic Task Execution System.
"""
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.dependencies import get_optional_user, get_current_user
from app.db.sqlite import get_agent_db
from app.agentic.models import AgentTaskExecution, AgentActionLog
from app.agentic.workflow.orchestrator import AgenticTaskOrchestrator
from app.agentic.workflow.state import AgentState, WorkflowStatus
from app.agentic.workflow.action_recorder import ActionRecorder

router = APIRouter(prefix="/agentic", tags=["Agentic Workflow Execution"])


class AssignTaskPayload(BaseModel):
    employee_id: str = Field(..., description="ID of employee to assign task to")
    task: str = Field(..., description="Task description assigned by company")
    organization_id: Optional[str] = None
    role: Optional[str] = "Software Engineer"
    priority: Optional[str] = "MEDIUM"
    auto_execute: Optional[bool] = False


@router.post("/tasks/assign", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def assign_task_to_employee(
    payload: AssignTaskPayload,
    db: AsyncSession = Depends(get_agent_db),
    user: Optional[Any] = Depends(get_optional_user),
):
    """
    Allows Company Admin to assign a task manually to an employee.
    If auto_execute is True, immediately processes the task with the Agentic AI swarm.
    Otherwise, creates a PENDING task in the employee's queue.
    """
    task_id = f"task-assign-{uuid.uuid4().hex[:8]}"
    org_id = payload.organization_id or (getattr(user, "organization_id", None) or "org-default-01")

    if payload.auto_execute:
        orchestrator = AgenticTaskOrchestrator(db=db)
        final_state = await orchestrator.execute_task(
            task_id=task_id,
            original_task=payload.task,
            employee_id=payload.employee_id,
            organization_id=org_id,
            role=payload.role or "Software Engineer",
            max_retries=1,
        )
        return {
            "success": True,
            "message": "Task assigned and executed successfully by AI swarm.",
            "task_id": final_state.task_id,
            "status": final_state.status.value,
            "result": final_state.task_output,
        }

    # Store as PENDING task in SQLite
    exec_record = AgentTaskExecution(
        id=str(uuid.uuid4()),
        task_id=task_id,
        employee_id=payload.employee_id,
        organization_id=org_id,
        status="PENDING",
        retry_count=0,
        original_task=payload.task,
        plan={
            "task_understanding": payload.task,
            "steps": [{"step_number": 1, "description": f"Assigned by company: {payload.task}", "status": "PENDING"}],
            "research_required": False,
            "expected_output": "Agentic task execution result",
            "acceptance_criteria": ["Satisfy company assigned requirements"],
        },
        result={"title": payload.task, "executor_role": payload.role or "Software Engineer", "status": "PENDING", "content": "Pending execution by employee twin."},
    )
    db.add(exec_record)
    await db.commit()
    await db.refresh(exec_record)

    return {
        "success": True,
        "message": "Task manually assigned to employee queue.",
        "execution_id": exec_record.id,
        "task_id": exec_record.task_id,
        "status": "PENDING",
    }


class ExecuteTaskPayload(BaseModel):
    task_id: Optional[str] = None
    task: str = Field(..., description="Task description submitted by employee")
    employee_id: Optional[str] = None
    organization_id: Optional[str] = None
    role: Optional[str] = "EMPLOYEE"
    max_retries: Optional[int] = 1


class ExecutionResponse(BaseModel):
    execution_id: Optional[str] = None
    task_id: str
    status: str
    original_task: str
    role: str
    plan: Optional[Dict[str, Any]] = None
    research_results: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    verification_result: Optional[Dict[str, Any]] = None
    retry_count: int
    actions: List[Dict[str, Any]] = Field(default_factory=list)


@router.post("/tasks/execute", response_model=ExecutionResponse, status_code=status.HTTP_200_OK)
async def execute_task_agentic(
    payload: ExecuteTaskPayload,
    db: AsyncSession = Depends(get_agent_db),
    user: Optional[Any] = Depends(get_optional_user),
):
    """
    Executes a task through the controlled multi-agent pipeline.
    """
    task_id = payload.task_id or f"task-{uuid.uuid4().hex[:8]}"
    employee_id = payload.employee_id or (str(user.id) if user else "emp-default-01")
    organization_id = payload.organization_id or (getattr(user, "organization_id", None) or "org-default-01")
    role = payload.role or (getattr(user, "job_title", None) or "Software Engineer")

    orchestrator = AgenticTaskOrchestrator(db=db)
    final_state = await orchestrator.execute_task(
        task_id=task_id,
        original_task=payload.task,
        employee_id=employee_id,
        organization_id=organization_id,
        role=role,
        max_retries=payload.max_retries or 1,
    )

    # Fetch recorded logs
    recorder = ActionRecorder(db=db)
    # Search DB for created execution record ID
    res = await db.execute(
        select(AgentTaskExecution)
        .where(AgentTaskExecution.task_id == task_id)
        .order_by(AgentTaskExecution.created_at.desc())
    )
    db_exec = res.scalars().first()
    execution_id = db_exec.id if db_exec else None

    actions_data = [
        {
            "task_id": a.task_id,
            "agent_name": a.agent_name,
            "action": a.action,
            "status": a.status,
            "timestamp": a.timestamp,
            "input_summary": a.input_summary,
            "output_summary": a.output_summary,
            "error": a.error,
            "retry_number": a.retry_number,
        }
        for a in final_state.actions
    ]

    return ExecutionResponse(
        execution_id=execution_id,
        task_id=final_state.task_id,
        status=final_state.status.value,
        original_task=final_state.original_task,
        role=final_state.role,
        plan=final_state.plan.model_dump() if final_state.plan else None,
        research_results=final_state.research_results.model_dump() if final_state.research_results else None,
        result=final_state.task_output,
        verification_result=final_state.verification.model_dump() if final_state.verification else None,
        retry_count=final_state.retry_count,
        actions=actions_data,
    )


@router.get("/executions", response_model=List[Dict[str, Any]])
async def list_all_executions(
    limit: int = 50,
    db: AsyncSession = Depends(get_agent_db),
):
    """
    List all stored agent task executions from SQLite.
    """
    res = await db.execute(
        select(AgentTaskExecution)
        .order_by(AgentTaskExecution.created_at.desc())
        .limit(limit)
    )
    executions = res.scalars().all()
    return [
        {
            "id": e.id,
            "task_id": e.task_id,
            "employee_id": e.employee_id,
            "organization_id": e.organization_id,
            "status": e.status,
            "retry_count": e.retry_count,
            "original_task": e.original_task,
            "plan": e.plan,
            "research_results": e.research_results,
            "result": e.result,
            "verification_result": e.verification_result,
            "error_message": e.error_message,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "updated_at": e.updated_at.isoformat() if e.updated_at else None,
        }
        for e in executions
    ]


@router.get("/logs", response_model=List[Dict[str, Any]])
async def list_all_agent_logs(
    limit: int = 100,
    execution_id: Optional[str] = None,
    db: AsyncSession = Depends(get_agent_db),
):
    """
    List all action logs recorded by the Action Recorder across all agents and tasks.
    """
    query = select(AgentActionLog).order_by(AgentActionLog.created_at.desc()).limit(limit)
    if execution_id:
        query = select(AgentActionLog).where(AgentActionLog.execution_id == execution_id).order_by(AgentActionLog.created_at.asc())
    
    res = await db.execute(query)
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
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.get("/executions/{execution_id}", response_model=Dict[str, Any])
async def get_execution_details(
    execution_id: str,
    db: AsyncSession = Depends(get_agent_db),
):
    """
    Retrieve full execution record including state, plan, result, and verification score.
    """
    res = await db.execute(
        select(AgentTaskExecution).where(AgentTaskExecution.id == execution_id)
    )
    db_exec = res.scalars().first()
    if not db_exec:
        raise HTTPException(status_code=404, detail="Agent task execution not found")

    return {
        "id": db_exec.id,
        "task_id": db_exec.task_id,
        "employee_id": db_exec.employee_id,
        "organization_id": db_exec.organization_id,
        "status": db_exec.status,
        "retry_count": db_exec.retry_count,
        "original_task": db_exec.original_task,
        "plan": db_exec.plan,
        "research_results": db_exec.research_results,
        "result": db_exec.result,
        "verification_result": db_exec.verification_result,
        "error_message": db_exec.error_message,
        "created_at": db_exec.created_at.isoformat() if db_exec.created_at else None,
        "updated_at": db_exec.updated_at.isoformat() if db_exec.updated_at else None,
    }


@router.get("/executions/{execution_id}/actions", response_model=List[Dict[str, Any]])
async def get_execution_actions(
    execution_id: str,
    db: AsyncSession = Depends(get_agent_db),
):
    """
    Retrieve action timeline and audit history for a specific task execution.
    """
    recorder = ActionRecorder(db=db)
    return await recorder.get_logs_for_execution(execution_id)


@router.get("/tasks/{task_id}/executions", response_model=List[Dict[str, Any]])
async def list_task_executions(
    task_id: str,
    db: AsyncSession = Depends(get_agent_db),
):
    """
    List all historical agentic executions for a specific task ID.
    """
    res = await db.execute(
        select(AgentTaskExecution)
        .where(AgentTaskExecution.task_id == task_id)
        .order_by(AgentTaskExecution.created_at.desc())
    )
    executions = res.scalars().all()
    return [
        {
            "id": e.id,
            "task_id": e.task_id,
            "status": e.status,
            "retry_count": e.retry_count,
            "original_task": e.original_task,
            "verification_result": e.verification_result,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in executions
    ]
