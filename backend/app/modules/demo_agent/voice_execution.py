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

# Speech recognition noise artifacts to strip from prompt start
LEADING_NOISE_RE = re.compile(
    r"^(?:new|hey|echo|eco|eko|can\s+you|could\s+you|please|so|okay|ok|i\s+want\s+to|i'd\s+like\s+to|kindly)\s+",
    re.IGNORECASE
)

# 1. Full intent patterns (Recipient + Text / Greeting)
MSG_FULL_PATTERNS = [
    # send a hi/hello to [recipient]
    re.compile(r"^send\s+(?:a\s+)?(?P<text>hi|hello|hey|greeting|greetings|update)\s+to\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
    # say hi/hello to [recipient]
    re.compile(r"^say\s+(?P<text>hi|hello|hey)\s+to\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
    # send a message/msg/note/text to [recipient] saying/that/: [text]
    re.compile(r"^send\s+(?:a\s+)?(?:msg|message|note|text)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|that|:)\s+(?P<text>.+)", re.IGNORECASE),
    # send a message/msg/note/text to [recipient] "text"
    re.compile(r"^send\s+(?:a\s+)?(?:msg|message|note|text)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # send a message/msg/note/text to [recipient] to [text]
    re.compile(r"^send\s+(?:a\s+)?(?:msg|message|note|text)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+to\s+(?P<text>.+)", re.IGNORECASE),
    # send [recipient] a message/msg/note/text/hi/hello saying/that/: "text"
    re.compile(r"^send\s+(?P<recipient>[\w\s\.-]+?)\s+(?:a\s+)?(?:msg|message|note|text|hi|hello)\s+(?:saying|that|:|\"|')\s*(?P<text>.+)", re.IGNORECASE),
    # tell [recipient] that/saying/: [text]
    re.compile(r"^tell\s+(?P<recipient>[\w\s\.-]+?)\s+(?:that|saying|:)\s+(?P<text>.+)", re.IGNORECASE),
    # message/text [recipient] saying/that/: "text"
    re.compile(r"^(?:message|text)\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|that|:)\s+(?P<text>.+)", re.IGNORECASE),
    # message/text [recipient] "text"
    re.compile(r"^(?:message|text)\s+(?P<recipient>[\w\s\.-]+?)\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
]

# 2. Generic intent pattern (User wants to message someone, but gave no name yet)
GENERIC_MSG_PATTERNS = [
    re.compile(r"^(?:i\s+want\s+to\s+)?send\s+(?:a\s+)?(?:msg|message|text)$", re.IGNORECASE),
    re.compile(r"^(?:i\s+want\s+to\s+)?message\s+(?:someone|anyone)$", re.IGNORECASE),
]

# 3. Recipient ONLY patterns (when message text is omitted)
RECIPIENT_ONLY_PATTERNS = [
    re.compile(r"^send\s+(?:a\s+)?(?:msg|message|note|text)\s+to\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
    re.compile(r"^send\s+(?P<recipient>[\w\s\.-]+?)\s+(?:a\s+)?(?:msg|message|note|text)$", re.IGNORECASE),
    re.compile(r"^(?:message|text)\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
    re.compile(r"^tell\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
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

TRAILING_WAKE_WORD_RE = re.compile(r"\s+(?:echo|eco|eko|voice\s+agent)$", re.IGNORECASE)

SELF_NAMES = {"echo", "eco", "eko", "voice agent", "assistant", "ai", "twin agent", "echo agent", "twin", "me", "myself", "you"}

def is_wake_word_or_self_reference(name: Optional[str]) -> bool:
    if not name:
        return False
    clean = name.strip().lower()
    return clean in SELF_NAMES

def _clean_prompt(prompt: str) -> str:
    cleaned = (prompt or "").strip()
    while True:
        m = LEADING_NOISE_RE.match(cleaned)
        if not m:
            break
        cleaned = cleaned[m.end():].strip()
    # Strip trailing wake word if user said e.g. "hello Eco"
    cleaned = TRAILING_WAKE_WORD_RE.sub("", cleaned).strip()
    return cleaned

def _clean_extracted_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    for tp in TRAILING_PHRASES:
        cleaned = re.sub(tp, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip("\"' ")
    return cleaned


async def extract_messaging_intent(prompt: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Parses prompt and conversation history to determine if a message should be sent,
    extracting recipient and text across single or multi-turn spoken dialogue.
    """
    clean_p = _clean_prompt(prompt)

    # 1. Multi-turn dialogue state matching
    if history:
        last_assistant_msg = ""
        for item in reversed(history):
            if item.get("role") == "assistant":
                last_assistant_msg = item.get("content", "")
                break

        # State A: Assistant previously asked "Who would you like to message?" or similar
        if any(phrase.lower() in last_assistant_msg.lower() for phrase in [
            "who would you like to message",
            "who would you like me to send",
            "who should i send",
            "ready to dispatch",
            "specify the recipient",
            "who would you like to text",
        ]):
            rec_candidate = _clean_extracted_text(clean_p)
            if rec_candidate and len(rec_candidate.split()) <= 4:
                return {"is_messaging": True, "recipient": rec_candidate, "text": None}

        # State B: Assistant asked "What message would you like me to send to [Name]?" or "Got it, [Name]."
        m_pending = re.search(r"Got\s+it,\s+(?P<rec>[\w\s\.-]+?)\.", last_assistant_msg, re.IGNORECASE)
        if not m_pending:
            m_pending = re.search(r"send\s+to\s+(?P<rec>[\w\s\.-]+?)(?:\?|\.|$)", last_assistant_msg, re.IGNORECASE)

        if m_pending:
            rec_name = m_pending.group("rec").strip()
            msg_text = _clean_extracted_text(clean_p)
            if rec_name and msg_text:
                return {"is_messaging": True, "recipient": rec_name, "text": msg_text}

    # 2. Match Full Recipient + Text / Greeting (e.g., "send a hi to Shreyasi Panigrahi")
    for pat in MSG_FULL_PATTERNS:
        match = pat.search(clean_p)
        if match:
            rec = match.group("recipient").strip()
            raw_text = match.group("text").strip()
            cleaned_txt = _clean_extracted_text(raw_text)
            if rec and cleaned_txt and not is_wake_word_or_self_reference(rec):
                return {"is_messaging": True, "recipient": rec, "text": cleaned_txt}

    # 3. Match Generic "I want to send a message"
    for pat in GENERIC_MSG_PATTERNS:
        if pat.search(clean_p):
            return {"is_messaging": True, "recipient": None, "text": None}

    # 4. Match Recipient ONLY (e.g., "send a message to Shreyasi Panigrahi")
    for pat in RECIPIENT_ONLY_PATTERNS:
        match = pat.search(clean_p)
        if match:
            rec = match.group("recipient").strip()
            if rec and not is_wake_word_or_self_reference(rec):
                return {"is_messaging": True, "recipient": rec, "text": None}

    # 3. Check multi-turn conversation history for pending recipient
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
                if rec_name and rec_name.lower() not in ["her", "him", "them"] and not is_wake_word_or_self_reference(rec_name) and cleaned_txt:
                    return {"is_messaging": True, "recipient": rec_name, "text": cleaned_txt}

    # 4. LLM Extraction using History + Current Prompt
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
            "- If the user is simply greeting the assistant (e.g. 'hello Echo', 'hi Eco', 'hey Echo'), set is_messaging to false.\n"
            "- 'Echo', 'Eco', 'Eko', and 'Voice Agent' are the AI assistant's name and wake words, NOT employee recipients.\n"
            "- Do NOT extract 'Echo', 'Eco', 'Eko', or 'Assistant' as a recipient.\n"
            "- If the user previously asked to send a message to a person (e.g. in history) and is now supplying the message text in the current input, extract the recipient from history and text from current input.\n"
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
                clean_rec = rec.strip() if isinstance(rec, str) and rec.strip() and rec.lower() != "null" else None
                if is_wake_word_or_self_reference(clean_rec):
                    return {"is_messaging": False, "recipient": None, "text": None}
                return {
                    "is_messaging": True,
                    "recipient": clean_rec,
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



