"""Alembic environment for async SQLAlchemy — Neon PostgreSQL Identity Schema."""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Load app config
from app.core.config import settings
from app.db.base import IdentityBase
from app.modules.auth.models import User  # noqa: F401
from app.modules.organizations.models import Organization, OrganizationMember  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = IdentityBase.metadata


def get_database_url() -> str:
    """Target Neon PostgreSQL, falling back to configured database URL."""
    return settings.NEON_DATABASE_URL or settings.DATABASE_URL


def run_migrations_offline() -> None:
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url = get_database_url()
    engine = create_async_engine(url)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
