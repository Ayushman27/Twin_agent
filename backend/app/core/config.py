"""
Application configuration via Pydantic BaseSettings.
All settings are read from environment variables / .env file.
"""
import json
from functools import lru_cache
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = "Twin Agent Platform"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://localhost:3001"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            v_str = v.strip()
            if v_str.startswith("[") and v_str.endswith("]"):
                try:
                    return json.loads(v_str)
                except Exception:
                    pass
            return [o.strip() for o in v_str.split(",") if o.strip()]
        return v

    # ── Database 1: Neon PostgreSQL (Identity, Company, Employee, Auth) ──
    NEON_DATABASE_URL: Optional[str] = None

    @field_validator("NEON_DATABASE_URL", mode="before")
    @classmethod
    def format_neon_url(cls, v):
        if isinstance(v, str) and v.strip():
            url = v.strip()
            if url.startswith("postgresql://"):
                url = "postgresql+asyncpg://" + url[len("postgresql://"):]
            elif url.startswith("postgres://"):
                url = "postgresql+asyncpg://" + url[len("postgres://"):]
            if "sslmode=" in url:
                url = url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=allow", "ssl=allow")
            return url
        return v

    # ── Database 2: SQLite (Agent subsystem, runs, sessions, transcripts) ─
    AGENT_DATABASE_URL: str = "sqlite+aiosqlite:///./twin_agent.db"

    # Default / backward compatibility fallback
    DATABASE_URL: str = "sqlite+aiosqlite:///./twin_agent.db"

    # ── JWT ──────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Storage ───────────────────────────────────────────────
    STORAGE_PROVIDER: str = "local"
    STORAGE_LOCAL_PATH: str = "./uploads"
    STORAGE_BUCKET: str = "twin-agent-uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    LLM_PROVIDER: str = "mock"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_MAX_TOKENS: int = 512
    GEMINI_API_KEY: str = ""

    # ── NVIDIA NeMo Speech ─────────────────────────────────────────
    NVIDIA_NEMO_SERVER_URL: Optional[str] = None
    NVIDIA_NGC_API_KEY: Optional[str] = None
    NVIDIA_NEMO_TTS_VOICE: str = "en_US-Male-1"
    NVIDIA_NEMO_ASR_MODEL: str = "stt_en_fastconformer_ctc_large"
    SPEECH_PROVIDER: str = "nemo"

    # ── Email (future) ───────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@twinagent.ai"

    # ── Telegram Integration ──────────────────────────────────────
    # Token must be set in .env — NEVER hardcode here.
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    # Optional: if set, every webhook request is validated against this secret.
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    TELEGRAM_WEBHOOK_SECRET: Optional[str] = None

    # ── Rate limiting ─────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
