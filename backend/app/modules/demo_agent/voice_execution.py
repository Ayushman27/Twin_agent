import json
import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.llm.factory import get_ai_provider
from app.core.database import AsyncSessionLocal
from app.db.models.gmail_connection import GmailConnection
from app.db.session import get_neon_db
from app.modules.auth.models import User
from app.modules.organizations.models import OrganizationMember
from app.services.communication import CommunicationService
from app.services.gmail_service import GmailEmailService

router = APIRouter()

# Speech recognition noise artifacts to strip from prompt start
LEADING_NOISE_RE = re.compile(
    r"^(?:new|hey|echo|eco|eko|can\s+you|could\s+you|please|so|okay|ok|i\s+want\s+to|i'd\s+like\s+to|kindly)\s+",
    re.IGNORECASE
)

from app.services.email_context_service import EmailContextService

REC_WORD = r"(?!an?\b|the\b|to\b)[a-zA-Z0-9_]+"
REC_LAZY = r"(?P<recipient>" + REC_WORD + r"(?:\s+" + REC_WORD + r")*?)"
REC_1_2 = r"(?P<recipient>" + REC_WORD + r"(?:\s+" + REC_WORD + r"){0,2})"
DELIM = r"(?:\s+(?:saying|said\s+that|that|for|about)\s*|\s*[:,-]\s*)"

