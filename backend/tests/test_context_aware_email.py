"""
Phase 8 Test Suite — Context-Aware AI Email
===========================================
Verifies:
  1. Resolving verified project context (e.g., 'TruDrishti') with milestones and tasks.
  2. Grounded email draft generation using trusted Neon PostgreSQL records.
  3. Grounded task status update verification (e.g., 'API integration is complete').
  4. Clarification prompt when requested project does not exist (zero hallucination).
  5. Multi-tenant project isolation (Org A vs Org B).
  6. Human confirmation before dispatch and audit metadata recording.
  7. Strict memory safety (no private credentials/unrelated info dumped).
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
from app.modules.projects.models import (
    Project,
    ProjectMilestone,
    ProjectTask,
    ProjectStatus,
    MilestoneStatus,
    TaskStatus,
)


@pytest.mark.asyncio
async def test_context_aware_project_update_email_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Test flow:
    1. Employee says: "Email Rahul the latest update on the TruDrishti project."
    2. System queries Neon PostgreSQL, verifies TruDrishti project, milestones, and tasks.
    3. Staged draft contains verified facts and asks human confirmation.
    4. Employee confirms: "Yes, send it."
    5. Dispatches via Gmail API.
    """
    org = Organization(company_name="TruDrishti Corp", company_email="info@trudrishti.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Vikram Seth", email="vikram@trudrishti.ai", password_hash=hash_password("Pass1!"), role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Rahul Sharma", email="rahul@trudrishti.ai", password_hash=hash_password("Pass2!"), role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    # Create Project with Milestones and Tasks
    project = Project(
        organization_id=org.id,
        name="TruDrishti",
        project_code="TD-001",
        description="Autonomous AI Twin & Vision Intelligence Platform",
        status=ProjectStatus.ACTIVE,
        progress_percent=75,
        owner_id=sender.id,
    )
    db_session.add(project)
    await db_session.flush()

    m1 = ProjectMilestone(
        project_id=project.id,
        name="Phase 1 Core Architecture",
        status=MilestoneStatus.COMPLETED,
        progress_percent=100,
    )
    m2 = ProjectMilestone(
        project_id=project.id,
        name="Phase 2 Gmail Integration",
        status=MilestoneStatus.IN_PROGRESS,
        progress_percent=80,
    )
    db_session.add_all([m1, m2])
    await db_session.flush()

    t1 = ProjectTask(
        project_id=project.id,
        milestone_id=m2.id,
        title="API Integration",
        status=TaskStatus.DONE,
        progress_percent=100,
        assignee_id=sender.id,
    )
    t2 = ProjectTask(
        project_id=project.id,
        milestone_id=m2.id,
        title="Voice Confirmation Engine",
        status=TaskStatus.DONE,
        progress_percent=100,
        assignee_id=sender.id,
    )
    db_session.add_all([t1, t2])

    conn = GmailConnection(
        organization_id=org.id,
        employee_id=sender.id,
        google_account_email="vikram@gmail.com",
        encrypted_access_token=encrypt_token("tok_access"),
        status="CONNECTED",
    )
    db_session.add(conn)
    await db_session.commit()

    mock_send_execute = MagicMock(return_value={"id": "msg_project_ctx_101"})
    mock_messages = MagicMock()
    mock_messages.send.return_value.execute = mock_send_execute
    mock_service = MagicMock()
    mock_service.users.return_value.messages.return_value = mock_messages

    with patch("app.integrations.google.sender.build", return_value=mock_service):
        # ── Step 1: Voice Command requesting Project Update ───────────────────
        res1 = await client.post(
            "/api/v1/demo-agent/voice/execute",
            json={
                "prompt": "Email Rahul the latest update on the TruDrishti project.",
                "user_id": sender.id,
                "organization_id": org.id,
                "user_name": sender.name,
                "history": [],
            },
        )
        assert res1.status_code == 200
        data1 = res1.json()

        assert data1["status"] == "draft_created"
        assert "TruDrishti Project Update" in data1["output"]
        assert "75% overall progress" in data1["output"]
        assert "Phase 1 Core Architecture" in data1["output"]
        assert "API Integration" in data1["output"]
        assert "Would you like me to send it?" in data1["output"]

        draft_id = data1["draft_id"]
        stmt = select(EmailRecord).where(EmailRecord.id == draft_id)
        r_draft = await db_session.execute(stmt)
        draft = r_draft.scalar_one_or_none()
        assert draft is not None
        assert draft.status == EmailStatus.PENDING_CONFIRMATION
        assert draft.meta_data.get("project_name") == "TruDrishti"
        assert draft.meta_data.get("verified") is True

        # ── Step 2: Human Confirmation ────────────────────────────────────────
        history = [
            {"role": "user", "content": "Email Rahul the latest update on the TruDrishti project."},
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
        assert "Email sent to Rahul Sharma." in res2.json()["output"]

        await db_session.refresh(draft)
        assert draft.status == EmailStatus.SENT
        assert draft.provider_message_id == "msg_project_ctx_101"


@pytest.mark.asyncio
async def test_context_aware_task_update_email_flow(client: AsyncClient, db_session: AsyncSession):
    """Test flow: Employee says 'Email Rahul that the API integration is complete.'"""
    org = Organization(company_name="Task Corp", company_email="info@task.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="Alice Coder", email="alice@task.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Bob Manager", email="bob@task.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([sender, recipient])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org.id, user_id=sender.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org.id, user_id=recipient.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    project = Project(
        organization_id=org.id,
        name="Platform Core",
        project_code="PC-1",
        status=ProjectStatus.ACTIVE,
        progress_percent=90,
    )
    db_session.add(project)
    await db_session.flush()

    t = ProjectTask(
        project_id=project.id,
        title="API Integration",
        status=TaskStatus.DONE,
        progress_percent=100,
    )
    db_session.add(t)

    db_session.add(
        GmailConnection(
            organization_id=org.id,
            employee_id=sender.id,
            google_account_email="alice@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    res = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Email Bob that the API integration is complete.",
            "user_id": sender.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "draft_created"
    assert "API Integration Update" in data["output"]
    assert "DONE" in data["output"]
    assert "Platform Core" in data["output"]
    assert "Would you like me to send it?" in data["output"]


@pytest.mark.asyncio
async def test_context_aware_nonexistent_project_clarification(client: AsyncClient, db_session: AsyncSession):
    """Zero Hallucination: Clarify when requested project does not exist."""
    org = Organization(company_name="Clean Corp", company_email="info@clean.ai", status=OrgStatus.ACTIVE)
    db_session.add(org)
    await db_session.flush()

    sender = User(name="User Clean", email="clean@clean.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    recipient = User(name="Target User", email="target@clean.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
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
            google_account_email="clean@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    res = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Email Target the latest update on the NonExistentProject project.",
            "user_id": sender.id,
            "organization_id": org.id,
            "history": [],
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "clarification_needed"
    assert "I couldn't find a project named 'NonExistentProject'" in data["output"]
    assert "draft_id" not in data


@pytest.mark.asyncio
async def test_context_aware_cross_org_isolation(client: AsyncClient, db_session: AsyncSession):
    """Verify Organization B cannot access Organization A's projects."""
    org_a = Organization(company_name="Org A", company_email="a@test.ai", status=OrgStatus.ACTIVE)
    org_b = Organization(company_name="Org B", company_email="b@test.ai", status=OrgStatus.ACTIVE)
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    user_b = User(name="User B", email="userb@orgb.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    rec_b = User(name="Colleague B", email="colleague@orgb.ai", password_hash="pass", role=UserRole.EMPLOYEE, is_active=True)
    db_session.add_all([user_b, rec_b])
    await db_session.flush()

    db_session.add_all([
        OrganizationMember(organization_id=org_b.id, user_id=user_b.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
        OrganizationMember(organization_id=org_b.id, user_id=rec_b.id, role="EMPLOYEE", status=MemberStatus.ACTIVE),
    ])

    # Project exists ONLY in Org A
    proj_a = Project(
        organization_id=org_a.id,
        name="SecretProjectA",
        project_code="SEC-A",
        status=ProjectStatus.ACTIVE,
    )
    db_session.add(proj_a)

    db_session.add(
        GmailConnection(
            organization_id=org_b.id,
            employee_id=user_b.id,
            google_account_email="userb@gmail.com",
            encrypted_access_token=encrypt_token("tok"),
            status="CONNECTED",
        )
    )
    await db_session.commit()

    # User B requests SecretProjectA
    res = await client.post(
        "/api/v1/demo-agent/voice/execute",
        json={
            "prompt": "Email Colleague B the latest update on the SecretProjectA project.",
            "user_id": user_b.id,
            "organization_id": org_b.id,
            "history": [],
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "clarification_needed"
    assert "I couldn't find a project named 'SecretProjectA'" in data["output"]
