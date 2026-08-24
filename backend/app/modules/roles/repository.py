"""Roles module — Repository (Neon PostgreSQL)."""
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.roles.models import EmployeeRoleAssignment, Role, RoleCapability, RoleStatus


class RoleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> Role:
        role = Role(**kwargs)
        self.db.add(role)
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def get_by_id(self, role_id: str, organization_id: Optional[str] = None) -> Optional[Role]:
        query = select(Role).where(Role.id == role_id)
        if organization_id:
            query = query.where(Role.organization_id == organization_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_name(self, organization_id: str, name: str) -> Optional[Role]:
        if not name:
            return None
        result = await self.db.execute(
            select(Role).where(
                Role.organization_id == organization_id,
                func.lower(Role.name) == name.strip().lower(),
            )
        )
        return result.scalar_one_or_none()

    async def list_by_organization(
        self,
        organization_id: str,
        department: Optional[str] = None,
        status: Optional[RoleStatus] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Role]:
        query = select(Role).where(Role.organization_id == organization_id)
        if department:
            query = query.where(func.lower(Role.department) == department.strip().lower())
        if status:
            query = query.where(Role.status == status)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.where(
                func.lower(Role.name).like(term) | func.lower(Role.description).like(term)
            )
        query = query.order_by(Role.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_organization(
        self,
        organization_id: str,
        department: Optional[str] = None,
        status: Optional[RoleStatus] = None,
        search: Optional[str] = None,
    ) -> int:
        query = select(func.count(Role.id)).where(Role.organization_id == organization_id)
        if department:
            query = query.where(func.lower(Role.department) == department.strip().lower())
        if status:
            query = query.where(Role.status == status)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.where(
                func.lower(Role.name).like(term) | func.lower(Role.description).like(term)
            )
        result = await self.db.execute(query)
        return result.scalar_one() or 0

    async def update(self, role: Role, **kwargs) -> Role:
        for k, v in kwargs.items():
            if v is not None:
                setattr(role, k, v)
        await self.db.flush()
        await self.db.refresh(role)
        return role

    async def delete(self, role: Role) -> None:
        await self.db.delete(role)
        await self.db.flush()

    # ── Role Capability Mappings ──────────────────────────────────
    async def get_role_capabilities(self, role_id: str) -> List[RoleCapability]:
        """Fetch all capability mappings for a given role."""
        result = await self.db.execute(
            select(RoleCapability).where(RoleCapability.role_id == role_id)
        )
        return list(result.scalars().all())

    async def set_role_capabilities(
        self, role_id: str, capabilities: List[Tuple[str, str]]
    ) -> List[RoleCapability]:
        """
        Reconcile the capability mappings for a role.
        capabilities: list of (capability_id, capability_name)
        """
        # 1. Remove existing mappings
        existing_result = await self.db.execute(
            select(RoleCapability).where(RoleCapability.role_id == role_id)
        )
        for existing in existing_result.scalars().all():
            await self.db.delete(existing)
        await self.db.flush()

        # 2. Add new mappings
        new_mappings = []
        for cap_id, cap_name in capabilities:
            mapping = RoleCapability(
                role_id=role_id,
                capability_id=cap_id,
                capability_name=cap_name,
            )
            self.db.add(mapping)
            new_mappings.append(mapping)

        await self.db.flush()
        return new_mappings

    # ── Employee Role Assignments ─────────────────────────────────
    async def get_active_employee_role_assignment(
        self, organization_id: str, user_id: str
    ) -> Optional[EmployeeRoleAssignment]:
        """Fetch the current active job/AI role assignment for an employee."""
        result = await self.db.execute(
            select(EmployeeRoleAssignment)
            .where(
                EmployeeRoleAssignment.organization_id == organization_id,
                EmployeeRoleAssignment.user_id == user_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
            .order_by(EmployeeRoleAssignment.created_at.desc())
        )
        return result.scalars().first()

    async def get_all_active_assignments(
        self, organization_id: str
    ) -> List[EmployeeRoleAssignment]:
        """Fetch all active role assignments across an organization."""
        result = await self.db.execute(
            select(EmployeeRoleAssignment).where(
                EmployeeRoleAssignment.organization_id == organization_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        return list(result.scalars().all())

    async def assign_employee_role(
        self,
        organization_id: str,
        user_id: str,
        role_id: str,
        assigned_by: Optional[str] = None,
    ) -> EmployeeRoleAssignment:
        """
        Assign an employee to a job/AI role blueprint.
        Deactivates previous active assignments and creates a new active assignment.
        """
        # 1. Mark existing active assignments as INACTIVE
        existing_res = await self.db.execute(
            select(EmployeeRoleAssignment).where(
                EmployeeRoleAssignment.organization_id == organization_id,
                EmployeeRoleAssignment.user_id == user_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        for existing in existing_res.scalars().all():
            existing.status = "INACTIVE"
        await self.db.flush()

        # 2. Create new active assignment
        assignment = EmployeeRoleAssignment(
            organization_id=organization_id,
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            status="ACTIVE",
        )
        self.db.add(assignment)
        await self.db.flush()
        await self.db.refresh(assignment)
        return assignment
