import json
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter
from app.ai.llm.factory import get_ai_provider
from app.core.database import AsyncSessionLocal
from app.services.communication import CommunicationService
from sqlalchemy import select
from app.modules.auth.models import User

router = APIRouter()

# Patterns matching messaging intent in natural spoken language
MSG_PATTERNS = [
    re.compile(r"send\s+(?:a\s+)?(?:msg|message)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    re.compile(r"send\s+(?:a\s+)?(?:msg|message)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|that|:)\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"send\s+(?:a\s+)?(?:msg|message)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"tell\s+(?P<recipient>[\w\s\.-]+?)\s+(?:that|saying|:)\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"message\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|that|:)\s+(?P<text>.+)", re.IGNORECASE),
    re.compile(r"message\s+(?P<recipient>[\w\s\.-]+?)\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
]

TRAILING_PHRASES = [
    r"\s+using\s+(?:the\s+)?twin\s+agent\s+platform.*$",
    r"\s+using\s+(?:the\s+)?twin\s+agent.*$",
    r"\s+on\s+(?:the\s+)?twin\s+agent\s+platform.*$",
    r"\s+on\s+(?:the\s+)?twin\s+agent.*$",
    r"\s+via\s+telegram.*$",
    r"\s+on\s+telegram.*$",
    r"\s+through\s+(?:the\s+)?twin\s+agent\s+platform.*$",
    r"\s+through\s+(?:the\s+)?twin\s+agent.*$",
]


LEADING_NOISE = [
    r"^(?:sender|send\s+(?:her|him|them))\s+(?:just\s+)?",
    r"^(?:just|saying|that)\s+",
]


