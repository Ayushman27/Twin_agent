"""Main API v1 router — aggregates all module routers."""
from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.onboarding.router import router as onboarding_router
from app.modules.organizations.router import router as org_router
from app.modules.roles.router import router as roles_router
from app.modules.teams.router import router as teams_router
from app.modules.projects.router import router as projects_router
from app.modules.applications.router import router as app_router
from app.modules.documents.router import router as doc_router
from app.modules.desktop.router import router as desktop_router
from app.modules.demo_agent.router import router as demo_router
from app.modules.demo_agent.voice_execution import router as voice_router
from app.modules.health.router import api_health_router
from app.api.agentic.groups import router as agent_groups_router
from app.api.agentic.capabilities import router as agent_capabilities_router
from app.api.agentic.executions import router as agent_executions_router
from app.api.agentic.workflow_router import router as agent_workflow_router
from app.api.v1.endpoints.gemini_live import router as gemini_live_router
from app.api.v1.endpoints.nemo_speech import router as nemo_speech_router
from app.api.v1.endpoints.messaging import router as messaging_router
from app.integrations.telegram.router import router as telegram_router
from app.modules.email.router import router as email_router
from app.integrations.google.router import router as google_router

api_router = APIRouter()

api_router.include_router(auth_router,       prefix="/auth",          tags=["Authentication"])
api_router.include_router(onboarding_router, prefix="/onboarding",    tags=["Onboarding"])
api_router.include_router(org_router,        prefix="/organizations", tags=["Organizations"])
api_router.include_router(roles_router,      prefix="",               tags=["Roles"])
api_router.include_router(teams_router,      prefix="",               tags=["Teams"])
api_router.include_router(projects_router,   prefix="",               tags=["Projects"])
api_router.include_router(app_router,        prefix="/applications",  tags=["Applications"])
api_router.include_router(doc_router,        prefix="",               tags=["Documents"])
api_router.include_router(desktop_router,    prefix="/desktop",       tags=["Desktop"])
api_router.include_router(demo_router,       prefix="/demo-agent",    tags=["Demo Agent"])
api_router.include_router(voice_router,      prefix="/demo-agent/voice", tags=["Voice Execution"])
api_router.include_router(voice_router,      prefix="/demo-agent",    tags=["Voice Execution Alias"])
api_router.include_router(api_health_router, prefix="/health",        tags=["Health"])
api_router.include_router(gemini_live_router, prefix="",              tags=["Gemini Live Voice"])
api_router.include_router(nemo_speech_router, prefix="/nemo-speech",  tags=["NVIDIA NeMo Speech-to-Speech"])

# Dynamic Agentic Layer Endpoints
api_router.include_router(agent_groups_router,       prefix="", tags=["Agent Groups"])
api_router.include_router(agent_capabilities_router, prefix="", tags=["Agent Capabilities"])
api_router.include_router(agent_executions_router,   prefix="", tags=["Agent Executions"])
api_router.include_router(agent_workflow_router,     prefix="", tags=["Agentic Workflow"])

# ── Telegram Integration Channel ──────────────────────────────────────────────
api_router.include_router(telegram_router, prefix="/telegram", tags=["Telegram Integration"])

# ── Real-time Messaging (WebSocket) ───────────────────────────────────────────
api_router.include_router(messaging_router, prefix="/messaging", tags=["Messaging"])

# ── Internal Employee Email ───────────────────────────────────────────────────
api_router.include_router(email_router, prefix="/email", tags=["Email"])

# ── Google OAuth & Gmail Integration ──────────────────────────────────────────
api_router.include_router(google_router, prefix="/integrations/gmail", tags=["Gmail Integration"])
api_router.include_router(google_router, prefix="/integrations/google", tags=["Google Integration"])

