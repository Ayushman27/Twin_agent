"""Applications module — Pydantic v2 schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.modules.applications.models import ApplicationStatus


class BusinessInformation(BaseModel):
    industry:       Optional[str]       = None
    business_model: Optional[str]       = None
    company_size:   Optional[str]       = None
    departments:    Optional[List[str]] = None
    business_goals: Optional[List[str]] = None


class TechnicalInformation(BaseModel):
    existing_tools:       Optional[List[str]] = None
    programming_languages:Optional[List[str]] = None
    cloud_provider:       Optional[str]       = None
    repositories:         Optional[List[str]] = None


class WorkflowInformation(BaseModel):
    current_workflow:       Optional[str]       = None
    task_management_system: Optional[str]       = None
    communication_tools:    Optional[List[str]] = None
    approval_process:       Optional[str]       = None


class AIRequirements(BaseModel):
    desired_agents:          Optional[List[str]] = None
    automation_requirements: Optional[List[str]] = None
    roles_to_support:        Optional[List[str]] = None
    expected_use_cases:      Optional[List[str]] = None


class ApplicationCreate(BaseModel):
    organization_id:       str
    business_information:  Optional[BusinessInformation]  = None
    technical_information: Optional[TechnicalInformation] = None
    workflow_information:  Optional[WorkflowInformation]  = None
    ai_requirements:       Optional[AIRequirements]       = None


class ApplicationUpdate(BaseModel):
    business_information:  Optional[BusinessInformation]  = None
    technical_information: Optional[TechnicalInformation] = None
    workflow_information:  Optional[WorkflowInformation]  = None
    ai_requirements:       Optional[AIRequirements]       = None


class ApplicationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id:                    str
    organization_id:       str
    submitted_by:          Optional[str]
    status:                ApplicationStatus
    business_information:  Optional[Dict[str, Any]]
    technical_information: Optional[Dict[str, Any]]
    workflow_information:  Optional[Dict[str, Any]]
    ai_requirements:       Optional[Dict[str, Any]]
    review_notes:          Optional[str]
    created_at:            datetime
    updated_at:            datetime
