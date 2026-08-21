"""Organizational Roles Schema for Neon PostgreSQL

Revision ID: 0002_organizational_roles_schema
Revises: 0001_neon_identity_schema
Create Date: 2026-08-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '0002_organizational_roles_schema'
down_revision: Union[str, None] = '0001_neon_identity_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Roles Table ───────────────────────────────────
    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('responsibilities', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('required_skills', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('tools', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('permissions', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('persona', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column(
            'risk_level',
            sa.Enum('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='rolerisklevel'),
            nullable=False,
            server_default='LOW',
        ),
        sa.Column('approval_rules', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column(
            'status',
            sa.Enum('ACTIVE', 'INACTIVE', 'DRAFT', name='rolestatus'),
            nullable=False,
            server_default='ACTIVE',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('organization_id', 'name', name='uq_organization_role_name'),
    )
    op.create_index('ix_roles_organization_id', 'roles', ['organization_id'])


def downgrade() -> None:
    op.drop_index('ix_roles_organization_id', table_name='roles')
    op.drop_table('roles')
    sa.Enum(name='rolestatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='rolerisklevel').drop(op.get_bind(), checkfirst=True)
