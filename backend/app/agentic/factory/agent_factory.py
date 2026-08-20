"""
Agent Factory - Responsible for dynamically assembling employee-specific agent groups.
"""
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.agentic.models import AgentGroup, Agent, AgentCapability
from app.agentic.registry.capability_registry import CapabilityRegistry
from app.agentic.registry.tool_registry import ToolRegistry


class AgentFactory:
    """
    Assembles the Dynamic Agent Group.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.registry = CapabilityRegistry(db)
        
    async def create_agent_group(
        self,
        organization_id: str,
        employee_id: str,
        required_capabilities: List[str],
        human_twin: Dict[str, Any],
        role_twin: Dict[str, Any]
    ) -> AgentGroup:
        """
        Dynamically create an Agent Group based on required capabilities.
        """
        # 1. Fetch capability definitions
        capabilities = await self.registry.get_capabilities_by_names(required_capabilities)
        
        # 2. Create the Agent Group
        role_title = role_twin.get("role_title", "Custom")
        group = AgentGroup(
            organization_id=organization_id,
            employee_id=employee_id,
            name=f"{role_title} Agent Group",
            status="ACTIVE"
        )
        self.db.add(group)
        await self.db.flush()
        
        # 3. Create Agents for each capability
        employee_permissions = role_twin.get("permissions", [])
        
        for cap in capabilities:
            # 4. Permission validation
            assigned_tools = []
            for tool_id in cap.required_tools:
                if ToolRegistry.validate_tool_assignment(tool_id, employee_permissions):
                    assigned_tools.append(tool_id)
            
            # 5. Personalize instructions based on Human Twin
            comm_style = human_twin.get("persona", {}).get("communication_style", "professional")
            custom_instructions = f"{cap.system_instructions}\n\nCommunication style: {comm_style}"
            
            agent = Agent(
                agent_group_id=group.id,
                capability_id=cap.id,
                name=f"{cap.name} Agent",
                custom_instructions=custom_instructions,
                assigned_tools=assigned_tools,
                permissions=cap.required_permissions,
                status="ACTIVE"
            )
            self.db.add(agent)
            
        await self.db.commit()
        await self.db.refresh(group)
        return group
