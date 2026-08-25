"""
Twin Agent Platform — FastAPI Application Entry Point
"""
# Uvicorn hot-reload trigger
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_db
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.limiter import limiter
from app.api.router import api_router
from app.modules.health.router import health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup/shutdown events."""
    setup_logging()
    await init_db()

    # ── Auto-start Telegram polling if token is configured ────────────────────
    # Polling is used for local development (no public webhook URL needed).
    # In production, use the /api/v1/telegram/setup-webhook endpoint instead
    # and Telegram will push updates directly to the webhook URL.
    telegram_poll_task = None
    if settings.TELEGRAM_BOT_TOKEN:
        from app.integrations.telegram.polling import start_polling
        import asyncio as _asyncio
        telegram_poll_task = _asyncio.create_task(
            start_polling(settings.TELEGRAM_BOT_TOKEN),
            name="telegram-polling",
        )
        import logging as _logging
        _logging.getLogger(__name__).info(
            "Telegram polling task started for bot token %s...",
            settings.TELEGRAM_BOT_TOKEN[:10],
        )

    yield

    # ── Shutdown: stop polling ────────────────────────────────────────────────
    if telegram_poll_task and not telegram_poll_task.done():
        from app.integrations.telegram.polling import stop_polling
        stop_polling()
        try:
            await _asyncio.wait_for(telegram_poll_task, timeout=5)
        except Exception:
            telegram_poll_task.cancel()



def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="Twin Agent Platform — Organizational AI Operating System",
        version="1.0.0",
        openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── Rate limiter ──────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── CORS ──────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────
    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()
