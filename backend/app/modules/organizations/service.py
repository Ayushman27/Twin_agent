"""Organizations module — Service."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.modules.auth.models import User
from app.modules.organizations.models import Organization, OrgStatus
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
)


class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.repo = OrganizationRepository(db)

    async def create(self, data: OrganizationCreate, creator: User) -> Organization:
        org = await self.repo.create(
            **data.model_dump(),
            status=OrgStatus.PENDING,
        )
        await self.repo.add_member(org.id, creator.id, role="ORG_ADMIN")
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

    async def get_members(self, org_id: str, current_user: User):
        org = await self.repo.get_by_id(org_id)
        if not org:
            raise NotFoundException("Organization", org_id)
        await self._assert_member(org_id, current_user)
        return await self.repo.get_members(org_id)

    async def _assert_member(self, org_id: str, user: User) -> None:
        from app.modules.auth.models import UserRole
        if user.role == UserRole.SUPER_ADMIN:
            return
        membership = await self.repo.get_user_membership(org_id, user.id)
        if not membership:
            raise ForbiddenException("You are not a member of this organization")
