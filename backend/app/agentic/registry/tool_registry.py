"""
Tool Registry - Manages predefined tools available to agents.
"""
from typing import List, Dict, Any, Optional

# In a real implementation, tools might also be in the DB.
# For now, we use an in-memory mock registry of available organizational tools.
AVAILABLE_TOOLS = [
    {
        "tool_id": "github",
        "name": "GitHub Integration",
        "description": "Read/write access to code repositories.",
        "capabilities": ["read_repo", "create_branch", "push_code", "create_pr"],
        "required_permissions": ["github:read", "github:write"],
        "risk_level": "HIGH",
        "enabled": True
    },
    {
        "tool_id": "jira",
        "name": "Jira Integration",
        "description": "Manage project tracking and issues.",
        "capabilities": ["read_issue", "update_issue", "transition_issue"],
        "required_permissions": ["jira:read", "jira:write"],
        "risk_level": "LOW",
        "enabled": True
    },
    {
        "tool_id": "terminal",
        "name": "Secure Terminal",
        "description": "Execute terminal commands in an isolated environment.",
        "capabilities": ["execute_command"],
        "required_permissions": ["system:execute"],
        "risk_level": "CRITICAL",
        "enabled": True
    },
    {
        "tool_id": "telegram_messaging",
        "name": "Telegram Live Communication Tool",
        "description": "Send real-time messages to employees via Telegram & WebSockets.",
        "capabilities": ["send_message", "resolve_recipient"],
        "required_permissions": ["messaging:send"],
        "risk_level": "MEDIUM",
        "enabled": True
    }
]

class ToolRegistry:
    """
    Centralized registry for all available Agent Tools.
    Agents never access tools directly; they must use tools assigned to them
    via this registry, validated by the Policy Engine.
    """
    
    @staticmethod
    def get_all_tools() -> List[Dict[str, Any]]:
        return [t for t in AVAILABLE_TOOLS if t.get("enabled")]

    @staticmethod
    def get_tool(tool_id: str) -> Optional[Dict[str, Any]]:
        for tool in AVAILABLE_TOOLS:
            if tool["tool_id"] == tool_id and tool.get("enabled"):
                return tool
        return None
        
    @staticmethod
    def validate_tool_assignment(tool_id: str, employee_permissions: List[str]) -> bool:
        """Check if a tool's required permissions are met by the employee's permissions."""
        tool = ToolRegistry.get_tool(tool_id)
        if not tool:
            return False
            
        required_perms = tool.get("required_permissions", [])
        # Simple permission check
        for perm in required_perms:
            if perm not in employee_permissions and "admin:all" not in employee_permissions:
                return False
        return True
