"""
Voice Agent execution endpoint — triggers Gemini LLM generation directly.
"""
from typing import Dict, Any
from fastapi import APIRouter
from app.ai.llm.factory import get_ai_provider

router = APIRouter()

@router.post("/execute")
async def execute_voice_prompt(payload: Dict[str, Any]):
    prompt = payload.get("prompt", "Hello")
    llm = get_ai_provider()
    
    system_prompt = (
        "You are Rohan's AI Digital Twin Executive Assistant in the Twin Agent Platform. "
        "Respond concisely, intelligently, and helpfully in 1-2 sentences."
    )
    
    reply = await llm.generate(system_prompt=system_prompt, user_message=prompt)
    return {"output": reply, "response": reply}
