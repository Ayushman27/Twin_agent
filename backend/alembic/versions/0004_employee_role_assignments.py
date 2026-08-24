"""Employee Role Assignments for Neon PostgreSQL

Revision ID: 0004_employee_role_assignments
Revises: 0003_role_capabilities_mapping
Create Date: 2026-08-20 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0004_employee_role_assignments'
down_revision: Union[str, None] = '0003_role_capabilities_mapping'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create Employee Role Assignments Table ───────────────
    op.create_table(
        'employee_role_assignments',
        sa.Column('id', sa.String(length=36), primary_key=True, nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('assigned_by', sa.String(length=36), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_employee_role_assignments_org_id', 'employee_role_assignments', ['organization_id'])
    op.create_index('ix_employee_role_assignments_user_id', 'employee_role_assignments', ['user_id'])
    op.create_index('ix_employee_role_assignments_role_id', 'employee_role_assignments', ['role_id'])
    op.create_index('ix_emp_role_assignment_lookup', 'employee_role_assignments', ['organization_id', 'user_id', 'status'])


def downgrade() -> None:
    op.drop_index('ix_emp_role_assignment_lookup', table_name='employee_role_assignments')
    op.drop_index('ix_employee_role_assignments_role_id', table_name='employee_role_assignments')
    op.drop_index('ix_employee_role_assignments_user_id', table_name='employee_role_assignments')
    op.drop_index('ix_employee_role_assignments_org_id', table_name='employee_role_assignments')
    op.drop_table('employee_role_assignments')
