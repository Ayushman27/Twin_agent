"""
SQLite Database Configuration and Session Management.
Dedicated to the AI Agent subsystem (runs, sessions, tasks, transcripts, and agent executions).
"""
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ── SQLite Agent Async Engine ─────────────────────────────────
sqlite_agent_url = settings.AGENT_DATABASE_URL or settings.DATABASE_URL

sqlite_agent_engine: AsyncEngine = create_async_engine(
    sqlite_agent_url,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},
)

# ── SQLite Agent Session Factory ──────────────────────────────
AgentAsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=sqlite_agent_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_agent_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency for SQLite Agent subsystem sessions."""
    async with AgentAsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_sqlite_connection() -> dict:
    """Safely perform a connectivity test against SQLite Agent database."""
    try:
        async with sqlite_agent_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            scalar = result.scalar()
            return {
                "status": "connected",
                "database": "sqlite_agent",
                "query": "SELECT 1",
                "result": scalar,
                "target": sqlite_agent_url,
            }
    except Exception as e:
        return {
            "status": "error",
            "database": "sqlite_agent",
            "error_type": type(e).__name__,
            "error_message": str(e),
        }
