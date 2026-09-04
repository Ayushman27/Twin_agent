"""
Automated Test Suite for Phase 4 — Gmail Email Service and Send_Email Tool
==========================================================================
"""
import base64
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from unittest.mock import MagicMock, patch

import pytest
from googleapiclient.errors import HttpError
from httplib2 import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agentic.registry.tool_registry import ToolRegistry
from app.core.config import settings
from app.core.encryption import encrypt_token
from app.core.security import hash_password
from app.db.models.email import EmailRecord, EmailStatus
from app.db.models.gmail_connection import GmailConnection
from app.modules.auth.models import User, UserRole
from app.modules.organizations.models import MemberStatus, Organization, OrganizationMember, OrgStatus
from app.services.gmail_service import GmailEmailService


@pytest.fixture(autouse=True)
def setup_google_settings(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "mock-client-secret-12345")
    monkeypatch.setattr(settings, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/google/callback")


@pytest.mark.asyncio
async def test_tool_registry_send_email_registration():
    """Verify send_email is registered in the ToolRegistry with correct permissions."""
    tool = ToolRegistry.get_tool("send_email")
    assert tool is not None
    assert tool["tool_id"] == "send_email"
    assert tool["name"] == "Send Email Tool"
    assert "send_email" in tool["capabilities"]
    assert "email:send" in tool["required_permissions"]
    assert tool["enabled"] is True

    # Validate assignment
    assert ToolRegistry.validate_tool_assignment("send_email", ["email:send"]) is True
    assert ToolRegistry.validate_tool_assignment("send_email", ["admin:all"]) is True
    assert ToolRegistry.validate_tool_assignment("send_email", ["other:perm"]) is False


@pytest.mark.asyncio
async def test_send_email_successful_delivery_and_audit(db_session: AsyncSession):
    """Verify full end-to-end send_email execution with recipient resolution and audit trail."""
    # ── Setup Organization and Employees ──────────────────────────────────────
    org = Organization(
        company_name="Apex Corp",
        company_email="contact@apex.ai",
        status=OrgStatus.ACTIVE,
    )
    db_session.add(org)
    await db_session.flush()

    sender = User(
        name="Sender Employee",
        email="sender@apex.ai",
        password_hash=hash_password("Pass1!"),
        role=UserRole.EMPLOYEE,
        job_title="Lead Architect",
        is_active=True,
    )
    recipient = User(
        name="Rahul Sharma",
        email="rahul.sharma@apex.ai",
        password_hash=hash_password("Pass2!"),
        role=UserRole.EMPLOYEE,
        job_title="Software Engineer",
        department="Core Platform",
        employee_id="EMP-501",
        is_active=True,
    )
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    # Connect sender's Gmail account
    gmail_conn = GmailConnection(
        organization_id=org.id,
        employee_id=sender.id,
        google_account_email="sender.personal@gmail.com",
        encrypted_access_token=encrypt_token("mock_access_token_123"),
        encrypted_refresh_token=encrypt_token("mock_refresh_token_456"),
        token_expiry=datetime.now(timezone.utc) + timedelta(hours=2),
        scopes=["https://www.googleapis.com/auth/gmail.send"],
        status="CONNECTED",
    )
    db_session.add(gmail_conn)
    await db_session.commit()

    # Mock Gmail API build and messages().send().execute()
    mock_send_execute = MagicMock(return_value={"id": "msg_gmail_999", "threadId": "thread_888"})
    mock_messages = MagicMock()
    mock_messages.send.return_value.execute = mock_send_execute
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value = mock_messages

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        service = GmailEmailService(db_session)
        result = await service.send_email(
            user_id=sender.id,
            organization_id=org.id,
            recipient="Rahul",
            subject="Meeting at 3 PM",
            body="Hi Rahul, I will join the meeting at 3 PM today.",
            agent_id="VoiceAgent_Echo",
        )

    # 1. Check Tool Output Format
    assert result["status"] == "sent"
    assert result["recipient"] == "Rahul Sharma"
    assert result["recipient_email"] == "rahul.sharma@apex.ai"
    assert result["message_id"] == "msg_gmail_999"
    assert "timestamp" in result

    # 2. Check Database EmailRecord Audit Entry
    stmt = select(EmailRecord).where(EmailRecord.sender_employee_id == sender.id)
    res_records = await db_session.execute(stmt)
    records = list(res_records.scalars().all())
    assert len(records) == 1
    rec = records[0]
    assert rec.recipient_employee_id == recipient.id
    assert rec.recipient_email == "rahul.sharma@apex.ai"
    assert rec.subject == "Meeting at 3 PM"
    assert rec.status == EmailStatus.SENT
    assert rec.provider_message_id == "msg_gmail_999"
    assert rec.sent_at is not None
    assert rec.meta_data.get("sender_google_email") == "sender.personal@gmail.com"


@pytest.mark.asyncio
async def test_send_email_disconnected_gmail(db_session: AsyncSession):
    """Verify tool failure when employee has not connected Gmail."""
    org = Organization(company_name="Org Unconnected", company_email="contact@unconn.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="No Gmail User", email="nogmail@unconn.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add(sender)
    await db_session.flush()
    db_session.add(OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))
    await db_session.commit()

    service = GmailEmailService(db_session)
    res = await service.send_email(
        user_id=sender.id,
        organization_id=org.id,
        recipient="any@company.ai",
        subject="Hello",
        body="World",
    )

    assert res["status"] == "failed"
    assert res["error_code"] == "GMAIL_NOT_CONNECTED"
    assert "connect Gmail" in res["user_message"]


@pytest.mark.asyncio
async def test_send_email_ambiguous_and_nonexistent_recipients(db_session: AsyncSession):
    """Verify ambiguity and not found handling for recipient resolution."""
    org = Organization(company_name="Ambiguity Org", company_email="contact@amb.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Main Sender", email="mainsender@amb.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    user_a = User(name="Sam Wilson", email="sam.eng@amb.ai", password_hash="pass", department="Engineering", role=UserRole.EMPLOYEE, is_active=True)
    user_b = User(name="Sam Davis", email="sam.sales@amb.ai", password_hash="pass", department="Sales", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, user_a, user_b])
    await db_session.flush()

    for u in [sender, user_a, user_b]:
        db_session.add(OrganizationMember(organization_id=org.id, user_id=u.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))

    # Add Gmail connection
    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=sender.id,
            google_account_email="sender@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    service = GmailEmailService(db_session)

    # 1. Ambiguous Recipient ("Sam")
    res_amb = await service.send_email(
        user_id=sender.id,
        organization_id=org.id,
        recipient="Sam",
        subject="Hey",
        body="Test body",
    )
    assert res_amb["status"] == "failed"
    assert res_amb["error_code"] == "AMBIGUOUS_RECIPIENT"
    assert len(res_amb["candidates"]) == 2

    # 2. Nonexistent Recipient
    res_none = await service.send_email(
        user_id=sender.id,
        organization_id=org.id,
        recipient="Zack Nonexistent",
        subject="Hey",
        body="Test body",
    )
    assert res_none["status"] == "failed"
    assert res_none["error_code"] == "RECIPIENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_send_email_cross_organization_isolation(db_session: AsyncSession):
    """Verify that employee in Org A cannot send email to employee in Org B via directory name resolution."""
    org_a = Organization(company_name="Org One", company_email="one@corp.ai", status=OrgStatus.ACTIVE)
    org_b = Organization(company_name="Org Two", company_email="two@corp.ai", status=OrgStatus.ACTIVE)
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    sender_a = User(name="User in Org A", email="sender@orgone.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    target_b = User(name="Target in Org B", email="target@orgtwo.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender_a, target_b])
    await db_session.flush()

    db_session.add(OrganizationMember(organization_id=org_a.id, user_id=sender_a.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))
    db_session.add(OrganizationMember(organization_id=org_b.id, user_id=target_b.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))

    db_session.add(
        GmailConnection(
            organization_id=org_a.id,
            employee_id=sender_a.id,
            google_account_email="sender_a@gmail.com",
            encrypted_access_token=encrypt_token("tok_a"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    service = GmailEmailService(db_session)
    res = await service.send_email(
        user_id=sender_a.id,
        organization_id=org_a.id,
        recipient="Target in Org B",
        subject="Private Project",
        body="Hello from Org A",
    )
    assert res["status"] == "failed"
    assert res["error_code"] == "RECIPIENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_send_email_token_refresh_and_api_error_handling(db_session: AsyncSession):
    """Verify automatic token refresh and API error propagation."""
    org = Organization(company_name="Org Refresh", company_email="ref@corp.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Refresh User", email="refresh@corp.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add(sender)
    await db_session.flush()
    db_session.add(OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))

    # Connection with expired access token and valid refresh token
    conn = GmailConnection(
        organization_id=org.id,
        employee_id=sender.id,
        google_account_email="refresh@gmail.com",
        encrypted_access_token=encrypt_token("expired_access_token"),
        encrypted_refresh_token=encrypt_token("valid_refresh_token"),
        token_expiry=datetime.now(timezone.utc) - timedelta(hours=1),
        status="CONNECTED",
    )
    db_session.add(conn)
    await db_session.commit()

    # Mock token refresh on Credentials
    def mock_refresh(request):
        conn.encrypted_access_token = encrypt_token("newly_refreshed_access_token")

    # Mock Gmail API throwing HttpError
    http_resp = Response({"status": "403", "reason": "Rate Limit Exceeded"})
    mock_http_error = HttpError(resp=http_resp, content=b"Daily User Sending Quota Exceeded")

    mock_send = MagicMock()
    mock_send.execute.side_effect = mock_http_error
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value.send.return_value = mock_send

    with patch("app.integrations.google.sender.build", return_value=mock_service), \
         patch("google.oauth2.credentials.Credentials.refresh", side_effect=mock_refresh):

        service = GmailEmailService(db_session)
        res = await service.send_email(
            user_id=sender.id,
            organization_id=org.id,
            recipient="test@example.com",
            subject="Testing Refresh",
            body="Content",
        )

    assert res["status"] == "failed"
    assert res["error_code"] == "GMAIL_SEND_ERROR"
    assert "Daily User Sending Quota Exceeded" in res["user_message"] or "403" in res["user_message"]

    # Verify EmailRecord in DB marked as FAILED
    stmt = select(EmailRecord).where(EmailRecord.sender_employee_id == sender.id)
    rec = (await db_session.execute(stmt)).scalars().first()
    assert rec is not None
    assert rec.status == EmailStatus.FAILED
    assert "403" in rec.error_message or "Daily User Sending Quota Exceeded" in rec.error_message
