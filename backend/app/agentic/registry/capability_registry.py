"""
Capability Registry - Manages reusable agent capabilities.
"""
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.agentic.models import AgentCapability


class CapabilityRegistry:
    """
    Central registry for managing reusable agent capabilities.
    Capabilities are NOT independent models, but building blocks 
    for dynamically assembling Agent Groups.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def get_capability(self, capability_id: str) -> Optional[AgentCapability]:
        """Fetch a single capability by ID."""
        result = await self.db.execute(
            select(AgentCapability).where(AgentCapability.id == capability_id, AgentCapability.enabled == True)
        )
        return result.scalars().first()

    async def get_capabilities_by_names(self, names: List[str]) -> List[AgentCapability]:
        """Fetch a list of capabilities by their names (one unique capability per requested name)."""
        result = await self.db.execute(
            select(AgentCapability)
            .where(AgentCapability.name.in_(names), AgentCapability.enabled == True)
            .order_by(AgentCapability.created_at.desc())
        )
        all_caps = list(result.scalars().all())
        unique_by_name: dict = {}
        for cap in all_caps:
            if cap.name not in unique_by_name:
                unique_by_name[cap.name] = cap
        return list(unique_by_name.values())
        
    async def get_all_capabilities(self) -> List[AgentCapability]:
        """List all active capabilities."""
        result = await self.db.execute(
            select(AgentCapability).where(AgentCapability.enabled == True)
        )
        return list(result.scalars().all())

    async def register_capability(self, capability_data: dict) -> AgentCapability:
        """Register a new reusable capability."""
        capability = AgentCapability(**capability_data)
        self.db.add(capability)
        await self.db.commit()
        await self.db.refresh(capability)
        return capability

    async def get_by_id_or_name(self, identifier: str) -> Optional[AgentCapability]:
        """Fetch a capability by ID or name (whether enabled or disabled)."""
        result = await self.db.execute(
            select(AgentCapability).where(
                (AgentCapability.id == identifier) | (AgentCapability.name == identifier)
            )
        )
        return result.scalars().first()

    async def get_active_by_id_or_name(self, identifier: str) -> Optional[AgentCapability]:
        """Fetch an active enabled capability by ID or name."""
        result = await self.db.execute(
            select(AgentCapability).where(
                ((AgentCapability.id == identifier) | (AgentCapability.name == identifier)),
                AgentCapability.enabled == True,
            )
        )
        return result.scalars().first()
