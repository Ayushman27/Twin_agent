"""
Strongly typed shared AgentState and schemas for the Modular Agentic Task Execution System.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WorkflowStatus(str, Enum):
    PENDING = "PENDING"
    PLANNING = "PLANNING"
    RESEARCHING = "RESEARCHING"
    PROCESSING = "PROCESSING"
    VERIFYING = "VERIFYING"
    REWORKING = "REWORKING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaskPlanStep(BaseModel):
    step_number: int
    description: str
    status: str = "pending"


class TaskPlan(BaseModel):
    task_understanding: str
    steps: List[TaskPlanStep] = Field(default_factory=list)
    research_required: bool = False
    expected_output: str = ""
    acceptance_criteria: List[str] = Field(default_factory=list)


class ResearchResult(BaseModel):
    research_required: bool = False
    findings: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    summary: str = ""


class ActionRecord(BaseModel):
    task_id: str
    agent_name: str
    action: str
    status: str
    timestamp: str
    input_summary: Optional[str] = None
    output_summary: Optional[str] = None
    error: Optional[str] = None
    retry_number: int = 0


class VerificationResult(BaseModel):
    status: str = "PASS"  # "PASS" or "REWORK"
    score: int = 100      # 0-100
    reason: str = "Task completed successfully"
    missing_items: List[str] = Field(default_factory=list)
    feedback: str = ""


class AgentState(BaseModel):
    """
    Strongly typed shared state passed through all agents in the controlled workflow.
    """
    task_id: str
    organization_id: str
    employee_id: str
    role: str = "EMPLOYEE"
    original_task: str
    
    employee_context: Dict[str, Any] = Field(default_factory=dict)
    role_context: Dict[str, Any] = Field(default_factory=dict)
    
    plan: Optional[TaskPlan] = None
    research_results: Optional[ResearchResult] = None
    task_output: Optional[Dict[str, Any]] = None
    
    actions: List[ActionRecord] = Field(default_factory=list)
    verification: Optional[VerificationResult] = None
    
    current_agent: str = "human_agent"
    status: WorkflowStatus = WorkflowStatus.PENDING
    
    retry_count: int = 0
    max_retries: int = 1
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
