"""Organizations module — Service."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.modules.auth.models import User, UserRole
from app.modules.auth.repository import UserRepository
from app.modules.organizations.models import MemberStatus, Organization, OrgStatus
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.schemas import (
    MemberDetailResponse,
    MemberResponse,
    OrganizationCreate,
    OrganizationStatsResponse,
    OrganizationUpdate,
)


class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrganizationRepository(db)
        self.user_repo = UserRepository(db)

    async def create(self, data: OrganizationCreate, creator: User) -> Organization:
        org = await self.repo.create(
            **data.model_dump(),
            status=OrgStatus.PENDING,
        )
        await self.repo.add_member(org.id, creator.id, role="ORG_ADMIN", status=MemberStatus.ACTIVE)
        return org

    async def get(self, org_id: str, current_user: User) -> Organization:
        org = await self.repo.get_by_id(org_id)
        if not org:
            raise NotFoundException("Organization", org_id)
        await self._assert_member(org_id, current_user)
        return org

    async def update(
        self, org_id: str, data: OrganizationUpdate, current_user: User
    ) -> Organization:
        org = await self.repo.get_by_id(org_id)
        if not org:
            raise NotFoundException("Organization", org_id)
        await self._assert_member(org_id, current_user)
        updates = data.model_dump(exclude_none=True)
        return await self.repo.update(org, **updates)

    async def get_members(self, org_id: str, current_user: User) -> List[MemberResponse]:
        org = await self.repo.get_by_id(org_id)
        if not org:
            raise NotFoundException("Organization", org_id)
        await self._assert_member(org_id, current_user)
        return await self.repo.get_members(org_id)

    async def get_stats(self, org_id: str, current_user: User) -> OrganizationStatsResponse:
        org = await self.repo.get_by_id(org_id)
        if not org:
            raise NotFoundException("Organization", org_id)
        await self._assert_member(org_id, current_user)
        total = await self.repo.count_members(org_id)
        pending = await self.repo.count_pending_invitations(org_id)
        active = await self.repo.count_active_members(org_id)
        return OrganizationStatsResponse(
            total_members=total,
            active_members=active,
            pending_invitations=pending,
            teams_count=6,
            roles_count=14,
        )

    async def get_detailed_members(
        self, org_id: str, current_user: User, status: Optional[MemberStatus] = None
    ) -> List[MemberDetailResponse]:
        org = await self.repo.get_by_id(org_id)
        if not org:
            raise NotFoundException("Organization", org_id)
        await self._assert_member(org_id, current_user)
        rows = await self.repo.get_members_with_users(org_id, status=status)
        
        # Query active employee role assignments
        from app.modules.roles.models import EmployeeRoleAssignment, Role
        assign_res = await self.db.execute(
            select(EmployeeRoleAssignment.user_id, Role.id, Role.name, Role.department)
            .join(Role, EmployeeRoleAssignment.role_id == Role.id)
            .where(
                EmployeeRoleAssignment.organization_id == org_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        role_map = {row[0]: (row[1], row[2], row[3]) for row in assign_res.all()}

        result = []
        for mem, user in rows:
            role_info = role_map.get(user.id)
            result.append(
                MemberDetailResponse(
                    id=mem.id,
                    organization_id=mem.organization_id,
                    user_id=mem.user_id,
                    role=mem.role,
                    status=mem.status,
                    name=user.name,
                    email=user.email,
                    employee_id=user.employee_id,
                    department=user.department,
                    job_title=user.job_title,
                    job_role_id=role_info[0] if role_info else None,
                    job_role_name=role_info[1] if role_info else user.job_title,
                    job_role_department=role_info[2] if role_info else user.department,
                    created_at=mem.created_at,
                )
            )
        return result

    async def approve_member(
        self, org_id: str, member_id: str, current_user: User
    ) -> MemberDetailResponse:
        await self._assert_org_admin(org_id, current_user)
        mem = await self.repo.get_member_by_id(member_id)
        if not mem or mem.organization_id != org_id:
            raise NotFoundException("OrganizationMember", member_id)
        mem = await self.repo.update_member_status(mem, MemberStatus.ACTIVE)
        await self.db.commit()

        user = await self.user_repo.get_by_id(mem.user_id)
        return MemberDetailResponse(
            id=mem.id,
            organization_id=mem.organization_id,
            user_id=mem.user_id,
            role=mem.role,
            status=mem.status,
            name=user.name if user else None,
            email=user.email if user else None,
            employee_id=user.employee_id if user else None,
            department=user.department if user else None,
            job_title=user.job_title if user else None,
            created_at=mem.created_at,
        )

    async def reject_member(
        self, org_id: str, member_id: str, current_user: User
    ) -> MemberDetailResponse:
        await self._assert_org_admin(org_id, current_user)
        mem = await self.repo.get_member_by_id(member_id)
        if not mem or mem.organization_id != org_id:
            raise NotFoundException("OrganizationMember", member_id)
        mem = await self.repo.update_member_status(mem, MemberStatus.INACTIVE)
        await self.db.commit()

        user = await self.user_repo.get_by_id(mem.user_id)
        return MemberDetailResponse(
            id=mem.id,
            organization_id=mem.organization_id,
            user_id=mem.user_id,
            role=mem.role,
            status=mem.status,
            name=user.name if user else None,
            email=user.email if user else None,
            employee_id=user.employee_id if user else None,
            department=user.department if user else None,
            job_title=user.job_title if user else None,
            created_at=mem.created_at,
        )

    async def _assert_member(self, org_id: str, user: User) -> None:
        if user.role == UserRole.SUPER_ADMIN:
            return
        membership = await self.repo.get_user_membership(org_id, user.id)
        if not membership:
            raise ForbiddenException("You are not a member of this organization")

    async def _assert_org_admin(self, org_id: str, user: User) -> None:
        if user.role == UserRole.SUPER_ADMIN:
            return
        membership = await self.repo.get_user_membership(org_id, user.id)
        if not membership or membership.role != "ORG_ADMIN":
            raise ForbiddenException("Only organization administrators can perform this action")
