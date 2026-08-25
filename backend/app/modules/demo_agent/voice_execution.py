import re
from typing import Dict, Any, List
from fastapi import APIRouter
from app.ai.llm.factory import get_ai_provider
from app.core.database import AsyncSessionLocal
from app.services.communication import CommunicationService

router = APIRouter()

# Patterns matching messaging intent in natural spoken language
MSG_PATTERNS = [
    re.compile(r"send\s+(?:a\s+)?message\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|that)\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"tell\s+(?P<recipient>[\w\s\.-]+?)\s+(?:that|saying)\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"message\s+(?P<recipient>[\w\s\.-]+?)\s+saying\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"send\s+(?P<recipient>[\w\s\.-]+?)\s+a\s+telegram\s+message\s+saying\s+(?P<text>.+)", re.IGNORECASE),
]


@router.post("/execute")
async def execute_voice_prompt(payload: Dict[str, Any]):
    prompt = payload.get("prompt", "Hello").strip()
    history: List[Dict[str, str]] = payload.get("history", [])

    # 1. Intent Detection: Check if prompt triggers the messaging tool
    matched_recipient = None
    matched_text = None

    for pat in MSG_PATTERNS:
        match = pat.search(prompt)
        if match:
            matched_recipient = match.group("recipient").strip()
            matched_text = match.group("text").strip()
            break

    # 2. If Messaging Tool Intent is detected, execute CommunicationService
    if matched_recipient and matched_text:
        try:
            async with AsyncSessionLocal() as db_session:
                comm = CommunicationService(db_session)
                res = await comm.send_message(
                    sender_id="VoiceAgent",
                    recipient_identifier=matched_recipient,
                    content=matched_text,
                    channel="telegram",
                    sender_name="Voice Agent (Echo)",
                )

                if res.get("success"):
                    recipient_name = res.get("recipient", matched_recipient)
                    reply = f"Message sent to {recipient_name} on Telegram."
                else:
                    err_code = res.get("error_code")
                    if err_code == "TELEGRAM_NOT_CONNECTED":
                        reply = f"{matched_recipient} is not connected to Telegram."
                    elif err_code == "AMBIGUOUS_RECIPIENT":
                        reply = res.get("message", f"Found multiple employees named {matched_recipient}.")
                    elif err_code == "RECIPIENT_NOT_FOUND":
                        reply = f"Could not find employee named {matched_recipient}."
                    else:
                        reply = f"Failed to send message: {res.get('message', 'Telegram API error')}."

                return {"output": reply, "response": reply, "tool_executed": "telegram_messaging", "tool_result": res}
        except Exception as exc:
            reply = f"Failed to execute messaging tool: {exc}"
            return {"output": reply, "response": reply, "tool_executed": "telegram_messaging", "tool_error": str(exc)}

    # 3. Fallback: Normal LLM voice assistant generation
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

