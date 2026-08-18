"""Applications module — Service."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.modules.applications.models import Application, ApplicationStatus
from app.modules.applications.repository import ApplicationRepository
from app.modules.applications.schemas import ApplicationCreate, ApplicationUpdate
from app.modules.auth.models import User
from app.modules.organizations.repository import OrganizationRepository


class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.repo     = ApplicationRepository(db)
        self.org_repo = OrganizationRepository(db)

    async def create(self, data: ApplicationCreate, creator: User) -> Application:
        await self._assert_org_member(data.organization_id, creator)
        payload = data.model_dump()
        # Convert nested models to dicts for JSON columns
        for field in ("business_information", "technical_information",
                      "workflow_information", "ai_requirements"):
            if payload.get(field):
                payload[field] = payload[field]  # already a dict from model_dump
        return await self.repo.create(**payload, submitted_by=creator.id)

    async def get(self, app_id: str, current_user: User) -> Application:
        app = await self._get_and_authorize(app_id, current_user)
        return app

    async def update(
        self, app_id: str, data: ApplicationUpdate, current_user: User
    ) -> Application:
        app = await self._get_and_authorize(app_id, current_user)
        if app.status not in (ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED):
            raise ValidationException("Cannot update a reviewed application")
        updates = data.model_dump(exclude_none=True)
        return await self.repo.update(app, **updates)

    async def submit(self, app_id: str, current_user: User) -> Application:
        app = await self._get_and_authorize(app_id, current_user)
        if app.status != ApplicationStatus.DRAFT:
            raise ValidationException("Only DRAFT applications can be submitted")
        return await self.repo.update(app, status=ApplicationStatus.SUBMITTED)

    async def list_by_org(self, org_id: str, current_user: User):
        await self._assert_org_member(org_id, current_user)
        return await self.repo.get_by_org(org_id)

    async def _get_and_authorize(self, app_id: str, user: User) -> Application:
        app = await self.repo.get_by_id(app_id)
        if not app:
            raise NotFoundException("Application", app_id)
        await self._assert_org_member(app.organization_id, user)
        return app

    async def _assert_org_member(self, org_id: str, user: User) -> None:
        from app.modules.auth.models import UserRole
        if user.role == UserRole.SUPER_ADMIN:
            return
        membership = await self.org_repo.get_user_membership(org_id, user.id)
        if not membership:
            raise ForbiddenException("You are not a member of this organization")
