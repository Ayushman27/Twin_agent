"""
Role Criteria Engine.
Converts an organizational Role Blueprint and Human Twin into structured RoleCriteria consumed by AgentPlanner and AgentFactory.
"""
from typing import Dict, Any, List

from app.agentic.models import RiskLevel


class CriteriaEngine:
    """
    Engine for converting raw Role Blueprint / Human Twin data into structured RoleCriteria.
    """
    
    @staticmethod
    def generate_role_criteria(
        role_id: str, 
        role_twin: Dict[str, Any], 
        human_twin: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merge and extract criteria from role definition and human preferences.
        """
        responsibilities = role_twin.get("responsibilities", [])
        role_skills = role_twin.get("required_skills") or role_twin.get("skills") or []
        
        human_skills_raw = human_twin.get("skills", {})
        if isinstance(human_skills_raw, dict):
            human_skills = human_skills_raw.get("technical_skills", [])
        elif isinstance(human_skills_raw, list):
            human_skills = human_skills_raw
        else:
            human_skills = []
        
        # Merge skills
        combined_skills = list(set([s for s in (role_skills + human_skills) if s]))
        skills_lower = [s.lower() for s in combined_skills]
        
        tools = role_twin.get("tools", [])
        tools_lower = [t.lower() for t in tools]
        
        # Direct configured capabilities from role
        configured_caps = role_twin.get("capabilities_required") or role_twin.get("capabilities") or []
        if isinstance(configured_caps, list):
            capabilities_required = [
                c.get("name") if isinstance(c, dict) else str(c)
                for c in configured_caps
            ]
        else:
            capabilities_required = []
        
        # Dynamic inference from skills, responsibilities, and tools
        resp_lower = [r.lower() for r in responsibilities]
        if "python" in skills_lower or "implement_features" in resp_lower or any("code" in r or "feature" in r or "develop" in r for r in resp_lower):
            capabilities_required.append("coding")
            capabilities_required.append("debugging")
        if "testing" in resp_lower or "write_tests" in resp_lower or any("test" in r for r in resp_lower):
            capabilities_required.append("testing")
        if "github" in tools_lower or "code_review" in resp_lower or any("review" in r for r in resp_lower):
            capabilities_required.append("github")
            capabilities_required.append("code_review")
            
        # Risk level determination
        raw_risk = role_twin.get("risk_level", "MEDIUM")
        if isinstance(raw_risk, str):
            try:
                risk_level = RiskLevel[raw_risk.upper()]
            except KeyError:
                risk_level = RiskLevel.MEDIUM
        elif isinstance(raw_risk, RiskLevel):
            risk_level = raw_risk
        else:
            risk_level = RiskLevel.MEDIUM

        if "production_deployment" in resp_lower or any("deploy" in r or "production" in r for r in resp_lower):
            risk_level = RiskLevel.CRITICAL
            
        return {
            "role_id": role_id,
            "persona": role_twin.get("persona", {}),
            "responsibilities": responsibilities,
            "skills": combined_skills,
            "tools": tools,
            "capabilities_required": list(set(capabilities_required)),
            "permissions": role_twin.get("permissions", []),
            "risk_level": risk_level,
            "approval_rules": role_twin.get("approval_rules", {}),
        }
