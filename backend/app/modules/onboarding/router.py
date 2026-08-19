"""Onboarding module — HTTP router (Neon PostgreSQL source of truth)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_neon_db
from app.modules.onboarding.schemas import (
    CompanyRegisterRequest,
    CompanyRegisterResponse,
    EmployeeRegisterRequest,
    EmployeeRegisterResponse,
    PublicCompaniesResponse,
)
from app.modules.onboarding.service import OnboardingService

router = APIRouter()


@router.get(
    "/companies",
    response_model=PublicCompaniesResponse,
    summary="Public discovery of registered active companies (for employee enrollment)",
)
async def list_companies(
    search: Optional[str] = Query(None, description="Case-insensitive partial company name search"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_neon_db),
):
    service = OnboardingService(db)
    return await service.list_public_companies(search=search, limit=limit)


@router.post(
    "/company/register",
    response_model=CompanyRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new company and create its initial organization administrator",
)
async def register_company(
    body: CompanyRegisterRequest,
    db: AsyncSession = Depends(get_neon_db),
):
    service = OnboardingService(db)
    return await service.register_company(body)


@router.post(
    "/employee/register",
    response_model=EmployeeRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register an employee user linked to an existing registered organization",
)
async def register_employee(
    body: EmployeeRegisterRequest,
    db: AsyncSession = Depends(get_neon_db),
):
    service = OnboardingService(db)
    return await service.register_employee(body)
