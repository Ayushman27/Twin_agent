"""Shared pytest fixtures for all backend tests."""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_db, get_neon_db, get_agent_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_twin_agent.db"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    from app.modules.auth.models import User  # noqa: F401
    from app.modules.organizations.models import Organization, OrganizationMember  # noqa: F401
    from app.modules.applications.models import Application  # noqa: F401
    from app.modules.documents.models import ApplicationDocument  # noqa: F401
    from app.modules.desktop.models import DesktopRelease  # noqa: F401
    engine = create_async_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    from app.modules.auth.models import User, UserRole
    from app.modules.organizations.models import Organization, OrganizationMember, OrgStatus, MemberStatus
    from app.core.security import hash_password
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        admin = User(
            name="Asha Verma",
            email="admin@company.ai",
            password_hash=hash_password("SecureAdmin1"),
            role=UserRole.ORG_ADMIN,
            job_title="Chief Technology Officer",
            is_active=True,
        )
        emp = User(
            name="Rohan Mehta",
            email="employee@company.ai",
            password_hash=hash_password("SecureEmployee1"),
            role=UserRole.EMPLOYEE,
            job_title="Software Engineer",
            is_active=True,
        )
        unaffil = User(
            name="Alex Mercer",
            email="unaffiliated@company.ai",
            password_hash=hash_password("SecureUnaffiliated1"),
            role=UserRole.EMPLOYEE,
            job_title="Candidate",
            is_active=True,
        )
        session.add_all([admin, emp, unaffil])
        await session.flush()

        org = Organization(
            company_name="Twin Agent Technologies Inc.",
            company_email="contact@company.ai",
            status=OrgStatus.ACTIVE,
        )
        session.add(org)
        await session.flush()

        mem_admin = OrganizationMember(
            organization_id=org.id,
            user_id=admin.id,
            role="ORG_ADMIN",
            status=MemberStatus.ACTIVE,
        )
        mem_emp = OrganizationMember(
            organization_id=org.id,
            user_id=emp.id,
            role="EMPLOYEE",
            status=MemberStatus.ACTIVE,
        )
        session.add_all([mem_admin, mem_emp])
        await session.commit()
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_neon_db] = override_get_db
    app.dependency_overrides[get_agent_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
