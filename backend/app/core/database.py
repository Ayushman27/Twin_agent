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
    """Create all tables on startup (dev convenience) and seed seed accounts."""
    from app.db.base import Base
    from app.modules.auth.models import User, UserRole
    from app.modules.organizations.models import Organization, OrganizationMember, OrgStatus, MemberStatus
    from app.modules.applications.models import Application  # noqa: F401
    from app.modules.documents.models import ApplicationDocument  # noqa: F401
    from app.modules.desktop.models import DesktopRelease  # noqa: F401
    from app.modules.demo_agent.models import AgentSession, AgentMessage  # noqa: F401
    from app.modules.roles.models import Role, RoleCapability, EmployeeRoleAssignment  # noqa: F401
    from app.modules.teams.models import Team, TeamMember  # noqa: F401
    from app.db.postgres import get_neon_session_maker
    from app.core.security import hash_password
    from sqlalchemy import select

    # 1. Ensure SQLite tables exist for local agent runs
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed identity test data in the active identity store
    neon_maker = get_neon_session_maker()
    session_factory = neon_maker if neon_maker is not None else AsyncSessionLocal

    try:
        async with session_factory() as session:
            # Check ORG_ADMIN user
            res_admin = await session.execute(select(User).where(User.email == "admin@company.ai"))
            admin = res_admin.scalar_one_or_none()
            if not admin:
                admin = User(
                    name="Asha Verma",
                    email="admin@company.ai",
                    password_hash=hash_password("SecureAdmin1"),
                    role=UserRole.ORG_ADMIN,
                    job_title="Chief Technology Officer",
                    is_active=True,
                )
                session.add(admin)
                await session.flush()

                # Seed organization
                org = Organization(
                    company_name="Twin Agent Technologies Inc.",
                    company_email="contact@company.ai",
                    industry="Artificial Intelligence",
                    company_size="50-200",
                    status=OrgStatus.ACTIVE,
                    primary_contact="Asha Verma",
                )
                session.add(org)
                await session.flush()

                member = OrganizationMember(
                    organization_id=org.id,
                    user_id=admin.id,
                    role="ORG_ADMIN",
                    status=MemberStatus.ACTIVE,
                )
                session.add(member)

            # Check EMPLOYEE user
            res_emp = await session.execute(select(User).where(User.email == "employee@company.ai"))
            emp = res_emp.scalar_one_or_none()
            if not emp:
                emp = User(
                    name="Rohan Mehta",
                    email="employee@company.ai",
                    password_hash=hash_password("SecureEmployee1"),
                    role=UserRole.EMPLOYEE,
                    job_title="Software Engineer",
                    is_active=True,
                )
                session.add(emp)
                await session.flush()

                # Associate employee with the organization
                res_org = await session.execute(select(Organization).limit(1))
                existing_org = res_org.scalar_one_or_none()
                if existing_org:
                    emp_member = OrganizationMember(
                        organization_id=existing_org.id,
                        user_id=emp.id,
                        role="EMPLOYEE",
                        status=MemberStatus.ACTIVE,
                    )
                    session.add(emp_member)

            # Check UNAFFILIATED EMPLOYEE user (for testing rejection of users with no org)
            res_unaffil = await session.execute(select(User).where(User.email == "unaffiliated@company.ai"))
            unaffil = res_unaffil.scalar_one_or_none()
            if not unaffil:
                unaffil = User(
                    name="Alex Mercer (Unaffiliated)",
                    email="unaffiliated@company.ai",
                    password_hash=hash_password("SecureUnaffiliated1"),
                    role=UserRole.EMPLOYEE,
                    job_title="Candidate",
                    is_active=True,
                )
                session.add(unaffil)

            await session.commit()
    except Exception:
        # Non-blocking if table is locked or in concurrent test mode
        pass
