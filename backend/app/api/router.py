"""Main API v1 router — aggregates all module routers."""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.organizations.router import router as org_router
from app.modules.applications.router import router as app_router
from app.modules.documents.router import router as doc_router
from app.modules.desktop.router import router as desktop_router
from app.modules.demo_agent.router import router as demo_router
from app.modules.health.router import api_health_router

api_router = APIRouter()

api_router.include_router(auth_router,    prefix="/auth",       tags=["Authentication"])
api_router.include_router(org_router,     prefix="/organizations", tags=["Organizations"])
api_router.include_router(app_router,     prefix="/applications",  tags=["Applications"])
api_router.include_router(doc_router,     prefix="",            tags=["Documents"])
api_router.include_router(desktop_router, prefix="/desktop",    tags=["Desktop"])
api_router.include_router(demo_router,    prefix="/demo-agent", tags=["Demo Agent"])
api_router.include_router(api_health_router, prefix="/health",  tags=["Health"])
