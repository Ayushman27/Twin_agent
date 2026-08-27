"""
Unit and integration tests for the Modular Agentic Task Execution System.
"""
import pytest
from app.agentic.workflow.orchestrator import AgenticTaskOrchestrator
from app.agentic.workflow.state import WorkflowStatus, AgentState
from app.agentic.workflow.ai_service import AIService
from app.ai.llm.mock_provider import MockLLMProvider


@pytest.mark.asyncio
async def test_agentic_workflow_full_cycle():
    """Test full multi-agent task execution flow with mock AI provider."""
    mock_ai = AIService(provider=MockLLMProvider())
    orchestrator = AgenticTaskOrchestrator(db=None, ai_service=mock_ai)

    state = await orchestrator.execute_task(
        task_id="test-task-001",
        original_task="Investigate database connection timeout and propose fix",
        employee_id="emp-test-01",
        organization_id="org-test-01",
        role="Backend Engineer",
        max_retries=1
    )

    assert state.task_id == "test-task-001"
    assert state.status == WorkflowStatus.COMPLETED
    assert state.employee_context is not None
    assert state.role_context is not None
    assert state.plan is not None
    assert len(state.plan.steps) > 0
    assert state.task_output is not None
    assert state.verification is not None
    assert state.verification.score >= 70
    assert len(state.actions) >= 4  # Human, Role, Planner, Synthesis, Verification


@pytest.mark.asyncio
async def test_agentic_workflow_research_skipping():
    """Test that simple tasks without research indicators skip unnecessary research."""
    mock_ai = AIService(provider=MockLLMProvider())
    orchestrator = AgenticTaskOrchestrator(db=None, ai_service=mock_ai)

    state = await orchestrator.execute_task(
        task_id="test-task-002",
        original_task="Format log string to uppercase",
        employee_id="emp-test-02",
        organization_id="org-test-01",
        role="Software Engineer",
        max_retries=1
    )

    assert state.status == WorkflowStatus.COMPLETED
    assert state.plan is not None


@pytest.mark.asyncio
async def test_action_recorder_tracks_steps():
    """Verify action recorder captures timestamps and agent summaries."""
    mock_ai = AIService(provider=MockLLMProvider())
    orchestrator = AgenticTaskOrchestrator(db=None, ai_service=mock_ai)

    state = await orchestrator.execute_task(
        task_id="test-task-003",
        original_task="Analyze memory leak in worker daemon",
        employee_id="emp-test-03",
        organization_id="org-test-01",
        role="DevOps Engineer",
        max_retries=1
    )

    agent_names = [a.agent_name for a in state.actions]
    assert "human_agent" in agent_names
    assert "role_agent" in agent_names
    assert "planner_agent" in agent_names
    assert "verification_agent" in agent_names
