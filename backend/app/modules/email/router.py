"""
Email Module — HTTP Router
==========================
REST endpoints for employee directory resolution, email history, drafts, and email details.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_employee
from app.core.exceptions import BadRequestException
from app.db.session import get_agent_db, get_neon_db
from app.modules.auth.schemas import CurrentUser
from app.modules.email.schemas import (
    EmailDraftCreateRequest,
    EmailHistoryResponse,
    EmailRecordResponse,
    RecipientCandidate,
    RecipientResolveRequest,
    RecipientResolveResponse,
)
from app.modules.email.service import EmailService
from app.services.employee_directory import EmployeeDirectoryService

router = APIRouter()


@router.post(
    "/resolve-recipient",
    response_model=RecipientResolveResponse,
    summary="Resolve Employee Recipient from Directory",
    description="Resolves an employee name, email, or employee ID within the authenticated caller's organization.",
)
async def resolve_recipient(
    body: RecipientResolveRequest,
    current_user: CurrentUser = Depends(require_employee),
    db: AsyncSession = Depends(get_neon_db),
) -> RecipientResolveResponse:
    directory_service = EmployeeDirectoryService(db)
    result = await directory_service.resolve_recipient(
        organization_id=current_user.organization_id,
        query=body.query,
        sender_id=current_user.user_id,
    )
    return RecipientResolveResponse(
        success=result.success,
        status=result.status,
        query=result.query,
        message=result.message,
        employee=RecipientCandidate(**result.employee.to_dict()) if result.employee else None,
        candidates=[RecipientCandidate(**c.to_dict()) for c in result.candidates],
    )


@router.post(
    "/draft",
    response_model=EmailRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an Email Record or Draft",
    description="Creates a new email record for tracking and dispatch.",
)
async def create_email_draft(
    body: EmailDraftCreateRequest,
    current_user: CurrentUser = Depends(require_employee),
    neon_db: AsyncSession = Depends(get_neon_db),
    agent_db: AsyncSession = Depends(get_agent_db),
) -> EmailRecordResponse:
    recipient_email = str(body.recipient_email) if body.recipient_email else None
    recipient_id = body.recipient_employee_id

    # If recipient_email is omitted, resolve via recipient_query
    if not recipient_email and body.recipient_query:
        directory_service = EmployeeDirectoryService(neon_db)
        res = await directory_service.resolve_recipient(
            organization_id=current_user.organization_id,
            query=body.recipient_query,
            sender_id=current_user.user_id,
        )
        if not res.success or not res.employee:
            raise BadRequestException(res.message)
        recipient_email = res.employee.email
        recipient_id = res.employee.user_id

    if not recipient_email:
        raise BadRequestException("A valid recipient_email or resolvable recipient_query is required.")

    email_service = EmailService(agent_db)
    record = await email_service.create_email(
        organization_id=current_user.organization_id,
        sender_employee_id=current_user.user_id,
        recipient_email=recipient_email,
        subject=body.subject,
        body=body.body,
        recipient_employee_id=recipient_id,
        status=body.status,
        meta_data=body.meta_data,
    )
    return EmailRecordResponse.model_validate(record)


@router.get(
    "/history",
    response_model=EmailHistoryResponse,
    summary="Get Employee Email History",
    description="Lists email records sent or received by the current employee within their organization.",
)
async def get_email_history(
    folder: str = Query("all", pattern="^(all|sent|received)$", description="Filter by folder: all, sent, or received"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: CurrentUser = Depends(require_employee),
    agent_db: AsyncSession = Depends(get_agent_db),
) -> EmailHistoryResponse:
    email_service = EmailService(agent_db)
    records, total = await email_service.list_email_history(
        user_id=current_user.user_id,
        organization_id=current_user.organization_id,
        limit=limit,
        offset=offset,
        folder=folder,
    )
    return EmailHistoryResponse(
        emails=[EmailRecordResponse.model_validate(r) for r in records],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{email_id}",
    response_model=EmailRecordResponse,
    summary="Get Email Details",
    description="Retrieves details of a specific email. Caller must be the sender or recipient.",
)
async def get_email_details(
    email_id: str,
    current_user: CurrentUser = Depends(require_employee),
    agent_db: AsyncSession = Depends(get_agent_db),
) -> EmailRecordResponse:
    email_service = EmailService(agent_db)
    record = await email_service.get_email_by_id(
        email_id=email_id,
        user_id=current_user.user_id,
        organization_id=current_user.organization_id,
    )
    return EmailRecordResponse.model_validate(record)
