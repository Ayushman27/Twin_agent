"""Organizations module — Repository."""
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.organizations.models import MemberStatus, OrgStatus, Organization, OrganizationMember


class OrganizationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> Organization:
        org = Organization(**kwargs)
        self.db.add(org)
        await self.db.flush()
        await self.db.refresh(org)
        return org

    async def get_by_id(self, org_id: str) -> Optional[Organization]:
        result = await self.db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, company_email: str) -> Optional[Organization]:
        if not company_email:
            return None
        result = await self.db.execute(
            select(Organization).where(
                func.lower(Organization.company_email) == company_email.strip().lower()
            )
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, company_name: str) -> Optional[Organization]:
        if not company_name:
            return None
        result = await self.db.execute(
            select(Organization).where(
                func.lower(Organization.company_name) == company_name.strip().lower()
            )
        )
        return result.scalar_one_or_none()

    async def list_public_organizations(
        self, search: Optional[str] = None, limit: int = 50
    ) -> List[Organization]:
        query = select(Organization).where(Organization.status == OrgStatus.ACTIVE)
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            query = query.where(func.lower(Organization.company_name).like(term))
        query = query.order_by(Organization.company_name.asc()).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update(self, org: Organization, **kwargs) -> Organization:
        for k, v in kwargs.items():
            setattr(org, k, v)
        await self.db.flush()
        await self.db.refresh(org)
        return org

    async def add_member(
        self,
        org_id: str,
        user_id: str,
        role: str = "ORG_ADMIN",
        status: MemberStatus = MemberStatus.ACTIVE,
    ) -> OrganizationMember:
        member = OrganizationMember(
            organization_id=org_id,
            user_id=user_id,
            role=role,
            status=status,
        )
        self.db.add(member)
        await self.db.flush()
        return member

    async def get_members(self, org_id: str) -> List[OrganizationMember]:
        result = await self.db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org_id
            )
        )
        return list(result.scalars().all())

    async def get_member_by_id(self, member_id: str) -> Optional[OrganizationMember]:
        result = await self.db.execute(
            select(OrganizationMember).where(OrganizationMember.id == member_id)
        )
        return result.scalar_one_or_none()

    async def get_members_with_users(
        self, org_id: str, status: Optional[MemberStatus] = None
    ) -> List[Tuple[OrganizationMember, User]]:
        query = (
            select(OrganizationMember, User)
            .join(User, OrganizationMember.user_id == User.id)
            .where(OrganizationMember.organization_id == org_id)
        )
        if status:
            query = query.where(OrganizationMember.status == status)
        query = query.order_by(OrganizationMember.created_at.desc())
        result = await self.db.execute(query)
        return list(result.all())

    async def count_members(self, org_id: str) -> int:
        result = await self.db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org_id
            )
        )
        return result.scalar_one() or 0

    async def count_pending_invitations(self, org_id: str) -> int:
        result = await self.db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.status == MemberStatus.INVITED,
            )
        )
        return result.scalar_one() or 0

    async def count_active_members(self, org_id: str) -> int:
        result = await self.db.execute(
            select(func.count(OrganizationMember.id)).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.status == MemberStatus.ACTIVE,
            )
        )
        return result.scalar_one() or 0

    async def update_member_status(
        self, member: OrganizationMember, status: MemberStatus
    ) -> OrganizationMember:
        member.status = status
        await self.db.flush()
        await self.db.refresh(member)
        return member

    async def get_user_memberships(
        self, user_id: str
    ) -> List[OrganizationMember]:
        result = await self.db.execute(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user_id
            )
        )
        return list(result.scalars().all())

    async def get_user_membership(
        self, org_id: str, user_id: str
    ) -> Optional[OrganizationMember]:
        result = await self.db.execute(
            select(OrganizationMember).where(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()