# ── 1. EMAIL INTENT PATTERNS ──────────────────────────────────────────────────
EMAIL_FULL_PATTERNS = [
    # send [recipient] an email/mail about [subject] saying/said that/that/: [body]
    re.compile(r"^send\s+(?P<recipient>[\w\s\.-]+?)\s+(?:an?\s+)?(?:email|mail)\s+about\s+(?P<subject>[\w\s\.-]+?)\s+(?:saying|said\s+that|that|:)\s+(?P<body>.+)", re.IGNORECASE),
    # send an email/mail to [recipient] about [subject] saying/said that/that/: [body]
    re.compile(r"^send\s+(?:an?\s+)?(?:email|mail)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+about\s+(?P<subject>[\w\s\.-]+?)\s+(?:saying|said\s+that|that|:)\s+(?P<body>.+)", re.IGNORECASE),
    # send an email/a mail to [recipient] saying/said that/that/: [body]
    re.compile(r"^send\s+(?:an?\s+)?(?:email|mail)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|said\s+that|that|for|about|:)\s+(?P<body>.+)", re.IGNORECASE),
    # send [recipient] an email/a mail saying/said that/that/: [body]
    re.compile(r"^send\s+(?P<recipient>[\w\s\.-]+?)\s+(?:an?\s+)?(?:email|mail)\s+(?:saying|said\s+that|that|for|about|:)\s+(?P<body>.+)", re.IGNORECASE),
    # email/mail [recipient] saying/said that/that/: [body]
    re.compile(r"^(?:email|mail)\s+(?P<recipient>[\w\s\.-]+?)\s+(?:saying|said\s+that|that|for|about|:)\s+(?P<body>.+)", re.IGNORECASE),
    # send [recipient] an email/update on/for [project/topic]
    re.compile(r"^(?:send\s+(?:an?\s+)?(?:email|mail)\s+to|email|mail)\s+(?P<recipient>[\w\s\.-]+?)\s+(?:the\s+latest\s+update\s+on\s+|an?\s+(?:email|mail)\s+with\s+the\s+latest\s+update\s+on\s+|an?\s+update\s+on\s+|about\s+|for\s+)(?P<body>.+)", re.IGNORECASE),
    # tell [recipient] through/via/by email/mail that/saying/: [body]
    re.compile(r"^tell\s+(?P<recipient>[\w\s\.-]+?)\s+(?:through|via|by)\s+(?:email|mail)\s+(?:that|said\s+that|saying|:)\s+(?P<body>.+)", re.IGNORECASE),
    # send an email/mail to [recipient] "body"
    re.compile(r"^send\s+(?:an?\s+)?(?:email|mail)\s+to\s+(?P<recipient>[\w\s\.-]+?)\s+[\"'](?P<body>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
]

EMAIL_RECIPIENT_ONLY_PATTERNS = [
    re.compile(r"^send\s+(?:an?\s+)?(?:email|mail)\s+to\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
    re.compile(r"^send\s+(?P<recipient>[\w\s\.-]+?)\s+(?:an?\s+)?(?:email|mail)$", re.IGNORECASE),
    re.compile(r"^(?:email|mail)\s+(?P<recipient>[\w\s\.-]+?)$", re.IGNORECASE),
]

GENERIC_EMAIL_PATTERNS = [
    re.compile(r"^(?:i\s+want\s+to\s+)?send\s+(?:an\s+)?email$", re.IGNORECASE),
    re.compile(r"^(?:i\s+want\s+to\s+)?write\s+(?:an\s+)?email$", re.IGNORECASE),
    re.compile(r"^(?:i\s+want\s+to\s+)?email\s+(?:someone|anyone)$", re.IGNORECASE),
]

# ── 1B. CONFIRMATION, CANCELLATION & EDIT PATTERNS ────────────────────────────
CONFIRMATION_PATTERNS = [
    re.compile(r"^(?:yes|yep|yeah|sure|confirm|go\s+ahead|please\s+send(?:\s+it)?|send(?:\s+it)?|send\s+the\s+email|okay|ok)(?:[,\s]+(?:send(?:\s+it)?|please|go\s+ahead|confirm|do\s+it))*\.?$", re.IGNORECASE),
]

CANCELLATION_PATTERNS = [
    re.compile(r"^(?:no|nope|cancel|stop|discard|never\s+mind|don't\s+send(?:\s+it)?|dont\s+send(?:\s+it)?|do\s+not\s+send(?:\s+it)?)(?:[,\s]+(?:cancel(?:\s+it)?|don't\s+send(?:\s+it)?|dont\s+send(?:\s+it)?|stop|discard|never\s+mind|no))*\.?$", re.IGNORECASE),
]

EDIT_SUBJECT_PATTERNS = [
    re.compile(r"^(?:change|update|edit|set)\s+(?:the\s+)?subject\s+(?:to|as)\s+(?P<subject>.+)", re.IGNORECASE),
]

EDIT_BODY_PATTERNS = [
    re.compile(r"^(?:change|update|edit|set)\s+(?:the\s+)?(?:message|body|content|text)\s+(?:to|as)\s+(?P<body>.+)", re.IGNORECASE),
]

# ── 2. MESSAGING (TELEGRAM/PLATFORM) PATTERNS ────────────────────────────────
MSG_FULL_PATTERNS = [
    # send/write/drop/shoot (a) message/note/text to [recipient] DELIM [text]
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_LAZY + DELIM + r"\s*(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot (a) message/note/text to [recipient] "text"
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_LAZY + r"\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # send/write/drop/shoot [recipient] (a) message/note/text DELIM [text]
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_LAZY + r"\s+(?:an?\s+)?(?:msg|message|note|text)" + DELIM + r"\s*(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot [recipient] (a) message/note/text "text"
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_LAZY + r"\s+(?:an?\s+)?(?:msg|message|note|text)\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # message/text/msg/ping/notify (to) [recipient] DELIM [text]
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_LAZY + DELIM + r"\s*(?P<text>.+)$", re.IGNORECASE),
    # message/text/msg/ping/notify (to) [recipient] "text"
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_LAZY + r"\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # tell [recipient] DELIM or 'to' [text] (excluding email phrases)
    re.compile(r"^tell\s+" + REC_LAZY + r"(?:\s+(?:saying|said\s+that|that|for|about|to)\s*|\s*[:,-]\s*)\s*(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot (a) message/note/text to [recipient] [text] (no delimiter)
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_1_2 + r"\s+(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot [recipient] (a) message/note/text [text] (no delimiter)
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_1_2 + r"\s+(?:an?\s+)?(?:msg|message|note|text)\s+(?P<text>.+)$", re.IGNORECASE),
    # message/text/msg/ping/notify [recipient] [text] (no delimiter)
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_1_2 + r"\s+(?P<text>.+)$", re.IGNORECASE),
    # tell [recipient] [text] (no delimiter)
    re.compile(r"^tell\s+" + REC_1_2 + r"\s+(?P<text>.+)$", re.IGNORECASE),
    # say/send a hi/hello to [recipient]
    re.compile(r"^(?:send|say)\s+(?:a\s+)?(?P<text>hi|hello|hey|greetings?|update)\s+to\s+" + REC_LAZY + r"$", re.IGNORECASE),
    # send [recipient] a hi/hello
    re.compile(r"^send\s+" + REC_1_2 + r"\s+(?:a\s+)?(?P<text>hi|hello|hey|greetings?)$", re.IGNORECASE),
]

