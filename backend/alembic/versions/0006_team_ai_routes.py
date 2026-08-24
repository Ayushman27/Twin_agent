"""Team AI Routes Schema for Neon PostgreSQL

Revision ID: 0006_team_ai_routes
Revises: 0005_teams_schema
Create Date: 2026-08-23 21:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006_team_ai_routes'
down_revision: Union[str, None] = '0005_teams_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Team AI Routes Table ──────────────────────────
    op.create_table(
        'team_ai_routes',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=True),
        sa.Column('target_role_id', sa.String(length=36), sa.ForeignKey('roles.id', ondelete='CASCADE'), nullable=True),
        sa.Column('source_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('target_user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('priority', sa.Integer(), server_default='1', nullable=False),
        sa.Column('condition', sa.String(length=100), server_default='on_success', nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_team_ai_routes_team_id', 'team_ai_routes', ['team_id'])
    op.create_index('ix_team_ai_routes_organization_id', 'team_ai_routes', ['organization_id'])
    op.create_index('ix_team_ai_routes_source_role_id', 'team_ai_routes', ['source_role_id'])
    op.create_index('ix_team_ai_routes_target_role_id', 'team_ai_routes', ['target_role_id'])
    op.create_index('ix_team_ai_routes_source_user_id', 'team_ai_routes', ['source_user_id'])
    op.create_index('ix_team_ai_routes_target_user_id', 'team_ai_routes', ['target_user_id'])


def downgrade() -> None:
    op.drop_index('ix_team_ai_routes_target_user_id', table_name='team_ai_routes')
    op.drop_index('ix_team_ai_routes_source_user_id', table_name='team_ai_routes')
    op.drop_index('ix_team_ai_routes_target_role_id', table_name='team_ai_routes')
    op.drop_index('ix_team_ai_routes_source_role_id', table_name='team_ai_routes')
    op.drop_index('ix_team_ai_routes_organization_id', table_name='team_ai_routes')
    op.drop_index('ix_team_ai_routes_team_id', table_name='team_ai_routes')
    op.drop_table('team_ai_routes')
