"""
Unit and architecture tests for Neon PostgreSQL Identity schema and cross-database isolation.
"""
from sqlalchemy import inspect
from app.db.base import IdentityBase
from app.modules.auth.models import User
from app.modules.organizations.models import Organization, OrganizationMember
from app.modules.demo_agent.models import AgentSession, AgentMessage


def test_neon_identity_tables_registered():
    """Verify that Neon Identity models are properly registered on IdentityBase."""
    table_names = IdentityBase.metadata.tables.keys()
    assert "users" in table_names
    assert "organizations" in table_names
    assert "organization_members" in table_names


def test_user_model_schema_fields():
    """Verify User model has all required fields for identity, employee profile, and auth."""
    table = IdentityBase.metadata.tables["users"]
    col_names = {c.name for c in table.columns}

    expected = {
        "id", "name", "email", "password_hash", "phone",
        "employee_id", "job_title", "department", "role",
        "is_active", "created_at", "updated_at"
    }
    assert expected.issubset(col_names)

    # Email uniqueness
    email_col = table.columns["email"]
    assert email_col.unique or any(ix.unique and "email" in [c.name for c in ix.columns] for ix in table.indexes)


def test_organization_model_schema_fields():
    """Verify Organization model contains full corporate profile attributes."""
    table = IdentityBase.metadata.tables["organizations"]
    col_names = {c.name for c in table.columns}

    expected = {
        "id", "company_name", "company_email", "company_phone", "industry",
        "company_size", "employee_count", "website", "country", "city",
        "description", "business_model", "primary_contact", "status",
        "created_at", "updated_at"
    }
    assert expected.issubset(col_names)


def test_organization_member_relationships_and_constraints():
    """Verify OrganizationMember contains intra-PostgreSQL foreign keys and unique constraint."""
    table = IdentityBase.metadata.tables["organization_members"]

    # Foreign Keys point strictly to organizations and users
    fk_targets = {fk.target_fullname for fk in table.foreign_keys}
    assert "organizations.id" in fk_targets
    assert "users.id" in fk_targets

    # Unique constraint preventing duplicate memberships
    uq_names = {uq.name for uq in table.constraints if hasattr(uq, "name") and uq.name}
    assert "uq_org_member" in uq_names or any(
        len(uq.columns) == 2 and "organization_id" in uq.columns and "user_id" in uq.columns
        for uq in table.constraints
    )


def test_cross_database_isolation_rule():
    """
    CRITICAL CROSS-DATABASE RULE:
    Agent tables in SQLite must NOT contain database-level foreign keys pointing to Neon PostgreSQL.
    """
    agent_session_table = AgentSession.__table__

    # Verify no foreign keys on AgentSession (user_id and organization_id are application-level string references)
    fk_targets = {fk.target_fullname for fk in agent_session_table.foreign_keys}
    assert "users.id" not in fk_targets
    assert "organizations.id" not in fk_targets

    # AgentMessage ForeignKey must point strictly within SQLite to agent_sessions
    agent_msg_table = AgentMessage.__table__
    msg_fk_targets = {fk.target_fullname for fk in agent_msg_table.foreign_keys}
    assert "agent_sessions.id" in msg_fk_targets
