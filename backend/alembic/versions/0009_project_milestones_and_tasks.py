"""Project Milestones and Tasks Schema for Neon PostgreSQL

Revision ID: 0009_project_milestones_and_tasks
Revises: 0008_projects_schema
Create Date: 2026-08-24 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0009_proj_milestones_tasks'
down_revision: Union[str, None] = '0008_projects_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Enums ──────────────────────────────────────────
    milestone_status_enum = postgresql.ENUM(
        'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED',
        name='milestonestatus',
        create_type=False,
    )
    milestone_status_enum.create(op.get_bind(), checkfirst=True)

    task_status_enum = postgresql.ENUM(
        'TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED',
        name='taskstatus',
        create_type=False,
    )
    task_status_enum.create(op.get_bind(), checkfirst=True)

    # ── 2. Create Project Milestones Table ────────────────────────
    op.create_table(
        'project_milestones',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', postgresql.ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED', name='milestonestatus', create_type=False), server_default='PLANNED', nullable=False),
        sa.Column('priority', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='projectpriority', create_type=False), server_default='MEDIUM', nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('progress_percent', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('progress_percent >= 0 AND progress_percent <= 100', name='chk_milestone_progress_percent'),
    )
    op.create_index('ix_project_milestones_project_id', 'project_milestones', ['project_id'])
    op.create_index('ix_project_milestones_status', 'project_milestones', ['status'])

    # ── 3. Create Project Tasks Table ────────────────────────────
    op.create_table(
        'project_tasks',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('milestone_id', sa.String(length=36), sa.ForeignKey('project_milestones.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assignee_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('assigned_agent_group_id', sa.String(length=36), nullable=True),
        sa.Column('status', postgresql.ENUM('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED', name='taskstatus', create_type=False), server_default='TODO', nullable=False),
        sa.Column('priority', postgresql.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', name='projectpriority', create_type=False), server_default='MEDIUM', nullable=False),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('progress_percent', sa.Integer(), server_default='0', nullable=False),
        sa.Column('blocked_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('progress_percent >= 0 AND progress_percent <= 100', name='chk_task_progress_percent'),
    )
    op.create_index('ix_project_tasks_project_id', 'project_tasks', ['project_id'])
    op.create_index('ix_project_tasks_milestone_id', 'project_tasks', ['milestone_id'])
    op.create_index('ix_project_tasks_assignee_id', 'project_tasks', ['assignee_id'])
    op.create_index('ix_project_tasks_assigned_agent_group_id', 'project_tasks', ['assigned_agent_group_id'])
    op.create_index('ix_project_tasks_status', 'project_tasks', ['status'])


def downgrade() -> None:
    op.drop_table('project_tasks')
    op.drop_table('project_milestones')
    op.execute('DROP TYPE IF EXISTS taskstatus;')
    op.execute('DROP TYPE IF EXISTS milestonestatus;')
