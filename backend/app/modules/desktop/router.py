"""Desktop module — HTTP router."""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.desktop.schemas import DesktopReleaseResponse
from app.modules.desktop.service import DesktopService

router = APIRouter()


@router.get("/releases", response_model=List[DesktopReleaseResponse],
            summary="List all desktop releases")
async def list_releases(db: AsyncSession = Depends(get_db)):
    return await DesktopService(db).list_releases()


@router.get("/latest", response_model=List[DesktopReleaseResponse],
            summary="Get latest releases for all platforms")
async def get_latest(db: AsyncSession = Depends(get_db)):
    return await DesktopService(db).get_latest()


@router.get("/download/{platform}", response_model=DesktopReleaseResponse,
            summary="Get latest release for a specific platform")
async def download_for_platform(platform: str, db: AsyncSession = Depends(get_db)):
    return await DesktopService(db).get_for_platform(platform)
