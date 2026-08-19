"""Auth module — Pydantic v2 request/response schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.modules.auth.models import UserRole


# ── Request schemas ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:        str           = Field(..., min_length=2, max_length=255)
    email:       EmailStr
    password:    str           = Field(..., min_length=8, max_length=128)
    phone:       Optional[str] = Field(None, max_length=30)
    job_title:   Optional[str] = Field(None, max_length=255)
    department:  Optional[str] = Field(None, max_length=100)
    employee_id: Optional[str] = Field(None, max_length=50)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Response schemas ──────────────────────────────────────────
class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id:              str
    name:            str
    email:           str
    phone:           Optional[str] = None
    job_title:       Optional[str] = None
    department:      Optional[str] = None
    employee_id:     Optional[str] = None
    role:            UserRole
    is_active:       bool
    organization_id: Optional[str] = None
    created_at:      datetime


class TokenResponse(BaseModel):
    success:       bool = True
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserResponse


class MeResponse(BaseModel):
    success: bool = True
    data:    UserResponse


# ── Identity Context & Agent Access Bridge ────────────────────
class CurrentUser(BaseModel):
    """
    Authoritative identity context derived from Neon PostgreSQL.
    Exposes user_id, organization_id, and role across FastAPI endpoints.
    """
    model_config = {"from_attributes": True}

    user_id:         str
    email:           str
    name:            str
    role:            UserRole
    organization_id: Optional[str] = None
    is_active:       bool = True
    department:      Optional[str] = None
    job_title:       Optional[str] = None
    employee_id:     Optional[str] = None

    @property
    def is_company_admin(self) -> bool:
        return self.role in (UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)

    @property
    def is_employee(self) -> bool:
        return self.role == UserRole.EMPLOYEE

    @property
    def has_organization(self) -> bool:
        return bool(self.organization_id)


class AgentAccessContext(BaseModel):
    """
    Application-level bridge context for the Agent subsystem.
    Contains authoritative identity metadata derived from Neon PostgreSQL
    to be supplied to SQLite Agent operations.
    """
    user_id:         str
    organization_id: Optional[str] = None
    role:            UserRole
    user_name:       str
    user_email:      str
