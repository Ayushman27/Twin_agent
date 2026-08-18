"""AI provider factory — selects provider based on LLM_PROVIDER env var."""
from functools import lru_cache

from app.ai.llm.interface import AIProvider
from app.core.config import settings


@lru_cache(maxsize=1)
def get_ai_provider() -> AIProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "mock":
        from app.ai.llm.mock_provider import MockLLMProvider
        return MockLLMProvider()
    elif provider == "openai":
        from app.ai.llm.openai_provider import OpenAIProvider
        return OpenAIProvider()
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}. Supported: mock, openai")
