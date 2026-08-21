"""
Pydantic schemas for the Dynamic Agentic Layer.
These define the API request/response structures for agents, groups, capabilities, etc.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ConfigBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AgentCapabilityBase(ConfigBase):
    name: str
    description: str
    supported_roles: List[str]
    required_tools: List[str]
    required_permissions: List[str]
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    system_instructions: str
    risk_level: str
    approval_required: bool
    enabled: bool
    version: str


class AgentCapabilityCreate(AgentCapabilityBase):
    pass


class AgentCapabilityResponse(AgentCapabilityBase):
    id: str
    created_at: datetime
    updated_at: datetime


class RoleCriteriaBase(ConfigBase):
    role_id: str
    responsibilities: List[str]
    skills: List[str]
    tools: List[str]
    capabilities_required: List[str]
    permissions: List[str]
    risk_level: str
    approval_rules: Dict[str, Any]


class RoleCriteriaResponse(RoleCriteriaBase):
    id: str


class AgentBase(ConfigBase):
    name: str
    custom_instructions: Optional[str] = None
    assigned_tools: List[str]
    permissions: List[str]
    status: str


class AgentResponse(AgentBase):
    id: str
    agent_group_id: str
    capability_id: str
    created_at: datetime
    updated_at: datetime
    capability: Optional[AgentCapabilityResponse] = None


class AgentGroupBase(ConfigBase):
    organization_id: str
    employee_id: str
    name: str
    status: str


class AgentGroupResponse(AgentGroupBase):
    id: str
    created_at: datetime
    updated_at: datetime
    agents: List[AgentResponse]


class ExecutionEvidenceBase(ConfigBase):
    action_taken: str
    evidence_type: str
    evidence_data: Dict[str, Any]
    confidence_score: Optional[float] = None
    verification_status: str


class ExecutionEvidenceResponse(ExecutionEvidenceBase):
    id: str
    execution_id: str
    created_at: datetime


class AgentExecutionBase(ConfigBase):
    task_id: str
    parent_task_id: Optional[str] = None
    status: str
    objective: str
    inputs: Dict[str, Any]
    outputs: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class AgentExecutionResponse(AgentExecutionBase):
    id: str
    agent_id: str
    created_at: datetime
    updated_at: datetime
    evidence: List[ExecutionEvidenceResponse]


class ApprovalRequestBase(ConfigBase):
    action_description: str
    risk_level: str
    status: str
    comments: Optional[str] = None


class ApprovalRequestResponse(ApprovalRequestBase):
    id: str
    execution_id: str
    requested_by_agent_id: str
    approver_id: Optional[str]
    created_at: datetime
    updated_at: datetime
