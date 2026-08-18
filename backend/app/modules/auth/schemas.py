"""Auth module — Pydantic v2 request/response schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.modules.auth.models import UserRole


# ── Request schemas ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:      str      = Field(..., min_length=2, max_length=255)
    email:     EmailStr
    password:  str      = Field(..., min_length=8, max_length=128)
    phone:     Optional[str] = Field(None, max_length=30)
    job_title: Optional[str] = Field(None, max_length=255)

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

    id:         str
    name:       str
    email:      str
    phone:      Optional[str]
    job_title:  Optional[str]
    role:       UserRole
    is_active:  bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserResponse


class MeResponse(BaseModel):
    success: bool = True
    data:    UserResponse
