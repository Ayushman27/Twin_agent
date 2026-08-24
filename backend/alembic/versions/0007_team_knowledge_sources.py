"""Team Knowledge Sources Schema for Neon PostgreSQL

Revision ID: 0007_team_knowledge_sources
Revises: 0006_team_ai_routes
Create Date: 2026-08-23 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007_team_knowledge_sources'
down_revision: Union[str, None] = '0006_team_ai_routes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Team Knowledge Sources Table ───────────────────
    op.create_table(
        'team_knowledge_sources',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('team_id', sa.String(length=36), sa.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('source_type', sa.String(length=100), server_default='DOCUMENT_REPOSITORY', nullable=False),
        sa.Column('source_identifier', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_team_knowledge_sources_team_id', 'team_knowledge_sources', ['team_id'])
    op.create_index('ix_team_knowledge_sources_organization_id', 'team_knowledge_sources', ['organization_id'])


def downgrade() -> None:
    op.drop_index('ix_team_knowledge_sources_organization_id', table_name='team_knowledge_sources')
    op.drop_index('ix_team_knowledge_sources_team_id', table_name='team_knowledge_sources')
    op.drop_table('team_knowledge_sources')
