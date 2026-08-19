"""Organizations module — Repository."""
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.organizations.models import OrgStatus, Organization, OrganizationMember


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
        self, org_id: str, user_id: str, role: str = "ORG_ADMIN"
    ) -> OrganizationMember:
        member = OrganizationMember(
            organization_id=org_id, user_id=user_id, role=role
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
