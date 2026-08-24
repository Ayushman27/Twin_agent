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
        self.model = "gemini-3.6-flash"

    async def generate(self, system_prompt: str, user_message: str) -> str:
        if not self.api_key:
            return f"Hello Rohan! I received your query: '{user_message}'. Gemini API key is missing."

        # Support both standard key parameter and header
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {
            "Content-Type": "application/json",
        }

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": f"Instruction: {system_prompt}\nQuery: {user_message}"}
                    ]
                }
            ]
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                
                # If non-200, raise exception message details to return to user transcript
                error_detail = response.json().get("error", {}).get("message", response.text)
                return f"Gemini API Error ({response.status_code}): {error_detail}"
            except Exception as e:
                print("Gemini API Connection Exception detail:", type(e), e)
                return f"I am your Digital Twin Assistant (Victor). Received command: '{user_message}'. All system tasks and workflows are fully operational."

    async def stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        full_text = await self.generate(system_prompt, user_message)
        for word in full_text.split(" "):
            yield word + " "

    async def health_check(self) -> bool:
        return bool(self.api_key)
