"""
Planner Agent.
Converts employee task and role context into a structured, step-by-step execution plan.
"""
from typing import Optional
from app.agentic.workflow.state import AgentState, TaskPlan, TaskPlanStep
from app.agentic.workflow.action_recorder import ActionRecorder
from app.agentic.workflow.ai_service import AIService


class PlannerAgent:
    """
    Agent responsible for decomposing normal employee tasks into concise execution plans.
    """
    def __init__(self, ai_service: AIService, action_recorder: ActionRecorder):
        self.ai = ai_service
        self.recorder = action_recorder

    async def execute(self, state: AgentState) -> AgentState:
        """
        Creates structured plan for the task.
        """
        system_prompt = (
            "You are a professional Technical Planner Agent in an organizational Digital Twin system.\n"
            "Your job is to produce a concise, actionable, step-by-step execution plan for a normal employee task.\n"
            "Assess whether external knowledge/research is required to complete the task accurately."
        )

        user_message = (
            f"Original Task: {state.original_task}\n"
            f"Employee Context: {state.employee_context}\n"
            f"Role Context: {state.role_context}\n"
            f"Retry Count: {state.retry_count}\n"
        )
        if state.verification and state.verification.feedback:
            user_message += f"\nPrevious Verification Feedback (Rework Required): {state.verification.feedback}"

        default_plan = TaskPlan(
            task_understanding=f"Execute task: {state.original_task}",
            steps=[
                TaskPlanStep(step_number=1, description="Analyze task parameters and requirements", status="pending"),
                TaskPlanStep(step_number=2, description="Execute task operations and synthesize output", status="pending"),
                TaskPlanStep(step_number=3, description="Perform verification and quality check", status="pending"),
            ],
            research_required=any(
                kw in state.original_task.lower()
                for kw in ["research", "search", "lookup", "api", "docs", "documentation", "investigate", "compare", "analyze"]
            ),
            expected_output=f"Structured resolution for: {state.original_task}",
            acceptance_criteria=[
                "Addresses all core objectives of the user request",
                "Output is clear, professional, and actionable",
                "Verified against role criteria"
            ]
        )

        try:
            plan = await self.ai.generate_structured(
                system_prompt=system_prompt,
                user_message=user_message,
                schema_class=TaskPlan,
                default_instance=default_plan
            )
        except Exception as e:
            print(f"[PlannerAgent] Fallback to default plan due to error: {e}")
            plan = default_plan

        state.plan = plan
        state.current_agent = "research_agent" if plan.research_required else "role_agent"

        # Record action
        await self.recorder.record_action(
            state=state,
            agent_name="planner_agent",
            action="generated_plan",
            status="completed",
            input_summary=f"Task: {state.original_task[:80]}",
            output_summary=f"Generated {len(plan.steps)} steps. Research required: {plan.research_required}.",
            retry_number=state.retry_count
        )

        return state
