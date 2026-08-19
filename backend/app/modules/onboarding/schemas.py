"""Onboarding module — Request and Response schemas."""
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.modules.auth.schemas import UserResponse
from app.modules.organizations.schemas import OrganizationResponse


class CompanyRegisterRequest(BaseModel):
    # ── Company Information ──────────────────────────────────
    company_name:    str            = Field(..., min_length=2, max_length=255, description="Full registered company name")
    company_email:   EmailStr       = Field(..., description="Official company contact email")
    industry:        str            = Field(..., min_length=2, max_length=100, description="Industry domain")
    company_size:    str            = Field(..., min_length=1, max_length=50,  description="Company size tier, e.g., 51-200")
    employee_count:  int            = Field(..., ge=1, description="Total employee count (positive integer)")
    company_phone:   Optional[str]  = Field(None, max_length=30)
    website:         Optional[str]  = Field(None, max_length=500)
    country:         Optional[str]  = Field(None, max_length=100)
    city:            Optional[str]  = Field(None, max_length=100)
    business_model:  Optional[str]  = Field(None, max_length=100)
    description:     Optional[str]  = None
    primary_contact: Optional[str]  = Field(None, max_length=255)

    # ── Organization Administrator ───────────────────────────
    admin_name:      str            = Field(..., min_length=2, max_length=255, description="Administrator full name")
    admin_email:     EmailStr       = Field(..., description="Administrator personal work email")
    admin_phone:     Optional[str]  = Field(None, max_length=30)
    admin_password:  str            = Field(..., min_length=8, max_length=128, description="Strong password")
    confirm_password: Optional[str] = Field(None, min_length=8, max_length=128)

    @field_validator("admin_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def validate_password_match(self) -> "CompanyRegisterRequest":
        if self.confirm_password and self.admin_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class CompanyRegisterResponse(BaseModel):
    success:       bool = True
    message:       str  = "Organization registered successfully."
    access_token:  str
    refresh_token: str
    token_type:    str  = "bearer"
    organization:  OrganizationResponse
    user:          UserResponse


# ── Employee Registration Schemas ────────────────────────────
class EmployeeRegisterRequest(BaseModel):
    organization_id:  str            = Field(..., description="ID of the registered organization to join")
    name:             str            = Field(..., min_length=2, max_length=255, description="Employee full name")
    email:            EmailStr       = Field(..., description="Employee work or personal email")
    password:         str            = Field(..., min_length=8, max_length=128, description="Strong password")
    confirm_password: Optional[str]  = Field(None, min_length=8, max_length=128)
    employee_id:      Optional[str]  = Field(None, max_length=50,  description="Internal company employee ID")
    department:       Optional[str]  = Field(None, max_length=100, description="Department name")
    job_title:        Optional[str]  = Field(None, max_length=255, description="Role or job title")
    phone:            Optional[str]  = Field(None, max_length=30,  description="Phone number")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def validate_password_match(self) -> "EmployeeRegisterRequest":
        if self.confirm_password and self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class EmployeeRegisterResponse(BaseModel):
    success:       bool = True
    message:       str  = "Employee registered successfully."
    access_token:  str
    refresh_token: str
    token_type:    str  = "bearer"
    organization:  OrganizationResponse
    user:          UserResponse


# ── Public Discovery Schemas ─────────────────────────────────
class PublicCompanyItem(BaseModel):
    model_config = {"from_attributes": True}

    id:           str
    company_name: str
    industry:     Optional[str] = None
    city:         Optional[str] = None
    country:      Optional[str] = None


class PublicCompaniesResponse(BaseModel):
    success: bool = True
    total:   int
    data:    List[PublicCompanyItem]
