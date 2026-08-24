"""Projects and Project Members Schema for Neon PostgreSQL

Revision ID: 0008_projects_schema
Revises: 0007_team_knowledge_sources
Create Date: 2026-08-24 11:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0008_projects_schema'
down_revision: Union[str, None] = '0007_team_knowledge_sources'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Enums ──────────────────────────────────────────
    project_status_enum = postgresql.ENUM(
        'PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED',
        name='projectstatus',
        create_type=False,
    )
    project_status_enum.create(op.get_bind(), checkfirst=True)

    project_priority_enum = postgresql.ENUM(
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
        name='projectpriority',
        create_type=False,
    )
    project_priority_enum.create(op.get_bind(), checkfirst=True)

    project_risk_enum = postgresql.ENUM(
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
        name='projectrisklevel',
        create_type=False,
    )
    project_risk_enum.create(op.get_bind(), checkfirst=True)

    # ── 2. Create Projects Table ─────────────────────────────────
    op.create_table(
        'projects',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('project_code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', postgresql.ENUM('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', name='projectstatus', create_type=False), server_default='PLANNING', nullable=False),
        sa.Column('priority', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='projectpriority', create_type=False), server_default='MEDIUM', nullable=False),
        sa.Column('risk_level', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='projectrisklevel', create_type=False), server_default='LOW', nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('target_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('progress_percent', sa.Integer(), server_default='0', nullable=False),
        sa.Column('repository_bindings', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('issue_tracker_bindings', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('ai_delivery_policy', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('progress_percent >= 0 AND progress_percent <= 100', name='chk_project_progress_percent'),
        sa.UniqueConstraint('organization_id', 'project_code', name='uq_organization_project_code'),
    )
    op.create_index('ix_projects_organization_id', 'projects', ['organization_id'])
    op.create_index('ix_projects_project_code', 'projects', ['project_code'])
    op.create_index('ix_projects_owner_id', 'projects', ['owner_id'])
    op.create_index('ix_projects_team_id', 'projects', ['team_id'])
    op.create_index('ix_projects_status', 'projects', ['status'])
    op.create_index('ix_projects_priority', 'projects', ['priority'])
    op.create_index('ix_projects_risk_level', 'projects', ['risk_level'])

    # ── 3. Create Project Members Table ──────────────────────────
    op.create_table(
        'project_members',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_in_project', sa.String(length=100), server_default='Contributor', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('project_id', 'user_id', name='uq_project_member'),
    )
    op.create_index('ix_project_members_project_id', 'project_members', ['project_id'])
    op.create_index('ix_project_members_user_id', 'project_members', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_project_members_user_id', table_name='project_members')
    op.drop_index('ix_project_members_project_id', table_name='project_members')
    op.drop_table('project_members')

    op.drop_index('ix_projects_risk_level', table_name='projects')
    op.drop_index('ix_projects_priority', table_name='projects')
    op.drop_index('ix_projects_status', table_name='projects')
    op.drop_index('ix_projects_team_id', table_name='projects')
    op.drop_index('ix_projects_owner_id', table_name='projects')
    op.drop_index('ix_projects_project_code', table_name='projects')
    op.drop_index('ix_projects_organization_id', table_name='projects')
    op.drop_table('projects')

    op.execute('DROP TYPE IF EXISTS projectrisklevel')
    op.execute('DROP TYPE IF EXISTS projectpriority')
    op.execute('DROP TYPE IF EXISTS projectstatus')
