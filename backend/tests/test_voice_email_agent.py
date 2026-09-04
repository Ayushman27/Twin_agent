"""
Automated Test Suite for Phase 5 — Voice Command to Gmail Send_Email
====================================================================
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.encryption import encrypt_token
from app.core.security import create_access_token, hash_password
from app.db.models.gmail_connection import GmailConnection
from app.modules.auth.models import User, UserRole
from app.modules.demo_agent.voice_execution import extract_voice_intent
from app.modules.organizations.models import MemberStatus, Organization, OrganizationMember, OrgStatus


@pytest.fixture(autouse=True)
def setup_google_settings(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "mock-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "mock-client-secret-12345")
    monkeypatch.setattr(settings, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/integrations/google/callback")


@pytest.mark.asyncio
async def test_extract_voice_intent_patterns():
    """Verify natural language spoken voice patterns for SEND_EMAIL extraction."""
    # 1. Standard pattern
    res1 = await extract_voice_intent("Send an email to Rahul saying I'll join the meeting at 3 PM", [])
    assert res1["intent"] == "SEND_EMAIL"
    assert res1["recipient"].lower() == "rahul"
    assert "join the meeting at 3 PM" in res1["body"]
    assert "Meeting" in res1["subject"]

    # 2. Email [recipient] that [body]
    res2 = await extract_voice_intent("Email Priya that the deployment is complete.", [])
    assert res2["intent"] == "SEND_EMAIL"
    assert res2["recipient"].lower() == "priya"
    assert "deployment is complete" in res2["body"]
    assert "Deployment" in res2["subject"]

    # 3. Mail [recipient] saying [body]
    res3 = await extract_voice_intent("Mail Rahul that the API is ready.", [])
    assert res3["intent"] == "SEND_EMAIL"
    assert res3["recipient"].lower() == "rahul"
    assert "API is ready" in res3["body"]

    # 4. Conversational / Polite leading phrases
    res4 = await extract_voice_intent("Can you send Priya an email saying I'll be late?", [])
    assert res4["intent"] == "SEND_EMAIL"
    assert res4["recipient"].lower() == "priya"
    assert "late" in res4["body"]

    # 5. Tell [recipient] through email that [body]
    res5 = await extract_voice_intent("Tell Anjali through email that the report is complete.", [])
    assert res5["intent"] == "SEND_EMAIL"
    assert res5["recipient"].lower() == "anjali"
    assert "report is complete" in res5["body"]

    # 6. Missing Body
    res6 = await extract_voice_intent("Send an email to Rahul", [])
    assert res6["intent"] == "SEND_EMAIL"
    assert res6["recipient"].lower() == "rahul"
    assert res6["body"] is None

    # 7. Generic Email
    res7 = await extract_voice_intent("I want to send an email", [])
    assert res7["intent"] == "SEND_EMAIL"
    assert res7["recipient"] is None
    assert res7["body"] is None

    # 8. Preserved Telegram Messaging Pattern
    res8 = await extract_voice_intent("Send a message to Shreyasi saying hello", [])
    assert res8["intent"] == "SEND_MESSAGE"
    assert res8["recipient"].lower() == "shreyasi"
    assert res8["text"].lower() == "hello"


@pytest.mark.asyncio
async def test_voice_execution_full_email_flow(client: AsyncClient, db_session: AsyncSession):
    """Verify voice prompt execution for full email dispatch."""
    # ── Setup Organization and Users ──────────────────────────────────────────
    org = Organization(company_name="Voice Alpha Corp", company_email="contact@valpha.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Voice Operator", email="operator@valpha.ai", password_hash=hash_password("Pass1!"), role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Rahul Sharma", email="rahul.sharma@valpha.ai", password_hash=hash_password("Pass2!"), role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    # Connected Gmail account for sender
    conn = GmailConnection(
        organization_id=org.id,
        employee_id=sender.id,
        google_account_email="operator.gmail@gmail.com",
        encrypted_access_token=encrypt_token("mock_access_tok"),
        encrypted_refresh_token=encrypt_token("mock_refresh_tok"),
        token_expiry=datetime.now(timezone.utc) + timedelta(hours=1),
        status="CONNECTED",
    )
    db_session.add(conn)
    await db_session.commit()

    mock_send_execute = MagicMock(return_value={"id": "msg_voice_email_101", "threadId": "thread_101"})
    mock_messages = MagicMock()
    mock_messages.send.return_value.execute = mock_send_execute
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value = mock_messages

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        payload = {
            "prompt": "Send an email to Rahul saying I'll join the meeting at 3 PM.",
            "user_id": sender.id,
            "organization_id": org.id,
            "user_name": sender.name,
            "history": [],
        }
        # Turn 1: Draft staging
        res = await client.post("/api/v1/demo-agent/voice/execute", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data.get("tool_executed") == "create_email_draft", f"Got: {data}"
        assert "I've prepared an email to Rahul Sharma" in data["output"]
        assert "Would you like me to send it?" in data["output"]
        assert data["status"] == "draft_created"

        # Turn 2: Confirmation
        history = [
            {"role": "user", "content": payload["prompt"]},
            {"role": "assistant", "content": data["output"]},
        ]
        res2 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Yes, send it",
                "user_id": sender.id,
                "organization_id": org.id,
                "user_name": sender.name,
                "history": history,
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["tool_executed"] == "send_email"
        assert "Email sent to Rahul Sharma." in data2["output"]
        assert data2["tool_result"]["status"] == "sent"
        assert data2["tool_result"]["message_id"] == "msg_voice_email_101"


@pytest.mark.asyncio
async def test_voice_execution_missing_slots_and_multiturn(client: AsyncClient, db_session: AsyncSession):
    """Verify voice multi-turn slot filling for missing recipient and missing body."""
    org = Organization(company_name="Slot Corp", company_email="contact@slot.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Slot Operator", email="op@slot.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Priya Patel", email="priya.patel@slot.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    conn = GmailConnection(
        organization_id=org.id,
        employee_id=sender.id,
        google_account_email="op@gmail.com",
        encrypted_access_token=encrypt_token("tok"),
        status="CONNECTED",
    )
    db_session.add(conn)
    await db_session.commit()

    # ── Turn 1: Missing Body ("Email Priya") ──────────────────────────────────
    res_turn1 = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Email Priya",
            "user_id": sender.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res_turn1.status_code == 200
    data1 = res_turn1.json()
    assert "Got it, Priya. What would you like me to say in the email?" in data1["output"]

    # ── Turn 2: User provides body ("The deployment is complete") ─────────────
    history = [
        {"role": "user", "content": "Email Priya"},
        {"role": "assistant", "content": data1["output"]},
    ]

    mock_send = MagicMock(return_value={"id": "msg_turn2_id", "threadId": "t2"})
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value.send.return_value.execute = mock_send

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        res_turn2 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "The deployment is complete.",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res_turn2.status_code == 200
        data2 = res_turn2.json()
        assert data2["tool_executed"] == "create_email_draft"
        assert "I've prepared an email to Priya Patel." in data2["output"]
        assert "Would you like me to send it?" in data2["output"]

        # ── Turn 3: User confirms send ────────────────────────────────────────
        history.extend([
            {"role": "user", "content": "The deployment is complete."},
            {"role": "assistant", "content": data2["output"]},
        ])
        res_turn3 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Send it",
                "user_id": sender.id,
                "organization_id": org.id,
                "history": history,
            },
        )
        assert res_turn3.status_code == 200
        data3 = res_turn3.json()
        assert data3["tool_executed"] == "send_email"
        assert "Email sent to Priya Patel." in data3["output"]


@pytest.mark.asyncio
async def test_voice_execution_disconnected_gmail(client: AsyncClient, db_session: AsyncSession):
    """Verify conversational guidance when caller's Gmail is not connected."""
    org = Organization(company_name="No Gmail Org", company_email="none@corp.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Disconnected User", email="unconnected@corp.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Rahul Sharma", email="rahul@corp.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])
    await db_session.commit()

    res = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Send an email to Rahul saying I'll be in at 10 AM.",
            "user_id": sender.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["error_code"] == "GMAIL_NOT_CONNECTED"
    assert "your Gmail account isn't connected" in data["output"]
    assert "Please connect Gmail from Integrations" in data["output"]


@pytest.mark.asyncio
async def test_voice_execution_ambiguous_and_nonexistent_recipients(client: AsyncClient, db_session: AsyncSession):
    """Verify voice response on ambiguous or non-existent employee recipients."""
    org = Organization(company_name="Disambig Org", company_email="dis@corp.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Sender X", email="senderx@dis.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    user_a = User(name="Rahul Verma", email="rahul.verma@dis.ai", password_hash="pass", department="DevOps", role=UserRole.EMPLOYEE, is_active=True)
    user_b = User(name="Rahul Mehta", email="rahul.mehta@dis.ai", password_hash="pass", department="Finance", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, user_a, user_b])
    await db_session.flush()

    for u in [sender, user_a, user_b]:
        db_session.add(OrganizationMember(organization_id=org.id, user_id=u.id, role="EMPLOYEE", status=MemberStatus.ACTIVE))

    # Connected Gmail
    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=sender.id,
            google_account_email="senderx@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    # 1. Ambiguous Recipient
    res_amb = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Send an email to Rahul saying hello.",
            "user_id": sender.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res_amb.status_code == 200
    data_amb = res_amb.json()
    assert "I found multiple employees named Rahul. Which one do you mean?" in data_amb["output"]

    # 2. Nonexistent Recipient
    res_none = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Send an email to UnknownAlien saying test.",
            "user_id": sender.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res_none.status_code == 200
    data_none = res_none.json()
    assert "Could not find an employee named UnknownAlien in your organization." in data_none["output"]
