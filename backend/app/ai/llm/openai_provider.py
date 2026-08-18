"""
OpenAI LLM Provider — activated when LLM_PROVIDER=openai.
Requires LLM_API_KEY to be set.
"""
from typing import AsyncIterator

from app.ai.llm.interface import AIProvider
from app.core.config import settings


class OpenAIProvider(AIProvider):
    def __init__(self):
        try:
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=settings.LLM_API_KEY)
            self.model  = settings.LLM_MODEL
        except ImportError:
            raise RuntimeError("openai package is not installed")

    async def generate(self, system_prompt: str, user_message: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=settings.LLM_MAX_TOKENS,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
        )
        return response.choices[0].message.content or ""

    async def stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        stream = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=settings.LLM_MAX_TOKENS,
            stream=True,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def health_check(self) -> bool:
        try:
            await self.client.models.list()
            return True
        except Exception:
            return False
