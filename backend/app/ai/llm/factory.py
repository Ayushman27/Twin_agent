"""AI provider factory — selects provider based on LLM_PROVIDER env var."""
from functools import lru_cache

from app.ai.llm.interface import AIProvider
from app.core.config import settings


def get_ai_provider() -> AIProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "gemini" or (settings.GEMINI_API_KEY and provider != "mock" and provider != "openai"):
        from app.ai.llm.gemini_provider import GeminiLLMProvider
        return GeminiLLMProvider()
    elif provider == "openai":
        from app.ai.llm.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif provider == "mock":
        from app.ai.llm.mock_provider import MockLLMProvider
        return MockLLMProvider()
    else:
        if settings.GEMINI_API_KEY:
            from app.ai.llm.gemini_provider import GeminiLLMProvider
            return GeminiLLMProvider()
        from app.ai.llm.mock_provider import MockLLMProvider
        return MockLLMProvider()
