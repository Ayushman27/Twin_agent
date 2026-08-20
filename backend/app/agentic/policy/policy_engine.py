"""
Policy Engine - Evaluates permissions and risk for agent actions.
"""
from typing import Dict, Any, List

from app.agentic.models import RiskLevel
from app.agentic.registry.tool_registry import ToolRegistry


class PolicyEngine:
    """
    Before every tool/action execution, the Policy Engine validates permissions,
    checks risk, and determines if human approval is required.
    """
    
    @staticmethod
    def validate_action(
        agent_id: str,
        tool_id: str,
        action_name: str,
        agent_permissions: List[str]
    ) -> Dict[str, Any]:
        """
        Validate an agent's attempt to use a tool action.
        Returns a dict indicating if it's allowed and if approval is required.
        """
        tool = ToolRegistry.get_tool(tool_id)
        if not tool:
            return {"allowed": False, "reason": "Tool not found or disabled."}
            
        if action_name not in tool.get("capabilities", []):
            return {"allowed": False, "reason": f"Tool {tool_id} does not support action {action_name}."}
            
        # Check permissions
        required_perms = tool.get("required_permissions", [])
        for perm in required_perms:
            if perm not in agent_permissions and "admin:all" not in agent_permissions:
                return {"allowed": False, "reason": f"Missing required permission: {perm}"}
                
        # Risk Evaluation
        risk = tool.get("risk_level", "LOW")
        requires_approval = False
        
        if risk in ["HIGH", "CRITICAL"]:
            # Specific high-risk actions usually need approval
            requires_approval = True
            
        return {
            "allowed": True,
            "requires_approval": requires_approval,
            "risk_level": risk,
            "reason": "Validation passed."
        }
