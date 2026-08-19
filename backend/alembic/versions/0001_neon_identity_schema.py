"""Initial Neon PostgreSQL Identity Schema

Revision ID: 0001_neon_identity_schema
Revises: 
Create Date: 2026-08-19 15:21:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_neon_identity_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Organizations Table ─────────────────────────────────
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('company_email', sa.String(length=320), nullable=True),
        sa.Column('company_phone', sa.String(length=30), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('company_size', sa.String(length=50), nullable=True),
        sa.Column('employee_count', sa.Integer(), nullable=True),
        sa.Column('website', sa.String(length=500), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('business_model', sa.String(length=100), nullable=True),
        sa.Column('primary_contact', sa.String(length=255), nullable=True),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', name='orgstatus'),
            nullable=False,
            server_default='PENDING',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # ── 2. Users Table ─────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('employee_id', sa.String(length=50), nullable=True),
        sa.Column('job_title', sa.String(length=255), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column(
            'role',
            sa.Enum('SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'EMPLOYEE', 'DEMO_USER', name='userrole'),
            nullable=False,
            server_default='DEMO_USER',
        ),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('email', name='uq_users_email'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_employee_id', 'users', ['employee_id'], unique=False)

    # ── 3. Organization Members Table ──────────────────────────
    op.create_table(
        'organization_members',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='ORG_ADMIN'),
        sa.Column(
            'status',
            sa.Enum('ACTIVE', 'INACTIVE', 'INVITED', name='memberstatus'),
            nullable=False,
            server_default='ACTIVE',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('organization_id', 'user_id', name='uq_org_member'),
    )
    op.create_index('ix_organization_members_organization_id', 'organization_members', ['organization_id'])
    op.create_index('ix_organization_members_user_id', 'organization_members', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_organization_members_user_id', table_name='organization_members')
    op.drop_index('ix_organization_members_organization_id', table_name='organization_members')
    op.drop_table('organization_members')
    op.drop_index('ix_users_employee_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
    op.drop_table('organizations')
    sa.Enum(name='memberstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='orgstatus').drop(op.get_bind(), checkfirst=True)
