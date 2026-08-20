"""Organizations module — Pydantic v2 schemas."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.modules.organizations.models import MemberStatus, OrgStatus


class OrganizationCreate(BaseModel):
    company_name:    str            = Field(..., min_length=2, max_length=255)
    company_email:   Optional[EmailStr] = None
    company_phone:   Optional[str]      = Field(None, max_length=30)
    industry:        Optional[str]      = Field(None, max_length=100)
    company_size:    Optional[str]      = Field(None, max_length=50)
    employee_count:  Optional[int]      = Field(None, ge=1)
    website:         Optional[str]      = Field(None, max_length=500)
    country:         Optional[str]      = Field(None, max_length=100)
    city:            Optional[str]      = Field(None, max_length=100)
    description:     Optional[str]      = None
    business_model:  Optional[str]      = Field(None, max_length=100)
    primary_contact: Optional[str]      = Field(None, max_length=255)


class OrganizationUpdate(BaseModel):
    company_name:    Optional[str]      = None
    company_email:   Optional[EmailStr] = None
    company_phone:   Optional[str]      = None
    industry:        Optional[str]      = None
    company_size:    Optional[str]      = None
    employee_count:  Optional[int]      = Field(None, ge=1)
    website:         Optional[str]      = None
    country:         Optional[str]      = None
    city:            Optional[str]      = None
    description:     Optional[str]      = None
    business_model:  Optional[str]      = None
    primary_contact: Optional[str]      = None


class OrganizationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id:              str
    company_name:    str
    company_email:   Optional[str]
    company_phone:   Optional[str]
    industry:        Optional[str]
    company_size:    Optional[str]
    employee_count:  Optional[int] = None
    website:         Optional[str]
    country:         Optional[str]
    city:            Optional[str]
    description:     Optional[str]
    business_model:  Optional[str]
    primary_contact: Optional[str]
    status:          OrgStatus
    created_at:      datetime
    updated_at:      datetime


class MemberResponse(BaseModel):
    model_config = {"from_attributes": True}

    id:              str
    organization_id: str
    user_id:         str
    role:            str
    status:          MemberStatus


class MemberDetailResponse(BaseModel):
    id:              str
    organization_id: str
    user_id:         str
    role:            str
    status:          MemberStatus
    name:            Optional[str] = None
    email:           Optional[str] = None
    employee_id:     Optional[str] = None
    department:      Optional[str] = None
    job_title:       Optional[str] = None
    created_at:      Optional[datetime] = None


class OrganizationStatsResponse(BaseModel):
    total_members:       int
    active_members:      int
    pending_invitations: int
    teams_count:         int = 6
    roles_count:         int = 14
