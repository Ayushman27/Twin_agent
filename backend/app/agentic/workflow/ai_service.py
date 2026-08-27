"""
Central AI/LLM Service abstraction for agents.
Provides robust text and structured JSON generation with schema validation and fallback handling.
"""
import json
import re
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel

from app.ai.llm.factory import get_ai_provider
from app.ai.llm.interface import AIProvider
from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


class AIService:
    """
    Unified AI service used across all agents in the Agentic Task Execution System.
    """
    def __init__(self, provider: Optional[AIProvider] = None):
        self._provider = provider or get_ai_provider()

    def get_model_provider(self) -> str:
        """Returns the name/identifier of current provider."""
        return type(self._provider).__name__

    async def generate(self, system_prompt: str, user_message: str) -> str:
        """
        Generate raw text response from provider.
        """
        try:
            return await self._provider.generate(system_prompt, user_message)
        except Exception as e:
            print(f"[AIService.generate] Provider error: {e}")
            from app.ai.llm.mock_provider import MockLLMProvider
            fallback = MockLLMProvider()
            return await fallback.generate(system_prompt, user_message)

    async def generate_structured(
        self,
        system_prompt: str,
        user_message: str,
        schema_class: Type[T],
        default_instance: Optional[T] = None
    ) -> T:
        """
        Generates and parses structured JSON matching the provided Pydantic schema class.
        Includes markdown cleanup, regex JSON extraction, and fallback mechanisms.
        """
        json_system_prompt = (
            f"{system_prompt}\n\n"
            f"IMPORTANT: You MUST respond ONLY with a valid JSON object matching this schema:\n"
            f"{json.dumps(schema_class.model_json_schema(), indent=2)}\n"
            f"Do not include any explanation outside the JSON object."
        )

        raw_output = await self.generate(json_system_prompt, user_message)

        # 1. Direct parse attempt
        parsed = self._extract_and_parse_json(raw_output)
        if parsed is not None:
            try:
                return schema_class.model_validate(parsed)
            except Exception as e:
                print(f"[AIService.generate_structured] Validation error: {e}")

        # 2. Return default or fallback
        if default_instance is not None:
            return default_instance

        # Try to instantiate empty schema if fields allow
        try:
            return schema_class.model_validate({})
        except Exception:
            raise ValueError(f"Failed to generate structured data for {schema_class.__name__}")

    @staticmethod
    def _extract_and_parse_json(text: str) -> Optional[Dict[str, Any]]:
        """Extracts JSON from text, handling markdown fences or raw blocks."""
        if not text:
            return None

        # Clean markdown codeblocks: ```json ... ``` or ``` ... ```
        cleaned = text.strip()
        if "```" in cleaned:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
            if match:
                cleaned = match.group(1).strip()

        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Try finding first { and matching last }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start:end+1])
            except Exception:
                pass

        return None
