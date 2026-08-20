"""
Agent Planner - Determines required capabilities for an employee.
"""
from typing import Dict, Any, List

from app.agentic.planner.criteria_engine import CriteriaEngine


class AgentPlanner:
    """
    Agent Planner determines which capabilities are required for an employee.
    It takes Human Twin, Role Twin, and RAG context and uses the LLM (or SLM)
    to output a list of required capabilities.
    """
    
    def __init__(self, llm_client=None):
        self.llm_client = llm_client
        
    async def plan_agent_group(
        self, 
        employee_id: str,
        role_twin: Dict[str, Any],
        human_twin: Dict[str, Any],
        rag_context: str = ""
    ) -> List[str]:
        """
        Determine the capabilities needed for this employee's Agent Group.
        """
        # 1. Generate Role Criteria
        role_id = role_twin.get("role_id", "unknown")
        criteria = CriteriaEngine.generate_role_criteria(role_id, role_twin, human_twin)
        
        # 2. Extract capabilities
        # In a real system, the LLM takes `criteria` and `rag_context` to output
        # a recommended list of capabilities. Here we use the rule-based output from CriteriaEngine.
        recommended_capabilities = criteria.get("capabilities_required", [])
        
        # Additional logic could be applied here (e.g. SLM vs LLM routing)
        # e.g., if criteria["risk_level"] == "CRITICAL", use LLM for deep reasoning
        
        return recommended_capabilities
