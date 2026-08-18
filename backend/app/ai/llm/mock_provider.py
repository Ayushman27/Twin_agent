"""
Mock LLM Provider — rule-based responses for the Twin Agent demo.
No external API required. Activated when LLM_PROVIDER=mock (default).
"""
import random
from typing import AsyncIterator

from app.ai.llm.interface import AIProvider

TWIN_AGENT_RESPONSES = {
    "hello": [
        "Hello! I'm your Twin Agent — a digital representation of an AI-capable team member. How can I assist you today?",
        "Hi there! I'm the Twin Agent demo. I can explain our platform, simulate task execution, or answer questions about organizational AI. What would you like to explore?",
    ],
    "what": [
        "The Twin Agent Platform creates digital twins of your organization — mapping people, roles, knowledge, and workflows into an intelligent agentic system that can execute tasks autonomously.",
        "A Twin Agent is a digital replica of a human team member or role within your organization. It understands your processes, has access to relevant knowledge, and can execute tasks on your behalf.",
    ],
    "task": [
        "I can simulate task execution. For example, if assigned 'Write weekly status report': I would (1) retrieve project context from the knowledge base, (2) analyze recent commit history and ticket updates, (3) generate the report in your team's format, and (4) submit for your approval before sending.",
        "Task simulation: Received → Planning → Fetching context from RAG → Executing steps → Confidence check → Awaiting human approval if threshold not met. This ensures safety and accuracy at every step.",
    ],
    "agent": [
        "The agent network consists of specialized agents assigned to roles: Developer Twin, QA Twin, Manager Twin, etc. They collaborate through the Agent Orchestrator, which decomposes complex tasks and routes them to the right agent.",
        "Agents in this platform are not general-purpose chatbots. Each agent is deeply contextualized to its role — it knows your codebase, your processes, your team's communication style, and your approval workflows.",
    ],
    "rag": [
        "RAG (Retrieval-Augmented Generation) is how agents access organizational knowledge. Documents, Slack threads, GitHub PRs, Jira tickets — all are indexed and available to agents at query time, ensuring responses are grounded in your actual context.",
    ],
    "default": [
        "That's a great question. The Twin Agent Platform is designed to be the AI operating system for your organization — turning your existing knowledge, roles, and workflows into an autonomous agentic network.",
        "I'm currently running as a demo agent with limited capabilities. The production Twin Agent system would have full access to your organization's knowledge base, tools, and execution environment.",
        "Interesting! Let me process that. In a production deployment, I would query the organization's RAG pipeline and run this through the SLM router before responding with high confidence.",
    ],
}


class MockLLMProvider(AIProvider):
    """
    Rule-based mock provider for demos.
    Returns contextually relevant responses about the Twin Agent platform.
    """

    async def generate(self, system_prompt: str, user_message: str) -> str:
        key = self._classify(user_message)
        responses = TWIN_AGENT_RESPONSES.get(key, TWIN_AGENT_RESPONSES["default"])
        return random.choice(responses)

    async def stream(self, system_prompt: str, user_message: str) -> AsyncIterator[str]:
        full = await self.generate(system_prompt, user_message)
        # Simulate word-by-word streaming
        for word in full.split(" "):
            yield word + " "

    async def health_check(self) -> bool:
        return True

    @staticmethod
    def _classify(message: str) -> str:
        msg = message.lower()
        if any(w in msg for w in ["hello", "hi", "hey", "greet"]):
            return "hello"
        if any(w in msg for w in ["what", "explain", "how", "describe", "tell me"]):
            return "what"
        if any(w in msg for w in ["task", "execute", "run", "do", "assign", "complete"]):
            return "task"
        if any(w in msg for w in ["agent", "network", "orchestrat", "twin"]):
            return "agent"
        if any(w in msg for w in ["rag", "knowledge", "document", "retriev"]):
            return "rag"
        return "default"