def _clean_extracted_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    for tp in TRAILING_PHRASES:
        cleaned = re.sub(tp, "", cleaned, flags=re.IGNORECASE)
    for ln in LEADING_NOISE:
        cleaned = re.sub(ln, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip("\"' ")
    return cleaned


async def extract_messaging_intent(prompt: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Parses prompt and conversation history to determine if a message should be sent,
    extracting recipient and text across single or multi-turn spoken dialogue.
    """
    # 1. Direct Regex check on current prompt
    for pat in MSG_PATTERNS:
        match = pat.search(prompt)
        if match:
            rec = match.group("recipient").strip()
            raw_text = match.group("text").strip()
            cleaned_txt = _clean_extracted_text(raw_text)
            if rec and cleaned_txt:
                return {"is_messaging": True, "recipient": rec, "text": cleaned_txt}

    # 2. Check multi-turn conversation history for pending recipient
    if history:
        for item in reversed(history):
            content = item.get("content", "")
            m_rec = re.search(r"Got\s+it,\s+(?P<rec>[\w\s\.-]+?)\.", content, re.IGNORECASE)
            if not m_rec:
                m_rec = re.search(r"message\s+for\s+(?P<rec>[\w\s\.-]+?)(?:\?|\.|$)", content, re.IGNORECASE)
            if not m_rec:
                m_rec = re.search(r"send\s+to\s+(?P<rec>[\w\s\.-]+?)(?:\?|\.|$)", content, re.IGNORECASE)

            if m_rec:
                rec_name = m_rec.group("rec").strip()
                if rec_name.lower() in ["her", "him", "them", "it"]:
                    for prev_item in reversed(history):
                        m_prev = re.search(r"(?:to|tell|message)\s+(?P<rec>[\w\s\.-]+?)(?:\s+(?:saying|that|:|\"|')|$)", prev_item.get("content", ""), re.IGNORECASE)
                        if m_prev:
                            candidate = m_prev.group("rec").strip()
                            if candidate.lower() not in ["her", "him", "them", "a message", "a msg", "message", "msg"]:
                                rec_name = candidate
                                break
                cleaned_txt = _clean_extracted_text(prompt)
                if rec_name and rec_name.lower() not in ["her", "him", "them"] and cleaned_txt:
                    return {"is_messaging": True, "recipient": rec_name, "text": cleaned_txt}

    # 3. LLM Extraction using History + Current Prompt
    try:
        llm = get_ai_provider()
        history_str = ""
        if history:
            history_str = "Conversation history so far:\n" + "\n".join(
                f"{'User' if m.get('role') == 'user' else 'Echo'}: {m.get('content')}"
                for m in history[-6:]
            ) + "\n\n"

        extraction_system_prompt = (
            "You are a strict JSON parameter extraction model for an employee workspace assistant.\n"
            "Analyze the conversation history and current user utterance to detect messaging commands.\n\n"
            "Return ONLY a JSON object with keys:\n"
            "{\n"
            '  "is_messaging": true | false,\n'
            '  "recipient": "full name or handle of recipient employee or null",\n'
            '  "text": "exact message body to send or null"\n'
            "}\n"
            "Rules:\n"
            "- If the user previously asked to send a message to a person (e.g. in history) and is now supplying the message text in the current input, extract the recipient from history and text from current input.\n"
            "- Do NOT invent message text if none was provided by the user.\n"
            "- Output valid JSON only."
        )

        user_msg = f"{history_str}Current user input: {prompt}"
        raw_json = await llm.generate(system_prompt=extraction_system_prompt, user_message=user_msg)
        json_match = re.search(r"\{.*\}", raw_json, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            if parsed.get("is_messaging"):
                rec = parsed.get("recipient")
                txt = parsed.get("text")
                return {
                    "is_messaging": True,
                    "recipient": rec.strip() if isinstance(rec, str) and rec.strip() and rec.lower() != "null" else None,
                    "text": _clean_extracted_text(txt) if isinstance(txt, str) and txt.strip() and txt.lower() != "null" else None,
                }
    except Exception:
        pass

    return {"is_messaging": False, "recipient": None, "text": None}


@router.post("/execute")
async def execute_voice_prompt(payload: Dict[str, Any]):
    prompt = payload.get("prompt", "Hello").strip()
    history: List[Dict[str, str]] = payload.get("history", [])
    user_id = payload.get("user_id")
    user_name = payload.get("user_name")

    # 1. Extract messaging intent considering both current prompt and prior dialogue history
    intent = await extract_messaging_intent(prompt, history)

    if intent.get("is_messaging"):
        matched_recipient = intent.get("recipient")
        matched_text = intent.get("text")

        # Case A: Recipient identified, but message text is missing
        if matched_recipient and not matched_text:
            reply = f"Got it, {matched_recipient}. What message would you like me to send to them?"
            return {"output": reply, "response": reply}

        # Case B: Message text present, but recipient missing
        if matched_text and not matched_recipient:
            reply = "Who would you like me to send this message to?"
            return {"output": reply, "response": reply}

        # Case C: Both recipient and text are present -> Execute CommunicationService
        if matched_recipient and matched_text:
            try:
                async with AsyncSessionLocal() as db_session:
                    sender_id = user_id
                    sender_name = user_name

                    if not sender_id:
                        from app.db.postgres import get_neon_session_maker
                        neon_maker = get_neon_session_maker()
                        id_fac = neon_maker if neon_maker is not None else lambda: db_session
                        async with id_fac() as id_session:
                            r_u = await id_session.execute(select(User).where(User.is_active == True).limit(1))
                            u = r_u.scalar_one_or_none()
                            if u:
                                sender_id = u.id
                                sender_name = u.name

                    sender_id = sender_id or "VoiceAgent"
                    sender_name = sender_name or "Voice Agent (Echo)"

                    comm = CommunicationService(db_session)
                    res = await comm.send_message(
                        sender_id=sender_id,
                        recipient_identifier=matched_recipient,
                        content=matched_text,
                        channel="telegram",
                        sender_name=sender_name,
                    )

                    if res.get("success"):
                        recipient_name = res.get("recipient", matched_recipient)
                        if res.get("telegram_sent"):
                            reply = f"I've sent the message \"{matched_text}\" to {recipient_name} via Telegram and Twin Agent Platform."
                        else:
                            reply = f"I've sent the message \"{matched_text}\" to {recipient_name} on the Twin Agent Platform."
                    else:
                        err_code = res.get("error_code")
                        if err_code == "AMBIGUOUS_RECIPIENT":
                            reply = res.get("message", f"Found multiple employees named {matched_recipient}.")
                        elif err_code == "RECIPIENT_NOT_FOUND":
                            reply = f"Could not find employee named {matched_recipient}."
                        else:
                            reply = f"Failed to send message: {res.get('message', 'Platform messaging error')}."

                    return {"output": reply, "response": reply, "tool_executed": "telegram_messaging", "tool_result": res}
            except Exception as exc:
                reply = f"Failed to execute messaging tool: {exc}"
                return {"output": reply, "response": reply, "tool_executed": "telegram_messaging", "tool_error": str(exc)}

    # 2. Fallback: Normal LLM voice assistant generation with strict tool claims prohibition
    llm = get_ai_provider()

    system_prompt = (
        "You are Echo, an AI Voice Assistant and Digital Twin Executive Assistant for the Twin Agent Platform. "
        "You help users manage tasks, schedules, approvals, and workflows. "
        "Respond concisely and helpfully in 1-3 sentences. "
        "CRITICAL SAFETY RULE: You must NEVER claim or state that you sent, dispatched, or delivered a message or email unless a tool execution result confirmed it."
    )

    if history:
        history_text = "\n".join(
            f"{'User' if m.get('role') == 'user' else 'Echo'}: {m.get('content')}"
            for m in history[-10:]
        )
        full_prompt = f"Conversation so far:\n{history_text}\n\nUser: {prompt}"
    else:
        full_prompt = prompt

    reply = await llm.generate(system_prompt=system_prompt, user_message=full_prompt)
    return {"output": reply, "response": reply}



