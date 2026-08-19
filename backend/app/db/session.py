"""
Database session dependencies for FastAPI routes.

Architecture:
- get_neon_db: Neon PostgreSQL session (Identity, Organizations, Users, Onboarding)
- get_agent_db: SQLite session (Agent runs, sessions, transcripts)
- get_db: Default session (maps to SQLite / current engine for backward compatibility)
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.db.postgres import get_neon_db
from app.db.sqlite import get_agent_db


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Default database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


__all__ = ["get_db", "get_neon_db", "get_agent_db"]
