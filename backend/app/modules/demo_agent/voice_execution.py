"""
Voice Agent execution endpoint — triggers Gemini LLM generation with conversation memory.
"""
from typing import Dict, Any, List
from fastapi import APIRouter
from app.ai.llm.factory import get_ai_provider

router = APIRouter()

@router.post("/execute")
async def execute_voice_prompt(payload: Dict[str, Any]):
    prompt = payload.get("prompt", "Hello")
    history: List[Dict[str, str]] = payload.get("history", [])

    llm = get_ai_provider()

    system_prompt = (
        "You are Echo, an AI Voice Assistant and Digital Twin Executive Assistant for the Twin Agent Platform. "
        "You help users manage tasks, schedules, approvals, and workflows. "
        "Respond concisely and helpfully in 1-3 sentences. "
        "Remember the conversation context provided."
    )

    # Build full prompt with conversation history for memory
    if history:
        history_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Echo'}: {m['content']}"
            for m in history[-10:]  # Last 10 turns for context window
        )
        full_prompt = f"Conversation so far:\n{history_text}\n\nUser: {prompt}"
    else:
        full_prompt = prompt

    reply = await llm.generate(system_prompt=system_prompt, user_message=full_prompt)
    return {"output": reply, "response": reply}
