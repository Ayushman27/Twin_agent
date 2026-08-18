"""
Async SQLAlchemy database engine and session factory.
Supports SQLite (dev) and PostgreSQL (prod) via DATABASE_URL env var.
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────
connect_args = {}
if "sqlite" in settings.DATABASE_URL:
    # SQLite requires check_same_thread=False for async usage
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args=connect_args,
)

# ── Session factory ───────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def init_db() -> None:
    """Create all tables on startup (dev convenience)."""
    from app.db.base import Base  # noqa: F401
    # Import models here to ensure they are registered with Base.metadata before creation
    from app.modules.auth.models import User  # noqa: F401, E402
    from app.modules.organizations.models import Organization, OrganizationMember  # noqa: F401, E402
    from app.modules.applications.models import Application  # noqa: F401, E402
    from app.modules.documents.models import ApplicationDocument  # noqa: F401, E402
    from app.modules.desktop.models import DesktopRelease  # noqa: F401, E402
    from app.modules.demo_agent.models import AgentSession, AgentMessage  # noqa: F401, E402

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
