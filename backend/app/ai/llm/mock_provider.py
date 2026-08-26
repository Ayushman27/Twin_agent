"""
Mock LLM Provider — rule-based responses for the Twin Agent demo.
No external API required. Activated when LLM_PROVIDER=mock (default).
"""
import random
from typing import AsyncIterator

from app.ai.llm.interface import AIProvider

TWIN_AGENT_RESPONSES = {
    "schedule": [
        "I've noted the meeting details and can schedule that for you. Would you like me to send invites to the participants?",
        "I can organize that meeting on your calendar. Please let me know if you need specific attendees added.",
    ],
    "hear_me": [
        "Yes, I can hear you loud and clear! How can I assist you with your work or tasks today?",
        "I can hear you perfectly! What would you like to work on?",
    ],
    "hello": [
        "Hello! I'm Echo, your Digital Twin AI assistant. How can I assist you today?",
        "Hi there! I'm ready to help you manage tasks, workflows, and projects. What's on your mind?",
    ],
    "who": [
        "I am Echo, an AI Voice Assistant and Digital Twin for the Twin Agent Platform. I assist team members with tasks, project coordination, and workflow execution.",
    ],
    "what": [
        "The Twin Agent Platform creates digital twins of your organization — mapping people, roles, knowledge, and workflows into an intelligent agentic network that executes tasks autonomously.",
        "A Twin Agent is a digital replica of a team member or role. It understands your processes, accesses knowledge bases, and helps execute tasks collaboratively.",
    ],
    "task": [
        "I can assist with task planning and execution. I retrieve project context from knowledge sources, inspect status, coordinate with agent workforces, and draft updates for your review.",
        "Task workflow: Received → Context Retrieval → Orchestrated Execution → Confidence Check → Human Approval.",
    ],
    "agent": [
        "The agent network consists of specialized autonomous agents assigned to roles: Developer Twin, QA Twin, DevOps Twin, and Tech Lead. They collaborate through the Agent Orchestrator to deliver project work.",
    ],
    "rag": [
        "RAG (Retrieval-Augmented Generation) connects agents to your organizational documents, code repositories, and issue trackers to ensure accurate and grounded task execution.",
    ],
    "status": [
        "All systems, AI workforce agents, and project sync channels are operating normally.",
    ],
    "messaging": [
        "I can send messages to team members via Telegram and the Twin Agent Platform. Who would you like to message?",
        "I'm ready to dispatch that message across your organization's messaging channels.",
    ],
    "default": [
        "I'm here to assist you with your tasks, projects, and organizational workflows. Feel free to ask me any question or assign a task.",
        "Understood! How would you like to proceed with your workflow today?",
    ],
}


class MockLLMProvider(AIProvider):
    """
    Rule-based mock provider for demos and offline fallbacks.
    Returns contextually relevant responses about the Twin Agent platform.
    """

    async def generate(self, system_prompt: str, user_message: str) -> str:
        if "JSON parameter extraction" in system_prompt or "Return ONLY a JSON object" in system_prompt:
            # Fallback JSON response for intent extraction when LLM API key is not configured
            msg_lower = user_message.lower()
            if any(k in msg_lower for k in ["send", "message", "msg", "tell"]):
                # Extract potential name after 'to' or 'tell' or 'message'
                m_name = re.search(r"(?:to|tell|message)\s+([a-zA-Z]+)", user_message, re.IGNORECASE)
                rec = m_name.group(1) if m_name else None
                return json.dumps({"is_messaging": True, "recipient": rec, "text": None})
            return json.dumps({"is_messaging": False, "recipient": None, "text": None})

        key = self._classify(user_message)
        responses = TWIN_AGENT_RESPONSES.get(key, TWIN_AGENT_RESPONSES["default"])
        return random.choice(responses)

    async def stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        full = await self.generate(system_prompt, user_message)
        for word in full.split(" "):
            yield word + " "

    async def health_check(self) -> bool:
        return True

    @staticmethod
    def _classify(message: str) -> str:
        # If message contains conversation history, extract ONLY the last user line
        lines = [l.strip() for l in message.strip().split("\n") if l.strip()]
        last_line = lines[-1] if lines else message
        if "User:" in last_line:
            last_line = last_line.split("User:", 1)[1]
        msg = last_line.lower().strip()

        if any(w in msg for w in ["send", "message", "msg", "telegram", "tell", "notify"]):
            return "messaging"
        if any(w in msg for w in ["schedule", "meeting", "calendar", "invite", "call", "appointment"]):
            return "schedule"
        if any(w in msg for w in ["hear me", "can you hear", "audio test", "mic test", "testing"]):
            return "hear_me"
        if any(w in msg for w in ["who are you", "your name", "who is echo"]):
            return "who"
        if any(w in msg for w in ["status", "system status", "health", "operational"]):
            return "status"
        if any(w in msg for w in ["hello", "hi", "hey", "good morning", "good afternoon", "greetings"]):
            return "hello"
        if any(w in msg for w in ["what", "explain", "how", "describe"]):
            return "what"
        if any(w in msg for w in ["task", "execute", "run", "do", "assign", "complete"]):
            return "task"
        if any(w in msg for w in ["agent", "network", "orchestrat", "twin"]):
            return "agent"
        if any(w in msg for w in ["rag", "knowledge", "document", "retriev"]):
            return "rag"
        return "default"

