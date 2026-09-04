"""
Pydantic Schemas for Internal Employee Email Module
===================================================
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models.email import EmailStatus


class RecipientCandidate(BaseModel):
    user_id: str
    name: str
    email: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    role: Optional[str] = None
    employee_id: Optional[str] = None


class RecipientResolveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=255, description="Employee name, email, or employee ID to resolve")


class RecipientResolveResponse(BaseModel):
    success: bool
    status: str  # "RESOLVED", "AMBIGUOUS", "NOT_FOUND"
    query: str
    message: str
    employee: Optional[RecipientCandidate] = None
    candidates: List[RecipientCandidate] = Field(default_factory=list)


class EmailDraftCreateRequest(BaseModel):
    recipient_query: Optional[str] = Field(None, description="Employee name, email, or ID to resolve if recipient_email is not specified")
    recipient_employee_id: Optional[str] = None
    recipient_email: Optional[EmailStr] = None
    subject: str = Field(..., min_length=1, max_length=500)
    body: str = Field(..., min_length=1)
    status: Optional[EmailStatus] = EmailStatus.DRAFT
    meta_data: Optional[Dict[str, Any]] = None


class EmailRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    sender_employee_id: str
    recipient_employee_id: Optional[str] = None
    recipient_email: str
    subject: str
    body: str
    status: EmailStatus
    created_at: datetime
    sent_at: Optional[datetime] = None
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None


class EmailHistoryResponse(BaseModel):
    emails: List[EmailRecordResponse]
    total: int
    limit: int
    offset: int
