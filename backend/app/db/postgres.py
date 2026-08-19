"""
Neon PostgreSQL Database Configuration and Session Management.
Dedicated to Identity, Authentication, Organizations, and Employee profile data.
"""
import re
from typing import AsyncGenerator, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def mask_database_url(url: Optional[str]) -> str:
    """Safely redact password and credentials from database connection string for logging."""
    if not url:
        return "<none>"
    try:
        return re.sub(r":([^:@]+)@", ":****@", str(url))
    except Exception:
        return "<redacted-url>"


def normalize_postgres_url(url: str) -> str:
    """Ensure asyncpg driver and compatible SSL parameters are specified in connection string."""
    if not url:
        return url
    url_str = url.strip()
    if url_str.startswith("postgresql://"):
        url_str = "postgresql+asyncpg://" + url_str[len("postgresql://"):]
    elif url_str.startswith("postgres://"):
        url_str = "postgresql+asyncpg://" + url_str[len("postgres://"):]
    if "sslmode=" in url_str:
        url_str = url_str.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=allow", "ssl=allow")
    return url_str


# ── Neon Async Engine ─────────────────────────────────────────
_neon_engine: Optional[AsyncEngine] = None
_neon_session_maker: Optional[async_sessionmaker[AsyncSession]] = None


def get_neon_engine() -> Optional[AsyncEngine]:
    """Retrieve or lazily initialize the Neon PostgreSQL async engine."""
    global _neon_engine, _neon_session_maker

    url = settings.NEON_DATABASE_URL
    if not url:
        return None

    normalized_url = normalize_postgres_url(url)

    if _neon_engine is None:
        _neon_engine = create_async_engine(
            normalized_url,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        _neon_session_maker = async_sessionmaker(
            bind=_neon_engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )

    return _neon_engine


def get_neon_session_maker() -> Optional[async_sessionmaker[AsyncSession]]:
    """Retrieve the session factory for Neon PostgreSQL."""
    global _neon_session_maker
    if _neon_session_maker is None:
        get_neon_engine()
    return _neon_session_maker


async def get_neon_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency for Neon PostgreSQL sessions (Identity, Organizations, Users)."""
    session_maker = get_neon_session_maker()
    if session_maker is None:
        from app.core.database import AsyncSessionLocal
        session_maker = AsyncSessionLocal

    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_neon_connection(database_url: Optional[str] = None) -> dict:
    """
    Safely perform a connectivity test against Neon PostgreSQL.
    Executes 'SELECT 1' without creating or altering any tables.
    Returns sanitized status and never exposes database credentials.
    """
    url = database_url if database_url is not None else settings.NEON_DATABASE_URL
    if not url or not str(url).strip():
        return {
            "status": "unconfigured",
            "database": "neon_postgresql",
            "message": "NEON_DATABASE_URL is not set.",
        }

    normalized_url = normalize_postgres_url(str(url))
    temp_engine = create_async_engine(normalized_url, pool_pre_ping=True)
    masked_url = mask_database_url(normalized_url)

    try:
        async with temp_engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            scalar = result.scalar()
            if scalar == 1:
                return {
                    "status": "connected",
                    "database": "neon_postgresql",
                    "query": "SELECT 1",
                    "result": scalar,
                    "target": masked_url,
                }
            return {
                "status": "unexpected_result",
                "database": "neon_postgresql",
                "result": scalar,
                "target": masked_url,
            }
    except Exception as e:
        raw_msg = str(e)
        sanitized_msg = mask_database_url(raw_msg)
        return {
            "status": "error",
            "database": "neon_postgresql",
            "error_type": type(e).__name__,
            "error_message": sanitized_msg,
            "target": masked_url,
        }
    finally:
        await temp_engine.dispose()
