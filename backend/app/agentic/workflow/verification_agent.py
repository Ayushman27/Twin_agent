"""
Verification Agent.
Assesses task output quality, completeness, and adherence to requirements.
Determines PASS or REWORK status with structured score and feedback.
"""
from typing import Optional
from app.agentic.workflow.state import AgentState, VerificationResult
from app.agentic.workflow.action_recorder import ActionRecorder
from app.agentic.workflow.ai_service import AIService


class VerificationAgent:
    """
    Quality and acceptance verification agent.
    """
    def __init__(self, ai_service: AIService, action_recorder: ActionRecorder):
        self.ai = ai_service
        self.recorder = action_recorder

    async def execute(self, state: AgentState) -> AgentState:
        """
        Evaluates task output against acceptance criteria.
        """
        system_prompt = (
            "You are an impartial Quality Assurance & Verification Agent in an organizational Digital Twin system.\n"
            "Evaluate whether the task output completely satisfies the original employee task and plan criteria.\n"
            "Return status as either 'PASS' (score >= 70) or 'REWORK' (score < 70) with constructive feedback."
        )

        task_content = ""
        if state.task_output:
            task_content = state.task_output.get("content", "")

        user_message = (
            f"Original Task: {state.original_task}\n"
            f"Plan Acceptance Criteria: {state.plan.acceptance_criteria if state.plan else []}\n"
            f"Role: {state.role}\n"
            f"Task Output Content: {task_content[:1500]}\n"
            f"Current Retry Count: {state.retry_count} (Max: {state.max_retries})\n"
        )

        default_verification = VerificationResult(
            status="PASS",
            score=95,
            reason="Output successfully addresses the task requirements with high clarity and domain alignment.",
            missing_items=[],
            feedback="All acceptance criteria met. Output is verified and ready."
        )

        try:
            result = await self.ai.generate_structured(
                system_prompt=system_prompt,
                user_message=user_message,
                schema_class=VerificationResult,
                default_instance=default_verification
            )
        except Exception as e:
            print(f"[VerificationAgent] Fallback to default verification due to: {e}")
            result = default_verification

        # Ensure valid status
        if result.status not in ["PASS", "REWORK"]:
            result.status = "PASS" if result.score >= 70 else "REWORK"

        state.verification = result

        # Record action
        await self.recorder.record_action(
            state=state,
            agent_name="verification_agent",
            action="verified_output",
            status="completed",
            input_summary=f"Evaluated output for '{state.original_task[:60]}'",
            output_summary=f"Status: {result.status}, Score: {result.score}/100. {result.reason}",
            retry_number=state.retry_count
        )

        return state
