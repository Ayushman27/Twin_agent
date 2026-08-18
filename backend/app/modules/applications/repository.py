"""Applications module — Repository."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.applications.models import Application


class ApplicationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, **kwargs) -> Application:
        app = Application(**kwargs)
        self.db.add(app)
        await self.db.flush()
        await self.db.refresh(app)
        return app

    async def get_by_id(self, app_id: str) -> Optional[Application]:
        result = await self.db.execute(
            select(Application).where(Application.id == app_id)
        )
        return result.scalar_one_or_none()

    async def get_by_org(self, org_id: str) -> List[Application]:
        result = await self.db.execute(
            select(Application).where(Application.organization_id == org_id)
        )
        return list(result.scalars().all())

    async def update(self, app: Application, **kwargs) -> Application:
        for k, v in kwargs.items():
            setattr(app, k, v)
        await self.db.flush()
        await self.db.refresh(app)
        return app
