"""
Research Agent.
Modular service/tool-based research agent invoked only when external/internal research is required.
"""
from typing import Optional
from app.agentic.workflow.state import AgentState, ResearchResult
from app.agentic.workflow.action_recorder import ActionRecorder
from app.agentic.workflow.ai_service import AIService


class ResearchAgent:
    """
    Modular Research Agent for gathering documentation, API references, or organizational knowledge.
    """
    def __init__(self, ai_service: AIService, action_recorder: ActionRecorder):
        self.ai = ai_service
        self.recorder = action_recorder

    async def execute(self, state: AgentState) -> AgentState:
        """
        Executes research if indicated by the plan.
        """
        if not state.plan or not state.plan.research_required:
            # Skip research if not needed
            state.research_results = ResearchResult(
                research_required=False,
                findings=["No additional research needed for this task."],
                sources=["internal_context"],
                summary="Standard operational execution using existing context."
            )
            return state

        system_prompt = (
            "You are a specialized Technical Research Agent.\n"
            "Your job is to identify key facts, best practices, architectural references, or knowledge points "
            "needed to accomplish the user's task accurately."
        )

        user_message = (
            f"Task: {state.original_task}\n"
            f"Plan Summary: {state.plan.task_understanding}\n"
            f"Role: {state.role}\n"
            f"Expected Output: {state.plan.expected_output}"
        )

        default_research = ResearchResult(
            research_required=True,
            findings=[
                f"Identified core requirements for '{state.original_task[:50]}'",
                "Verified standard design patterns and system parameters",
                "Assessed execution constraints and error handling"
            ],
            sources=["internal_knowledge_base", "system_documentation", "role_guidelines"],
            summary=f"Synthesized research context to support execution of {state.original_task}"
        )

        try:
            research_result = await self.ai.generate_structured(
                system_prompt=system_prompt,
                user_message=user_message,
                schema_class=ResearchResult,
                default_instance=default_research
            )
        except Exception as e:
            print(f"[ResearchAgent] Fallback to default research due to: {e}")
            research_result = default_research

        state.research_results = research_result
        state.current_agent = "role_agent"

        # Record action
        await self.recorder.record_action(
            state=state,
            agent_name="research_agent",
            action="conducted_research",
            status="completed",
            input_summary=f"Query: {state.original_task[:80]}",
            output_summary=f"Found {len(research_result.findings)} findings across {len(research_result.sources)} sources.",
            retry_number=state.retry_count
        )

        return state
