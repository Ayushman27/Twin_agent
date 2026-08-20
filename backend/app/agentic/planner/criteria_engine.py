"""
Role Criteria Engine.
Converts a Role Twin and Human Twin into structured RoleCriteria.
"""
from typing import Dict, Any, List

from app.agentic.models import RiskLevel


class CriteriaEngine:
    """
    Engine for converting raw Role Twin / Human Twin data into structured RoleCriteria.
    """
    
    @staticmethod
    def generate_role_criteria(
        role_id: str, 
        role_twin: Dict[str, Any], 
        human_twin: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merge and extract criteria from role definition and human preferences.
        In a real implementation, an LLM might assist in this extraction.
        """
        responsibilities = role_twin.get("responsibilities", [])
        role_skills = role_twin.get("skills", [])
        human_skills = human_twin.get("skills", {}).get("technical_skills", [])
        
        # Merge skills
        combined_skills = list(set(role_skills + human_skills))
        
        tools = role_twin.get("tools", [])
        
        # Simple rule-based required capability logic (would be dynamic/LLM-based in prod)
        capabilities_required = []
        if "Python" in combined_skills or "implement_features" in responsibilities:
            capabilities_required.append("coding")
            capabilities_required.append("debugging")
        if "testing" in responsibilities or "write_tests" in responsibilities:
            capabilities_required.append("testing")
        if "GitHub" in tools:
            capabilities_required.append("github")
            capabilities_required.append("code_review")
            
        risk_level = RiskLevel.MEDIUM
        if "production_deployment" in responsibilities:
            risk_level = RiskLevel.CRITICAL
            
        return {
            "role_id": role_id,
            "responsibilities": responsibilities,
            "skills": combined_skills,
            "tools": tools,
            "capabilities_required": list(set(capabilities_required)),
            "permissions": role_twin.get("permissions", []),
            "risk_level": risk_level,
            "approval_rules": role_twin.get("approval_rules", {})
        }
