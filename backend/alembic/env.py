"""Alembic environment for async SQLAlchemy."""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Load app config
from app.core.config import settings
from app.db.base import Base  # noqa: F401 — imports all models
from app.modules.auth.models import User  # noqa: F401, E402
from app.modules.organizations.models import Organization, OrganizationMember  # noqa: F401, E402
from app.modules.applications.models import Application  # noqa: F401, E402
from app.modules.documents.models import ApplicationDocument  # noqa: F401, E402
from app.modules.desktop.models import DesktopRelease  # noqa: F401, E402
from app.modules.demo_agent.models import AgentSession, AgentMessage  # noqa: F401, E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # Required for SQLite ALTER TABLE
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
