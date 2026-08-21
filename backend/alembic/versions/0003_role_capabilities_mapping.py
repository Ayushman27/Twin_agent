"""Role Capabilities Mapping for Neon PostgreSQL

Revision ID: 0003_role_capabilities_mapping
Revises: 0002_organizational_roles_schema
Create Date: 2026-08-20 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_role_capabilities_mapping'
down_revision: Union[str, None] = '0002_organizational_roles_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Role Capabilities Table ───────────────────────
    op.create_table(
        'role_capabilities',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('capability_id', sa.String(length=36), nullable=False),
        sa.Column('capability_name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('role_id', 'capability_id', name='uq_role_capability'),
    )
    op.create_index('ix_role_capabilities_role_id', 'role_capabilities', ['role_id'])
    op.create_index('ix_role_capabilities_capability_id', 'role_capabilities', ['capability_id'])


def downgrade() -> None:
    op.drop_index('ix_role_capabilities_capability_id', table_name='role_capabilities')
    op.drop_index('ix_role_capabilities_role_id', table_name='role_capabilities')
    op.drop_table('role_capabilities')
