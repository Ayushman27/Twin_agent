"""AI Provider abstract interface."""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class AIProvider(ABC):
    """
    Abstract base for all LLM providers.
    Implement this to add OpenAI, Anthropic, local LLM, vLLM, Ollama, etc.
    """

    @abstractmethod
    async def generate(self, system_prompt: str, user_message: str) -> str:
        """Generate a complete response."""

    @abstractmethod
    async def stream(
        self, system_prompt: str, user_message: str
    ) -> AsyncIterator[str]:
        """Stream response tokens."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the provider is reachable."""
