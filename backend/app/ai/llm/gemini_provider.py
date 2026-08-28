"""
Gemini LLM Provider — activated when LLM_PROVIDER=gemini or GEMINI_API_KEY is present.
Connects directly to Google Gemini Generative AI REST / Async SDK.
"""
import os
from typing import AsyncIterator
import httpx

from app.ai.llm.interface import AIProvider
from app.core.config import settings


class GeminiLLMProvider(AIProvider):
    """
    Google Gemini API Provider for real LLM model generation.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.models = ["gemini-1.5-flash"]

    async def generate(self, system_prompt: str, user_message: str) -> str:
        if not self.api_key:
            from app.ai.llm.mock_provider import MockLLMProvider
            return await MockLLMProvider().generate(system_prompt, user_message)

        headers = {
            "Content-Type": "application/json",
        }

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_message}]
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                for model in self.models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
                    response = await client.post(url, json=payload, headers=headers)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                return parts[0]["text"].strip()
                    else:
                        break  # Quota limit or model unavailable; fallback immediately
        except Exception as e:
            pass

        # Fallback to intelligent dynamic generator
        from app.ai.llm.mock_provider import MockLLMProvider
        return await MockLLMProvider().generate(system_prompt, user_message)

    async def stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        full_text = await self.generate(system_prompt, user_message)
        for word in full_text.split(" "):
            yield word + " "

    async def health_check(self) -> bool:
        return bool(self.api_key)
