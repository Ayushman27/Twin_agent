"""Project Integrations Schema for Neon PostgreSQL

Revision ID: 0010_project_integrations
Revises: 0009_project_milestones_and_tasks
Create Date: 2026-08-24 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0010_project_integrations'
down_revision: Union[str, None] = '0009_proj_milestones_tasks'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Enums ──────────────────────────────────────────
    provider_enum = postgresql.ENUM(
        'GITHUB', 'JIRA',
        name='integrationprovider',
        create_type=False,
    )
    provider_enum.create(op.get_bind(), checkfirst=True)

    status_enum = postgresql.ENUM(
        'CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING',
        name='integrationstatus',
        create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    # ── 2. Create Project Integrations Table ──────────────────────
    op.create_table(
        'project_integrations',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('project_id', sa.String(length=36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', postgresql.ENUM('GITHUB', 'JIRA', name='integrationprovider', create_type=False), nullable=False),
        sa.Column('external_project_id', sa.String(length=255), nullable=True),
        sa.Column('external_project_name', sa.String(length=255), nullable=True),
        sa.Column('repository_url', sa.String(length=512), nullable=True),
        sa.Column('base_url', sa.String(length=512), nullable=True),
        sa.Column('status', postgresql.ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING', name='integrationstatus', create_type=False), server_default='DISCONNECTED', nullable=False),
        sa.Column('config', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('auth_config', sa.JSON(), server_default='{}', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('project_id', 'provider', name='uq_project_integration_provider'),
    )
    op.create_index('ix_project_integrations_project_id', 'project_integrations', ['project_id'])
    op.create_index('ix_project_integrations_provider', 'project_integrations', ['provider'])
    op.create_index('ix_project_integrations_status', 'project_integrations', ['status'])


def downgrade() -> None:
    op.drop_table('project_integrations')
    op.execute('DROP TYPE IF EXISTS integrationstatus;')
    op.execute('DROP TYPE IF EXISTS integrationprovider;')
