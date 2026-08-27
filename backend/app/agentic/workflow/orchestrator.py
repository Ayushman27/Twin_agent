"""
Workflow Orchestrator.
Coordinates the multi-agent task execution pipeline across Human, Role, Planner, Research, and Verification agents.
"""
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.agentic.models import AgentTaskExecution
from app.agentic.workflow.state import AgentState, WorkflowStatus
from app.agentic.workflow.ai_service import AIService
from app.agentic.workflow.action_recorder import ActionRecorder
from app.agentic.workflow.human_agent import HumanAgent
from app.agentic.workflow.role_agent import RoleAgent
from app.agentic.workflow.planner_agent import PlannerAgent
from app.agentic.workflow.research_agent import ResearchAgent
from app.agentic.workflow.verification_agent import VerificationAgent


class AgenticTaskOrchestrator:
    """
    Controlled multi-agent task orchestrator for employee tasks.
    """
    def __init__(self, db: Optional[AsyncSession] = None, ai_service: Optional[AIService] = None):
        self.db = db
        self.ai = ai_service or AIService()

    async def execute_task(
        self,
        task_id: str,
        original_task: str,
        employee_id: str,
        organization_id: str,
        role: str = "EMPLOYEE",
        max_retries: int = 1
    ) -> AgentState:
        """
        Executes the full multi-agent task pipeline.
        """
        # 1. Initialize DB execution record if DB is available
        execution_id: Optional[str] = None
        if self.db:
            try:
                db_exec = AgentTaskExecution(
                    task_id=task_id,
                    employee_id=employee_id,
                    organization_id=organization_id,
                    status=WorkflowStatus.PENDING.value,
                    retry_count=0,
                    original_task=original_task
                )
                self.db.add(db_exec)
                await self.db.commit()
                await self.db.refresh(db_exec)
                execution_id = db_exec.id
            except Exception as e:
                print(f"[Orchestrator] Error initializing DB execution record: {e}")

        # 2. Instantiate components
        recorder = ActionRecorder(db=self.db, execution_id=execution_id)
        human_agent = HumanAgent(action_recorder=recorder, db=self.db)
        role_agent = RoleAgent(ai_service=self.ai, action_recorder=recorder)
        planner_agent = PlannerAgent(ai_service=self.ai, action_recorder=recorder)
        research_agent = ResearchAgent(ai_service=self.ai, action_recorder=recorder)
        verification_agent = VerificationAgent(ai_service=self.ai, action_recorder=recorder)

        # 3. Create initial state
        state = AgentState(
            task_id=task_id,
            organization_id=organization_id,
            employee_id=employee_id,
            role=role,
            original_task=original_task,
            status=WorkflowStatus.PENDING,
            max_retries=max_retries,
            retry_count=0
        )

        try:
            # Step 1: Human Agent (Employee Context)
            state.status = WorkflowStatus.PLANNING
            state = await human_agent.execute(state)

            # Step 2: Role Agent (Strategy)
            state = await role_agent.establish_role_context(state)

            # Main workflow execution with controlled rework retry
            while True:
                # Step 3: Planner Agent
                state = await planner_agent.execute(state)

                # Step 4: Research Agent (Conditional)
                if state.plan and state.plan.research_required:
                    state.status = WorkflowStatus.RESEARCHING
                    state = await research_agent.execute(state)

                # Step 5: Task Synthesis / Processing
                state.status = WorkflowStatus.PROCESSING
                state = await role_agent.synthesize_output(state)

                # Step 6: Verification Agent
                state.status = WorkflowStatus.VERIFYING
                state = await verification_agent.execute(state)

                # Step 7: Check Verification Outcome
                if state.verification and state.verification.status == "REWORK":
                    if state.retry_count < state.max_retries:
                        state.retry_count += 1
                        state.status = WorkflowStatus.REWORKING
                        await recorder.record_action(
                            state=state,
                            agent_name="role_agent",
                            action="initiated_retry",
                            status="completed",
                            input_summary=f"Feedback: {state.verification.feedback}",
                            output_summary=f"Starting rework cycle #{state.retry_count}",
                            retry_number=state.retry_count
                        )
                        continue  # Re-run pipeline with feedback
                    else:
                        # Max retries reached; complete with best available output
                        state.status = WorkflowStatus.COMPLETED
                        break
                else:
                    state.status = WorkflowStatus.COMPLETED
                    break

            # Auto-persist newly acquired execution learning to Agent Memory
            if state.status == WorkflowStatus.COMPLETED:
                try:
                    from app.agentic.workflow.memory_service import memory_service
                    short_task = state.original_task[:80]
                    learning_content = f"Resolved task '{short_task}' under {state.role} standards. Plan: {len(state.plan.steps) if state.plan else 1} steps, QA score: {state.verification.score if state.verification else 100}%."
                    await memory_service.store_memory(
                        employee_id=state.employee_id,
                        organization_id=state.organization_id,
                        role=state.role,
                        key=f"Execution Takeaway: {short_task}",
                        content=learning_content,
                        source_task_id=state.task_id,
                        memory_type="TASK_LEARNING"
                    )
                except Exception as mem_err:
                    print(f"[Orchestrator] Memory save warning: {mem_err}")

        except Exception as err:
            state.status = WorkflowStatus.FAILED
            await recorder.record_action(
                state=state,
                agent_name="orchestrator",
                action="workflow_failed",
                status="failed",
                error=str(err),
                retry_number=state.retry_count
            )

        # 4. Final DB persistence update
        if self.db and execution_id:
            try:
                res = await self.db.execute(
                    select(AgentTaskExecution).where(AgentTaskExecution.id == execution_id)
                )
                db_exec = res.scalars().first()
                if db_exec:
                    db_exec.status = state.status.value
                    db_exec.retry_count = state.retry_count
                    db_exec.plan = state.plan.model_dump() if state.plan else None
                    db_exec.research_results = state.research_results.model_dump() if state.research_results else None
                    db_exec.result = state.task_output
                    db_exec.verification_result = state.verification.model_dump() if state.verification else None
                    if state.status == WorkflowStatus.FAILED:
                        db_exec.error_message = "Workflow execution encountered an error."
                    await self.db.commit()
            except Exception as e:
                print(f"[Orchestrator] Error updating DB final status: {e}")

        return state
