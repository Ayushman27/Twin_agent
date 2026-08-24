"""Roles module — Pydantic schemas."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.roles.models import RoleRiskLevel, RoleStatus


class RoleCapabilitySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    risk_level: str
    approval_required: bool
    enabled: bool
    version: str
    required_tools: List[str] = Field(default_factory=list)
    required_permissions: List[str] = Field(default_factory=list)


class RoleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Role title, e.g., Senior Full-Stack Engineer")
    description: Optional[str] = Field(None, max_length=5000, description="Overview of role responsibilities")
    department: Optional[str] = Field(None, max_length=100, description="Department name, e.g., Engineering")
    responsibilities: List[str] = Field(default_factory=list, description="Key duties and deliverables")
    required_skills: List[str] = Field(default_factory=list, description="Technical and domain skills")
    tools: List[str] = Field(default_factory=list, description="Assigned tools (e.g. github, jira, terminal)")
    permissions: List[str] = Field(default_factory=list, description="Explicit permissions (e.g. github:write)")
    persona: Dict[str, Any] = Field(default_factory=dict, description="AI Twin persona guidelines (tone, style, etc.)")
    risk_level: RoleRiskLevel = Field(default=RoleRiskLevel.LOW, description="Operational risk classification")
    approval_rules: Dict[str, Any] = Field(default_factory=dict, description="Autonomous execution limits & human approval triggers")
    status: RoleStatus = Field(default=RoleStatus.ACTIVE, description="Lifecycle status")


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    department: Optional[str] = Field(None, max_length=100)
    responsibilities: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    permissions: Optional[List[str]] = None
    persona: Optional[Dict[str, Any]] = None
    risk_level: Optional[RoleRiskLevel] = None
    approval_rules: Optional[Dict[str, Any]] = None
    status: Optional[RoleStatus] = None


class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    employee_count: int = Field(default=0, description="Number of assigned employees")
    capabilities_count: int = Field(default=0, description="Number of configured agent capabilities")
    agent_groups_count: int = Field(default=0, description="Number of provisioned employee agent groups")
    created_at: datetime
    updated_at: datetime


class RoleWithCapabilitiesResponse(RoleResponse):
    capabilities: List[RoleCapabilitySummary] = Field(default_factory=list)


class RoleListResponse(BaseModel):
    roles: List[RoleResponse]
    total: int


class RoleCapabilitiesUpdateRequest(BaseModel):
    capabilities: List[str] = Field(
        ...,
        description="List of capability IDs or capability names to assign to the role",
    )


class RoleCapabilitiesListResponse(BaseModel):
    role_id: str
    role_name: str
    capabilities: List[RoleCapabilitySummary]
    total: int


class EmployeeRoleAssignRequest(BaseModel):
    role_id: str = Field(
        ...,
        description="Target organizational Job/AI Role ID to assign to the employee",
    )


class EmployeeRoleAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    organization_id: str
    user_id: str
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None
    membership_role: str = Field(
        default="EMPLOYEE",
        description="Organization membership authorization role (e.g. EMPLOYEE, ORG_ADMIN)",
    )
    assigned_role: Optional[RoleWithCapabilitiesResponse] = Field(
        None,
        description="Assigned organizational Job/AI Role blueprint with its capabilities bundle",
    )
    status: str = "ACTIVE"
    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class WorkforceProvisionRequest(BaseModel):
    role_id: Optional[str] = Field(
        None,
        description="Optional target role ID to assign and provision. If omitted, uses active role assignment.",
    )
    force_regenerate: bool = Field(
        default=False,
        description="If true, archives existing active agent group and provisions a fresh agent workforce.",
    )

