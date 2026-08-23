"""Teams and Team Members Schema for Neon PostgreSQL

Revision ID: 0005_teams_schema
Revises: 0004_employee_role_assignments
Create Date: 2026-08-21 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_teams_schema'
down_revision: Union[str, None] = '0004_employee_role_assignments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Teams Table ───────────────────────────────────
    op.create_table(
        'teams',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department', sa.String(length=255), nullable=True),
        sa.Column('team_lead_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', name='teamstatus'), server_default='ACTIVE', nullable=False),
        sa.Column('ai_routing_policy', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('knowledge_access_config', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('memory_isolation_level', sa.String(length=50), server_default='TEAM_ISOLATED', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('organization_id', 'name', name='uq_team_name_org'),
    )
    op.create_index('ix_teams_organization_id', 'teams', ['organization_id'])
    op.create_index('ix_teams_department', 'teams', ['department'])
    op.create_index('ix_teams_team_lead_id', 'teams', ['team_lead_id'])
    op.create_index('ix_teams_status', 'teams', ['status'])

    # ── 2. Create Team Members Table ────────────────────────────
    op.create_table(
        'team_members',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_in_team', sa.String(length=100), server_default='Contributor', nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', name='teammemberstatus'), server_default='ACTIVE', nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('team_id', 'user_id', name='uq_team_member'),
    )
    op.create_index('ix_team_members_team_id', 'team_members', ['team_id'])
    op.create_index('ix_team_members_user_id', 'team_members', ['user_id'])
    op.create_index('ix_team_members_status', 'team_members', ['status'])


def downgrade() -> None:
    op.drop_index('ix_team_members_status', table_name='team_members')
    op.drop_index('ix_team_members_user_id', table_name='team_members')
    op.drop_index('ix_team_members_team_id', table_name='team_members')
    op.drop_table('team_members')
    op.execute('DROP TYPE IF EXISTS teammemberstatus')

    op.drop_index('ix_teams_status', table_name='teams')
    op.drop_index('ix_teams_team_lead_id', table_name='teams')
    op.drop_index('ix_teams_department', table_name='teams')
    op.drop_index('ix_teams_organization_id', table_name='teams')
    op.drop_table('teams')
    op.execute('DROP TYPE IF EXISTS teamstatus')
