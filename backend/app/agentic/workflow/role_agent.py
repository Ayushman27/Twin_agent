"""
Role Agent.
Role-aware coordinator that manages workflow strategy, relevance checks, task synthesis, and rework cycles.
"""
from typing import Any, Dict, Optional
from app.agentic.workflow.state import AgentState
from app.agentic.workflow.action_recorder import ActionRecorder
from app.agentic.workflow.ai_service import AIService


class RoleAgent:
    """
    Role Agent acts as the persona and domain coordinator for the employee's role.
    """
    def __init__(self, ai_service: AIService, action_recorder: ActionRecorder):
        self.ai = ai_service
        self.recorder = action_recorder

    async def establish_role_context(self, state: AgentState) -> AgentState:
        """
        Interprets the employee's role and determines how the role approaches the task.
        """
        role_name = state.role or state.employee_context.get("job_title", "Software Engineer")
        role_context: Dict[str, Any] = {
            "role_name": role_name,
            "domain": state.employee_context.get("department", "Engineering"),
            "focus_areas": ["Correctness", "Security", "Best Practices", "Performance"],
            "approach": f"Approach task with high standard of {role_name} precision and domain excellence.",
            "is_relevant": True
        }

        state.role_context = role_context
        state.current_agent = "planner_agent"

        await self.recorder.record_action(
            state=state,
            agent_name="role_agent",
            action="established_role_strategy",
            status="completed",
            input_summary=f"Role: {role_name}, Task: {state.original_task[:80]}",
            output_summary=f"Strategy defined for {role_name} with focus on domain correctness.",
            retry_number=state.retry_count
        )

        return state

    async def synthesize_output(self, state: AgentState) -> AgentState:
        """
        Produces the structured final task solution combining plan, context, and research.
        """
        system_prompt = (
            f"You are the Digital Twin AI representing a {state.role}.\n"
            "Produce a comprehensive, structured, and high-quality solution for the employee's task.\n"
            "Structure your output cleanly with summary, solution details, key steps taken, and artifacts/deliverables."
        )

        plan_desc = state.plan.task_understanding if state.plan else state.original_task
        research_summary = state.research_results.summary if state.research_results else "No research required."

        user_message = (
            f"Task: {state.original_task}\n"
            f"Role: {state.role}\n"
            f"Plan: {plan_desc}\n"
            f"Research Insights: {research_summary}\n"
            f"Employee Context: {state.employee_context.get('name')} ({state.employee_context.get('job_title')})\n"
        )
        if state.verification and state.verification.feedback:
            user_message += f"\nNote: Incorporate feedback from previous review: {state.verification.feedback}\n"

        raw_output = await self.ai.generate(system_prompt, user_message)

        task_output = {
            "title": f"Resolution: {state.original_task}",
            "executor_role": state.role,
            "status": "PROCESSED",
            "content": raw_output,
            "artifacts": [
                {
                    "type": "summary_document",
                    "title": "Execution Summary",
                    "content": f"Task completed under {state.role} specifications."
                }
            ],
            "execution_metadata": {
                "steps_completed": len(state.plan.steps) if state.plan else 1,
                "research_conducted": bool(state.research_results and state.research_results.research_required),
                "retry_iteration": state.retry_count
            }
        }

        state.task_output = task_output
        state.current_agent = "verification_agent"

        await self.recorder.record_action(
            state=state,
            agent_name="role_agent",
            action="synthesized_task_output",
            status="completed",
            input_summary=f"Processed plan and research for task",
            output_summary=f"Generated structured solution ({len(raw_output)} chars).",
            retry_number=state.retry_count
        )

        return state
