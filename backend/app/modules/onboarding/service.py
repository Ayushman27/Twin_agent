"""Onboarding module — Business logic service for self-service registration."""
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException
from app.core.security import create_access_token, create_refresh_token, hash_password
from app.modules.auth.models import UserRole
from app.modules.auth.repository import UserRepository
from app.modules.auth.schemas import UserResponse
from app.modules.onboarding.schemas import (
    CompanyRegisterRequest,
    CompanyRegisterResponse,
    EmployeeRegisterRequest,
    EmployeeRegisterResponse,
    PublicCompaniesResponse,
    PublicCompanyItem,
)
from app.modules.organizations.models import MemberStatus, OrgStatus
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.schemas import OrganizationResponse


class OnboardingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.org_repo = OrganizationRepository(db)
        self.user_repo = UserRepository(db)

    async def list_public_companies(
        self, search: Optional[str] = None, limit: int = 50
    ) -> PublicCompaniesResponse:
        orgs = await self.org_repo.list_public_organizations(search=search, limit=limit)
        items = [
            PublicCompanyItem(
                id=org.id,
                company_name=org.company_name,
                industry=org.industry,
                city=org.city,
                country=org.country,
            )
            for org in orgs
        ]
        return PublicCompaniesResponse(success=True, total=len(items), data=items)

    async def register_company(self, data: CompanyRegisterRequest) -> CompanyRegisterResponse:
        # 1. Pre-validation duplicate checks against Neon PostgreSQL
        existing_company_email = await self.org_repo.get_by_email(data.company_email)
        if existing_company_email:
            raise ConflictException(
                f"A company with the email '{data.company_email}' is already registered."
            )

        existing_company_name = await self.org_repo.get_by_name(data.company_name)
        if existing_company_name:
            raise ConflictException(
                f"A company named '{data.company_name}' is already registered. Please choose a distinct name."
            )

        existing_admin_user = await self.user_repo.get_by_email(data.admin_email)
        if existing_admin_user:
            raise ConflictException(
                f"An administrator account with the email '{data.admin_email}' already exists. Please log in instead."
            )

        # 2. Atomic Database Transaction
        try:
            # 2a. Insert Organization record
            org = await self.org_repo.create(
                company_name=data.company_name.strip(),
                company_email=data.company_email.strip().lower(),
                company_phone=data.company_phone.strip() if data.company_phone else None,
                industry=data.industry,
                company_size=data.company_size,
                employee_count=data.employee_count,
                website=data.website.strip() if data.website else None,
                country=data.country.strip() if data.country else None,
                city=data.city.strip() if data.city else None,
                business_model=data.business_model.strip() if data.business_model else None,
                description=data.description.strip() if data.description else None,
                primary_contact=data.primary_contact.strip() if data.primary_contact else data.admin_name.strip(),
                status=OrgStatus.ACTIVE,
            )

            # 2b. Insert Administrator User record (role forced to ORG_ADMIN)
            admin_user = await self.user_repo.create(
                name=data.admin_name.strip(),
                email=data.admin_email.strip().lower(),
                password_hash=hash_password(data.admin_password),
                phone=data.admin_phone.strip() if data.admin_phone else None,
                job_title="Chief Technology Officer",
                department="Executive Leadership",
                role=UserRole.ORG_ADMIN,
                is_active=True,
            )

            # 2c. Insert OrganizationMember association
            await self.org_repo.add_member(
                org_id=org.id,
                user_id=admin_user.id,
                role="ORG_ADMIN",
                status=MemberStatus.ACTIVE,
            )

            # Commit the atomic transaction
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise

        # 3. Issue Authentication Tokens for immediate onboarding access
        access_token = create_access_token(admin_user.id, {"role": admin_user.role.value})
        refresh_token = create_refresh_token(admin_user.id)

        user_resp = UserResponse(
            id=admin_user.id,
            name=admin_user.name,
            email=admin_user.email,
            phone=admin_user.phone,
            job_title=admin_user.job_title,
            department=admin_user.department,
            employee_id=admin_user.employee_id,
            role=admin_user.role,
            is_active=admin_user.is_active,
            organization_id=org.id,
            created_at=admin_user.created_at,
        )

        org_resp = OrganizationResponse(
            id=org.id,
            company_name=org.company_name,
            company_email=org.company_email,
            company_phone=org.company_phone,
            industry=org.industry,
            company_size=org.company_size,
            employee_count=org.employee_count,
            website=org.website,
            country=org.country,
            city=org.city,
            description=org.description,
            business_model=org.business_model,
            primary_contact=org.primary_contact,
            status=org.status,
            created_at=org.created_at,
            updated_at=org.updated_at,
        )

        return CompanyRegisterResponse(
            success=True,
            message="Organization registered successfully.",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            organization=org_resp,
            user=user_resp,
        )

    async def register_employee(self, data: EmployeeRegisterRequest) -> EmployeeRegisterResponse:
        # 1. Verify organization exists and is active in Neon
        org = await self.org_repo.get_by_id(data.organization_id)
        if not org or org.status != OrgStatus.ACTIVE:
            raise BadRequestException(
                "The given company does not exist yet. The company should first register themselves, so please ask them to register first."
            )

        # 2. Check duplicate email in Neon
        existing_user = await self.user_repo.get_by_email(data.email)
        if existing_user:
            raise ConflictException("An account with this email already exists. Please log in instead.")

        # 3. Atomic Transactional creation
        try:
            # 3a. Create employee User (role is strictly forced to EMPLOYEE by backend)
            employee_user = await self.user_repo.create(
                name=data.name.strip(),
                email=data.email.strip().lower(),
                password_hash=hash_password(data.password),
                phone=data.phone.strip() if data.phone else None,
                employee_id=data.employee_id.strip() if data.employee_id else None,
                department=data.department.strip() if data.department else None,
                job_title=data.job_title.strip() if data.job_title else "Software Engineer",
                role=UserRole.EMPLOYEE,
                is_active=True,
            )

            # 3b. Link User <-> Organization as EMPLOYEE with INVITED (Pending Approval) status in organization_members
            await self.org_repo.add_member(
                org_id=org.id,
                user_id=employee_user.id,
                role="EMPLOYEE",
                status=MemberStatus.INVITED,
            )

            # Commit atomic transaction
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            raise

        user_resp = UserResponse(
            id=employee_user.id,
            name=employee_user.name,
            email=employee_user.email,
            phone=employee_user.phone,
            employee_id=employee_user.employee_id,
            department=employee_user.department,
            job_title=employee_user.job_title,
            role=employee_user.role,
            is_active=employee_user.is_active,
            organization_id=org.id,
            created_at=employee_user.created_at,
        )

        org_resp = OrganizationResponse.model_validate(org)

        return EmployeeRegisterResponse(
            success=True,
            message="Your registration request has been submitted to the organization administrator for approval.",
            requires_approval=True,
            access_token=None,
            refresh_token=None,
            token_type="bearer",
            organization=org_resp,
            user=user_resp,
        )
