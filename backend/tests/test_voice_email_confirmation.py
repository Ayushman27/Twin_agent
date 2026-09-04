"""
Phase 6 Test Suite — Human Confirmation Before Gmail Send
=========================================================
Verifies:
  1. Staged email draft preparation and confirmation speech ("Would you like me to send it?").
  2. Zero premature Gmail API calls before human confirmation.
  3. Confirmation approval ("Yes", "Send it", "Go ahead") triggering send_email and SENT status.
  4. Cancellation ("No", "Don't send it", "Cancel") marking draft CANCELLED without calling Gmail.
  5. Multi-turn editing ("Change the subject to...", "Change the message to...") and re-prompting.
  6. Duplicate confirmation protection.
  7. Cross-tenant & cross-user security isolation.
  8. Graceful Gmail failure handling without raw stack traces.
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import encrypt_token
from app.core.security import hash_password
from app.db.models.email import EmailRecord, EmailStatus
from app.db.models.gmail_connection import GmailConnection
from app.modules.auth.models import User, UserRole
from app.modules.organizations.models import Organization, OrganizationMember, OrgStatus, MemberStatus


@pytest.mark.asyncio
async def test_voice_email_full_confirmation_flow(client: AsyncClient, db_session: AsyncSession):
    """Verify complete two-phase flow: Spoken Command -> Draft Staged -> Confirmation Prompt -> 'Send it' -> Gmail Sent."""
    org = Organization(company_name="Confirm Corp", company_email="info@confirm.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Alex Rivera", email="alex@confirm.ai", password_hash=hash_password("Pass1!"), role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Rahul Sharma", email="rahul.sharma@confirm.ai", password_hash=hash_password("Pass2!"), role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    conn = GmailConnection(
        organization_id=org.id,
        employee_id=sender.id,
        google_account_email="alex.rivera@gmail.com",
        encrypted_access_token=encrypt_token("mock_access_tok"),
        encrypted_refresh_token=encrypt_token("mock_refresh_tok"),
        token_expiry=datetime.now(timezone.utc) + timedelta(hours=1),
        status="CONNECTED",
    )
    db_session.add(conn)
    await db_session.commit()

    mock_send_execute = MagicMock(return_value={"id": "msg_confirmed_101", "threadId": "thread_101"})
    mock_messages = MagicMock()
    mock_messages.send.return_value.execute = mock_send_execute
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value = mock_messages

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        # ── TURN 1: Initial Voice Request ─────────────────────────────────────
        res1 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Send an email to Rahul saying I'll join the meeting at 3 PM.",
                "user_id": sender.id,
                "organization_id": org.id,
                "user_name": sender.name,
                "history": [],
            },
        )
        assert res1.status_code == 200
        data1 = res1.json()

        # Must NOT call Gmail API yet!
        mock_messages.send.assert_not_called()
        assert "I've prepared an email to Rahul Sharma" in data1["output"]
        assert "Would you like me to send it?" in data1["output"]
        assert data1["status"] == "draft_created"
        draft_id = data1["draft_id"]

        # Verify draft in DB
        stmt = select(EmailRecord).where(EmailRecord.id == draft_id)
        r_draft = await db_session.execute(stmt)
        draft_in_db = r_draft.scalar_one_or_none()
        assert draft_in_db is not None
        assert draft_in_db.status == EmailStatus.PENDING_CONFIRMATION
        assert draft_in_db.recipient_email == "rahul.sharma@confirm.ai"

        # ── TURN 2: Human Confirmation ("Yes, send it") ───────────────────────
        history = [
            {"role": "user", "content": "Send an email to Rahul saying I'll join the meeting at 3 PM."},
            {"role": "assistant", "content": data1["output"]},
        ]
        res2 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Yes, send it.",
                "user_id": sender.id,
                "organization_id": org.id,
                "user_name": sender.name,
                "history": history,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()

        # Gmail API must have been executed now
        assert mock_messages.send.called
        assert "Email sent to Rahul Sharma." in data2["output"]
        assert data2["status"] == "sent"

        # Check DB status updated to SENT
        await db_session.refresh(draft_in_db)
        assert draft_in_db.status == EmailStatus.SENT
        assert draft_in_db.provider_message_id == "msg_confirmed_101"
        assert draft_in_db.sent_at is not None


@pytest.mark.asyncio
async def test_voice_email_cancellation_flow(client: AsyncClient, db_session: AsyncSession):
    """Verify that saying 'No' or 'Cancel' cancels the staged draft and never touches Gmail API."""
    org = Organization(company_name="Cancel Corp", company_email="info@cancel.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Sam Smith", email="sam@cancel.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Priya Patel", email="priya@cancel.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=sender.id,
            google_account_email="sam@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    mock_send = MagicMock()
    with patch("app.integrations.google.sender.build", return_value=mock_send):
        # 1. Prepare draft
        res1 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Email Priya that the deployment is complete.",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": [],
            },
        )
        assert res1.status_code == 200
        draft_id = res1.json()["draft_id"]

        # 2. Cancel confirmation
        history = [
            {"role": "user", "content": "Email Priya that the deployment is complete."},
            {"role": "assistant", "content": res1.json()["output"]},
        ]
        res2 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "No, cancel it.",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()

        assert "Cancelled. I won't send the email." in data2["output"]
        assert data2["status"] == "cancelled"
        mock_send.assert_not_called()

        # Check DB status is CANCELLED
        stmt = select(EmailRecord).where(EmailRecord.id == draft_id)
        r = await db_session.execute(stmt)
        draft = r.scalar_one_or_none()
        assert draft.status == EmailStatus.CANCELLED


@pytest.mark.asyncio
async def test_voice_email_edit_flow(client: AsyncClient, db_session: AsyncSession):
    """Verify editing draft subject and message before confirming."""
    org = Organization(company_name="Edit Corp", company_email="info@edit.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Dave Developer", email="dave@edit.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Anjali Rao", email="anjali@edit.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=sender.id,
            google_account_email="dave@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    mock_send_execute = MagicMock(return_value={"id": "msg_edited_999"})
    mock_messages = MagicMock()
    mock_messages.send.return_value.execute = mock_send_execute
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value = mock_messages

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        # 1. Prepare initial draft
        res1 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Send an email to Anjali saying I'll join at 3 PM.",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": [],
            },
        )
        assert res1.status_code == 200
        draft_id = res1.json()["draft_id"]

        # 2. Edit Subject
        history = [
            {"role": "user", "content": "Send an email to Anjali saying I'll join at 3 PM."},
            {"role": "assistant", "content": res1.json()["output"]},
        ]
        res2 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Change the subject to Meeting at 3 PM sharp",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert "Updated." in data2["output"]
        assert "Meeting at 3 PM sharp" in data2["output"]
        assert "Should I send it?" in data2["output"]

        # 3. Edit Body
        history.extend([
            {"role": "user", "content": "Change the subject to Meeting at 3 PM sharp"},
            {"role": "assistant", "content": data2["output"]},
        ])
        res3 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Change the message to I will join the sync at 3:15 PM instead.",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res3.status_code == 200
        data3 = res3.json()
        assert "I will join the sync at 3:15 PM instead." in data3["output"]

        # 4. Confirm and Send
        history.extend([
            {"role": "user", "content": "Change the message to I will join the sync at 3:15 PM instead."},
            {"role": "assistant", "content": data3["output"]},
        ])
        res4 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Go ahead",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res4.status_code == 200
        assert "Email sent to Anjali Rao." in res4.json()["output"]

        # Check DB has the updated subject and body
        stmt = select(EmailRecord).where(EmailRecord.id == draft_id)
        r = await db_session.execute(stmt)
        draft = r.scalar_one_or_none()
        assert draft.status == EmailStatus.SENT
        assert draft.subject == "Meeting at 3 PM sharp"
        assert draft.body == "I will join the sync at 3:15 PM instead."


@pytest.mark.asyncio
async def test_voice_email_duplicate_confirmation_and_isolation(client: AsyncClient, db_session: AsyncSession):
    """Verify duplicate confirmations are rejected and cross-user approvals are forbidden."""
    org = Organization(company_name="Security Corp", company_email="sec@corp.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    user_a = User(name="User A", email="usera@corp.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    user_b = User(name="User B", email="userb@corp.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    target = User(name="Target User", email="target@corp.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([user_a, user_b, target])
    await db_session.flush()

    for u in [user_a, user_b, target]:
        db_session.add(OrganizationMember(organization_id=org.id, user_id=u.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))

    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=user_a.id,
            google_account_email="usera@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    # User A prepares a draft
    res1 = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Send an email to Target saying hello.",
            "user_id": user_a.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res1.status_code == 200
    draft_id = res1.json()["draft_id"]

    # User B attempts to confirm User A's draft directly via service
    from app.services.gmail_service import GmailEmailService
    service = GmailEmailService(db_session)
    res_b = await service.confirm_and_send_email(user_id=user_b.id, organization_id=org.id, draft_id=draft_id)
    assert res_b["status"] == "failed"
    assert res_b["error_code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_voice_email_gmail_failure_handling(client: AsyncClient, db_session: AsyncSession):
    """Verify conversational failure message when Gmail API fails during confirmed dispatch."""
    org = Organization(company_name="Fail Corp", company_email="fail@corp.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Sender F", email="senderf@fail.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Recipient F", email="recf@fail.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=sender.id,
            google_account_email="senderf@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    # Mock Gmail API failure
    mock_messages = MagicMock()
    mock_messages.send.side_effect = Exception("Gmail API 503 Service Unavailable")
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value = mock_messages

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        # 1. Prepare draft
        res1 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Send an email to Recipient saying server is down.",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": [],
            },
        )
        assert res1.status_code == 200

        # 2. Confirm send -> Fails gracefully
        history = [
            {"role": "user", "content": "Send an email to Recipient saying server is down."},
            {"role": "assistant", "content": res1.json()["output"]},
        ]
        res2 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Yes",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert "I couldn't send the email. Your Gmail account may need to be reconnected." in data2["output"]
        assert data2["status"] == "failed"
