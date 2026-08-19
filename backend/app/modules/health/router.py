"""Health check module — router."""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import check_neon_connection
from app.db.session import get_db
from app.db.sqlite import check_sqlite_connection

health_router    = APIRouter(tags=["Health"])
api_health_router = APIRouter()


@health_router.get("/health", summary="Basic health check")
async def health():
    return {"status": "ok", "service": "Twin Agent Platform API"}


@api_health_router.get("/", summary="API v1 health check")
async def api_health():
    return {"success": True, "data": {"status": "healthy"}}


@api_health_router.get("/database", summary="Database health check")
async def db_health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"success": True, "data": {"database": "connected"}}
    except Exception as e:
        return {"success": False, "error": {"code": "DB_ERROR", "message": str(e)}}


@api_health_router.get("/neon", summary="Neon PostgreSQL connectivity check (SELECT 1)")
async def neon_health():
    """Performs safe 'SELECT 1' against Neon PostgreSQL without modifying tables."""
    return await check_neon_connection()


@api_health_router.get("/sqlite", summary="SQLite Agent database connectivity check (SELECT 1)")
async def sqlite_health():
    """Performs safe 'SELECT 1' against SQLite Agent database."""
    return await check_sqlite_connection()
