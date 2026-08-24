"""Main API v1 router — aggregates all module routers."""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.onboarding.router import router as onboarding_router
from app.modules.organizations.router import router as org_router
from app.modules.roles.router import router as roles_router
from app.modules.teams.router import router as teams_router
from app.modules.applications.router import router as app_router
from app.modules.documents.router import router as doc_router
from app.modules.desktop.router import router as desktop_router
from app.modules.demo_agent.router import router as demo_router
from app.modules.health.router import api_health_router
from app.api.agentic.groups import router as agent_groups_router
from app.api.agentic.capabilities import router as agent_capabilities_router
from app.api.agentic.executions import router as agent_executions_router
from app.api.v1.endpoints.gemini_live import router as gemini_live_router

api_router = APIRouter()

api_router.include_router(auth_router,       prefix="/auth",          tags=["Authentication"])
api_router.include_router(onboarding_router, prefix="/onboarding",    tags=["Onboarding"])
api_router.include_router(org_router,        prefix="/organizations", tags=["Organizations"])
api_router.include_router(roles_router,      prefix="",               tags=["Roles"])
api_router.include_router(teams_router,      prefix="",               tags=["Teams"])
api_router.include_router(app_router,        prefix="/applications",  tags=["Applications"])
api_router.include_router(doc_router,        prefix="",               tags=["Documents"])
api_router.include_router(desktop_router,    prefix="/desktop",       tags=["Desktop"])
api_router.include_router(demo_router,       prefix="/demo-agent",    tags=["Demo Agent"])
api_router.include_router(api_health_router, prefix="/health",        tags=["Health"])
api_router.include_router(gemini_live_router, prefix="",               tags=["Gemini Live Voice"])

# Dynamic Agentic Layer Endpoints
api_router.include_router(agent_groups_router,       prefix="", tags=["Agent Groups"])
api_router.include_router(agent_capabilities_router, prefix="", tags=["Agent Capabilities"])
api_router.include_router(agent_executions_router,   prefix="", tags=["Agent Executions"])
