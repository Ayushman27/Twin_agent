"""Desktop module — Service."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException, ValidationException
from app.modules.desktop.models import DesktopRelease, Platform


class DesktopService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_releases(self) -> List[DesktopRelease]:
        result = await self.db.execute(select(DesktopRelease))
        return list(result.scalars().all())

    async def get_latest(self) -> List[DesktopRelease]:
        result = await self.db.execute(
            select(DesktopRelease).where(DesktopRelease.is_latest == True)  # noqa
        )
        return list(result.scalars().all())

    async def get_for_platform(self, platform: str) -> DesktopRelease:
        try:
            plat = Platform(platform.lower())
        except ValueError:
            raise ValidationException(
                f"Unknown platform: {platform}. Supported: {[p.value for p in Platform]}"
            )
        result = await self.db.execute(
            select(DesktopRelease).where(
                DesktopRelease.platform == plat,
                DesktopRelease.is_latest == True,  # noqa
            )
        )
        release = result.scalar_one_or_none()
        if not release:
            raise NotFoundException(f"No release found for platform: {platform}")
        return release