GENERIC_MSG_PATTERNS = [
    re.compile(r"^(?:i\s+want\s+to\s+)?send\s+(?:a\s+)?(?:msg|message|text)$", re.IGNORECASE),
    re.compile(r"^(?:i\s+want\s+to\s+)?message\s+(?:someone|anyone)$", re.IGNORECASE),
]

RECIPIENT_ONLY_PATTERNS = [
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_1_2 + r"$", re.IGNORECASE),
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_1_2 + r"\s+(?:an?\s+)?(?:msg|message|note|text)$", re.IGNORECASE),
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_1_2 + r"$", re.IGNORECASE),
    re.compile(r"^tell\s+" + REC_1_2 + r"$", re.IGNORECASE),
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

def _clean_prompt(prompt: str) -> str:
    cleaned = (prompt or "").strip()
    while True:
        m = LEADING_NOISE_RE.match(cleaned)
        if not m:
            break
        cleaned = cleaned[m.end():].strip()
    return cleaned

def _clean_extracted_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    for tp in TRAILING_PHRASES:
        cleaned = re.sub(tp, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip("\"' ")
    cleaned = re.sub(
        r"^(?:tell\s+(?:him|her|them|everyone)\s+that\s+|tell\s+(?:him|her|them)\s+|saying\s+that\s+|saying\s+|that\s+|to\s+|:\s*|-\s*|,\s*)",
        "",
        cleaned,
        flags=re.IGNORECASE
    ).strip()
    cleaned = cleaned.strip("\"' ")
    return cleaned

def _infer_email_subject(body: str, provided_subject: Optional[str] = None) -> str:
    """Infers a concise, professional subject if none was explicitly stated."""
    if provided_subject and provided_subject.strip():
        return provided_subject.strip()

    body_clean = body.strip().lower()
    if any(k in body_clean for k in ["meeting", "3 pm", "2 pm", "4 pm", "10 am", "call", "sync", "standup"]):
        return "Meeting Update"
    if any(k in body_clean for k in ["deployment", "deployed", "release", "prod", "staging"]):
        return "Deployment Status Update"
    if any(k in body_clean for k in ["late", "delayed", "running late"]):
        return "Schedule Notice"
    if any(k in body_clean for k in ["report", "metrics", "analytics", "numbers"]):
        return "Project Report"
    if any(k in body_clean for k in ["api", "endpoint", "backend", "swagger"]):
        return "API Update"

    # Default to first 5 words capitalized
    words = body_clean.split()
    preview = " ".join(words[:5])
    if len(words) > 5:
        preview += "..."
    return f"Update: {preview}"


async def extract_voice_intent(prompt: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Extracts structured intent (SEND_EMAIL vs CONFIRM_EMAIL vs CANCEL_EMAIL vs EDIT_EMAIL vs SEND_MESSAGE vs CHAT)
    from spoken input, with multi-turn slot filling and confirmation handling.
    """
    clean_p = _clean_prompt(prompt)

    # ── 1. Check Multi-turn Conversation History ─────────────────────────────
    if history:
        last_assistant_msg = ""
        for item in reversed(history):
            if item.get("role") == "assistant":
                last_assistant_msg = item.get("content", "")
                break

        # State 0: Previous turn asked for confirmation ("Would you like me to send it?" / "Should I send it?")
        if any(phrase in last_assistant_msg.lower() for phrase in [
            "would you like me to send it",
            "should i send it",
            "send it?",
        ]):
            for pat in CONFIRMATION_PATTERNS:
                if pat.search(clean_p):
                    return {"intent": "CONFIRM_EMAIL"}

            for pat in CANCELLATION_PATTERNS:
                if pat.search(clean_p):
                    return {"intent": "CANCEL_EMAIL"}

            for pat in EDIT_SUBJECT_PATTERNS:
                m_s = pat.search(clean_p)
                if m_s:
                    return {"intent": "EDIT_EMAIL", "new_subject": m_s.group("subject").strip(), "new_body": None}

            for pat in EDIT_BODY_PATTERNS:
                m_b = pat.search(clean_p)
                if m_b:
                    return {"intent": "EDIT_EMAIL", "new_subject": None, "new_body": m_b.group("body").strip()}

        # State 1A: Previous turn asked "Who should I send the email to?" or similar
        if any(phrase in last_assistant_msg.lower() for phrase in [
            "who should i send the email to",
            "who would you like me to email",
            "who would you like to email",
        ]):
            rec_candidate = _clean_extracted_text(clean_p)
            if rec_candidate and len(rec_candidate.split()) <= 4:
                return {"intent": "SEND_EMAIL", "recipient": rec_candidate, "subject": None, "body": None}

        # State 1B: Previous turn asked for email body: "What would you like me to say in the email?"
        m_email_pending = re.search(r"Got\s+it,\s+(?P<rec>[\w\s\.-]+?)\.\s+What\s+would\s+you\s+like\s+me\s+to\s+say\s+in\s+the\s+email", last_assistant_msg, re.IGNORECASE)
        if not m_email_pending and "say in the email" in last_assistant_msg.lower():
            m_email_pending = re.search(r"email\s+to\s+(?P<rec>[\w\s\.-]+?)(?:\?|\.|$)", last_assistant_msg, re.IGNORECASE)

        if m_email_pending and "message" not in last_assistant_msg.lower():
            rec_name = m_email_pending.group("rec").strip()
            body_text = _clean_extracted_text(clean_p)
            if rec_name and body_text:
                return {
                    "intent": "SEND_EMAIL",
                    "recipient": rec_name,
                    "subject": _infer_email_subject(body_text),
                    "body": body_text,
                }

        # State 1C: Previous turn asked for Telegram message recipient/text
        if any(phrase in last_assistant_msg.lower() for phrase in [
            "who would you like to message",
            "who would you like me to send this message to",
            "who should i send",
        ]):
            rec_candidate = _clean_extracted_text(clean_p)
            if rec_candidate and len(rec_candidate.split()) <= 4:
                return {"intent": "SEND_MESSAGE", "recipient": rec_candidate, "text": None}

        m_msg_pending = re.search(r"Got\s+it,\s+(?P<rec>[\w\s\.-]+?)\.\s+What\s+message\s+would\s+you\s+like", last_assistant_msg, re.IGNORECASE)
        if m_msg_pending:
            rec_name = m_msg_pending.group("rec").strip()
            msg_text = _clean_extracted_text(clean_p)
            if rec_name and msg_text:
                return {"intent": "SEND_MESSAGE", "recipient": rec_name, "text": msg_text}

    # ── 2. Direct Confirmation / Cancellation / Edit Patterns ─────────────────
    for pat in EDIT_SUBJECT_PATTERNS:
        m_s = pat.search(clean_p)
        if m_s:
            return {"intent": "EDIT_EMAIL", "new_subject": m_s.group("subject").strip(), "new_body": None}

    for pat in EDIT_BODY_PATTERNS:
        m_b = pat.search(clean_p)
        if m_b:
            return {"intent": "EDIT_EMAIL", "new_subject": None, "new_body": m_b.group("body").strip()}

    for pat in CONFIRMATION_PATTERNS:
        if pat.search(clean_p):
            return {"intent": "CONFIRM_EMAIL"}

    for pat in CANCELLATION_PATTERNS:
        if pat.search(clean_p):
            return {"intent": "CANCEL_EMAIL"}

    # Determine keyword priority
    has_email_keyword = bool(re.search(r"\b(?:email|emails|mail|mails|gmail)\b", clean_p, re.IGNORECASE))
    has_msg_keyword = bool(re.search(r"\b(?:msg|message|messages|note|text|texts|ping|notify|chat|telegram|say\s+hi|say\s+hello)\b", clean_p, re.IGNORECASE))
    if not has_email_keyword and re.search(r"\btell\b", clean_p, re.IGNORECASE):
        has_msg_keyword = True

    # Helper for checking messaging patterns
    def _check_messaging():
        for pat in MSG_FULL_PATTERNS:
            match = pat.search(clean_p)
            if match:
                rec = match.group("recipient").strip()
                raw_text = match.group("text").strip()
                cleaned_txt = _clean_extracted_text(raw_text)
                if rec and cleaned_txt:
                    return {"intent": "SEND_MESSAGE", "recipient": rec, "text": cleaned_txt}

        for pat in GENERIC_MSG_PATTERNS:
            if pat.search(clean_p):
                return {"intent": "SEND_MESSAGE", "recipient": None, "text": None}

        for pat in RECIPIENT_ONLY_PATTERNS:
            match = pat.search(clean_p)
            if match:
                rec = match.group("recipient").strip()
                if rec:
                    return {"intent": "SEND_MESSAGE", "recipient": rec, "text": None}
        return None

    # Helper for checking email patterns
    def _check_email():
        for pat in EMAIL_FULL_PATTERNS:
            match = pat.search(clean_p)
            if match:
                groups = match.groupdict()
                rec = groups.get("recipient", "").strip()
                body = _clean_extracted_text(groups.get("body", ""))
                subject = groups.get("subject", None)
                if rec and body:
                    return {
                        "intent": "SEND_EMAIL",
                        "recipient": rec,
                        "subject": _infer_email_subject(body, subject),
                        "body": body,
                    }

        for pat in GENERIC_EMAIL_PATTERNS:
            if pat.search(clean_p):
                return {"intent": "SEND_EMAIL", "recipient": None, "subject": None, "body": None}

        for pat in EMAIL_RECIPIENT_ONLY_PATTERNS:
            match = pat.search(clean_p)
            if match:
                rec = match.group("recipient").strip()
                if rec:
                    return {"intent": "SEND_EMAIL", "recipient": rec, "subject": None, "body": None}
        return None

    if has_email_keyword and not has_msg_keyword:
        em_res = _check_email()
        if em_res:
            return em_res
        msg_res = _check_messaging()
        if msg_res:
            return msg_res
    else:
        msg_res = _check_messaging()
        if msg_res:
            return msg_res
        em_res = _check_email()
        if em_res:
            return em_res

    # ── 4. Fallback LLM Semantic Extraction ───────────────────────────────────
    try:
        llm = get_ai_provider()
        history_str = ""
        if history:
            history_str = "Conversation history so far:\n" + "\n".join(
                f"{'User' if m.get('role') == 'user' else 'Echo'}: {m.get('content')}"
                for m in history[-6:]
            ) + "\n\n"

        extraction_system_prompt = (
            "You are a strict parameter extraction model for a workspace digital twin voice assistant.\n"
            "Analyze the conversation history and user prompt to detect SEND_EMAIL or SEND_MESSAGE commands.\n\n"
            "Output JSON with format:\n"
            "{\n"
            '  "intent": "SEND_EMAIL" | "SEND_MESSAGE" | "CHAT",\n'
            '  "recipient": "full name/handle or null",\n'
            '  "subject": "email subject or null",\n'
            '  "body": "email/message content or null"\n'
            "}\n"
            "Rules:\n"
            "- If user says 'email', 'mail', or 'send an email', intent MUST be SEND_EMAIL.\n"
            "- If user says 'message', 'text', or 'send a message', intent MUST be SEND_MESSAGE.\n"
            "- Output valid JSON only."
        )

        user_msg = f"{history_str}Current user input: {prompt}"
        raw_json = await llm.generate(system_prompt=extraction_system_prompt, user_message=user_msg)
        json_match = re.search(r"\{.*\}", raw_json, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            intent_val = parsed.get("intent")
            if intent_val in ["SEND_EMAIL", "SEND_MESSAGE"]:
                rec = parsed.get("recipient")
                body = parsed.get("body")
                subj = parsed.get("subject")
                return {
                    "intent": intent_val,
                    "recipient": rec.strip() if isinstance(rec, str) and rec.strip() and rec.lower() != "null" else None,
                    "subject": subj.strip() if isinstance(subj, str) and subj.strip() and subj.lower() != "null" else None,
                    "body": _clean_extracted_text(body) if isinstance(body, str) and body.strip() and body.lower() != "null" else None,
                    "text": _clean_extracted_text(body) if isinstance(body, str) and body.strip() and body.lower() != "null" else None,
                }
    except Exception:
        pass

    return {"intent": "CHAT", "recipient": None, "subject": None, "body": None}


from app.db.session import get_neon_db
from fastapi import APIRouter, Depends

@router.post("/execute")
@router.post("/voice/execute")
async def execute_voice_prompt(
    payload: Dict[str, Any],
    db_session: AsyncSession = Depends(get_neon_db),
):
    prompt = payload.get("prompt", "Hello").strip()
    history: List[Dict[str, str]] = payload.get("history", [])
    user_id = payload.get("user_id")
    user_name = payload.get("user_name")
    org_id = payload.get("organization_id")

    # 1. Resolve active user and organization context if not provided
    if not user_id or not org_id:
        r_u = await db_session.execute(select(User).where(User.is_active == True).limit(1))
        u = r_u.scalar_one_or_none()
        if u:
            user_id = user_id or u.id
            user_name = user_name or u.name

        if user_id and not org_id:
            r_mem = await db_session.execute(select(OrganizationMember).where(OrganizationMember.user_id == user_id).limit(1))
            mem = r_mem.scalar_one_or_none()
            if mem:
                org_id = mem.organization_id

    user_id = user_id or "VoiceAgent_User"
    user_name = user_name or "Voice Agent (Echo)"
    org_id = org_id or "default_org"

    # 2. Extract Intent
    intent_data = await extract_voice_intent(prompt, history)
    intent = intent_data.get("intent")

    # ── HANDLE SEND_EMAIL INTENT ──────────────────────────────────────────
    if intent == "SEND_EMAIL":
        recipient = intent_data.get("recipient")
        body = intent_data.get("body")
        subject = intent_data.get("subject") or _infer_email_subject(body or "")
        meta_data: Dict[str, Any] = {}

        # 1. Missing recipient
        if not recipient:
            reply = "Who should I send the email to?"
            return {"output": reply, "response": reply, "intent": "SEND_EMAIL", "slot_needed": "recipient"}

        # 2. Check Context-Aware Project & Task Resolution
        try:
            context_service = EmailContextService(db_session)
            ctx_res = await context_service.compose_context_aware_email(org_id, prompt, recipient)
            if ctx_res.get("verified") is True:
                subject = ctx_res.get("subject", subject)
                body = ctx_res.get("body", body)
                meta_data = ctx_res.get("meta_data", {})
            elif ctx_res.get("error_code") in ["PROJECT_NOT_FOUND", "TASK_NOT_FOUND", "NO_PROJECTS_FOUND"]:
                reply = ctx_res.get("user_message")
                return {
                    "output": reply,
                    "response": reply,
                    "intent": "SEND_EMAIL",
                    "status": "clarification_needed",
                    "error_code": ctx_res.get("error_code"),
                }
        except Exception as exc:
            # Fallback gracefully if context lookup encounters issues
            pass

        # 3. Missing body
        if not body:
            reply = f"Got it, {recipient}. What would you like me to say in the email?"
            return {"output": reply, "response": reply, "intent": "SEND_EMAIL", "recipient": recipient, "slot_needed": "body"}

        # Both recipient and body present -> Stage Draft & Request Human Confirmation
        try:
            email_service = GmailEmailService(db_session)
            res = await email_service.create_email_draft(
                user_id=user_id,
                organization_id=org_id,
                recipient=recipient,
                subject=subject,
                body=body,
                agent_id="VoiceAgent_Echo",
                meta_data=meta_data,
            )

            if res.get("status") == "draft_created":
                reply = res.get("confirmation_prompt")
                return {
                    "output": reply,
                    "response": reply,
                    "intent": "EMAIL_AWAITING_CONFIRMATION",
                    "status": "draft_created",
                    "tool_executed": "create_email_draft",
                    "draft_id": res.get("draft_id"),
                    "recipient": res.get("recipient"),
                    "subject": res.get("subject"),
                    "body": res.get("body"),
                    "meta_data": meta_data,
                    "tool_result": res,
                }
            else:
                err_code = res.get("error_code")
                reply = res.get("user_message", "Could not prepare the email draft.")
                return {
                    "output": reply,
                    "response": reply,
                    "tool_executed": "create_email_draft",
                    "error_code": err_code,
                    "status": "failed",
                    "tool_result": res,
                }

        except Exception as exc:
            reply = f"Failed to prepare email draft: {exc}"
            return {"output": reply, "response": reply, "tool_executed": "create_email_draft", "tool_error": str(exc)}

    # ── HANDLE CONFIRM_EMAIL INTENT ───────────────────────────────────────
    elif intent == "CONFIRM_EMAIL":
        try:
            email_service = GmailEmailService(db_session)
            res = await email_service.confirm_and_send_email(
                user_id=user_id,
                organization_id=org_id,
            )
            reply = res.get("user_message", "Email sent.")
            return {
                "output": reply,
                "response": reply,
                "tool_executed": "send_email",
                "tool_result": res,
                "status": res.get("status"),
                "error_code": res.get("error_code"),
            }
        except Exception as exc:
            reply = f"Failed to send confirmed email: {exc}"
            return {"output": reply, "response": reply, "tool_executed": "send_email", "tool_error": str(exc)}

    # ── HANDLE CANCEL_EMAIL INTENT ────────────────────────────────────────
    elif intent == "CANCEL_EMAIL":
        try:
            email_service = GmailEmailService(db_session)
            res = await email_service.cancel_email_draft(
                user_id=user_id,
                organization_id=org_id,
            )
            reply = res.get("user_message", "Cancelled. I won't send the email.")
            return {
                "output": reply,
                "response": reply,
                "tool_executed": "cancel_email",
                "tool_result": res,
                "status": res.get("status"),
            }
        except Exception as exc:
            reply = f"Failed to cancel email draft: {exc}"
            return {"output": reply, "response": reply, "tool_executed": "cancel_email", "tool_error": str(exc)}

    # ── HANDLE EDIT_EMAIL INTENT ──────────────────────────────────────────
    elif intent == "EDIT_EMAIL":
        try:
            email_service = GmailEmailService(db_session)
            new_subj = intent_data.get("new_subject")
            new_b = intent_data.get("new_body")
            res = await email_service.edit_email_draft(
                user_id=user_id,
                organization_id=org_id,
                new_subject=new_subj,
                new_body=new_b,
            )
            reply = res.get("confirmation_prompt", res.get("user_message"))
            return {
                "output": reply,
                "response": reply,
                "tool_executed": "edit_email_draft",
                "tool_result": res,
                "status": res.get("status"),
            }
        except Exception as exc:
            reply = f"Failed to edit email draft: {exc}"
            return {"output": reply, "response": reply, "tool_executed": "edit_email_draft", "tool_error": str(exc)}

    # ── HANDLE SEND_MESSAGE INTENT ────────────────────────────────────────
    elif intent == "SEND_MESSAGE":
        matched_recipient = intent_data.get("recipient")
        matched_text = intent_data.get("text") or intent_data.get("body")

        if matched_recipient and not matched_text:
            reply = f"Got it, {matched_recipient}. What message would you like me to send to them?"
            return {"output": reply, "response": reply}

        if matched_text and not matched_recipient:
            reply = "Who would you like me to send this message to?"
            return {"output": reply, "response": reply}

        if matched_recipient and matched_text:
            try:
                comm = CommunicationService(db_session)
                res = await comm.send_message(
                    sender_id=user_id,
                    recipient_identifier=matched_recipient,
                    content=matched_text,
                    channel="telegram",
                    sender_name=user_name,
                )

                if res.get("success"):
                    resolved_name = res.get("recipient", matched_recipient)
                    if res.get("telegram_sent"):
                        reply = f"I've sent the message to {resolved_name} via Telegram."
                    else:
                        reply = f"I've sent the message to {resolved_name} via the platform chat."
                else:
                    err_msg = res.get("message") or res.get("error") or res.get("user_message") or "could not find the recipient"
                    if res.get("error_code") == "AMBIGUOUS_RECIPIENT":
                        reply = err_msg
                    else:
                        reply = f"Could not send message: {err_msg}."

                return {
                    "output": reply,
                    "response": reply,
                    "tool_executed": "send_message",
                    "tool_result": res,
                }
            except Exception as exc:
                reply = f"Failed to execute messaging tool: {exc}"
                return {"output": reply, "response": reply, "tool_executed": "send_message", "tool_error": str(exc)}

    # ── 3. FALLBACK: GENERAL VOICE ASSISTANT GENERATION ───────────────────────
    llm = get_ai_provider()

    system_prompt = (
        "You are Echo, an AI Voice Assistant and Digital Twin Executive Assistant for the Twin Agent Platform. "
        "You help users manage emails, tasks, schedules, and workflows. "
        "Respond concisely and helpfully in 1-2 sentences. "
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
