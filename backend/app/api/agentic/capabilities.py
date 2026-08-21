"""
Agent Capability Endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.agentic.schemas import AgentCapabilityResponse, AgentCapabilityCreate
from app.agentic.registry.capability_registry import CapabilityRegistry


router = APIRouter()


@router.get("/agent-capabilities", response_model=List[AgentCapabilityResponse])
async def list_capabilities(db: AsyncSession = Depends(get_db)):
    """List all available capabilities."""
    registry = CapabilityRegistry(db)
    return await registry.get_all_capabilities()


@router.post("/agent-capabilities", response_model=AgentCapabilityResponse)
async def create_capability(
    payload: AgentCapabilityCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new capability."""
    registry = CapabilityRegistry(db)
    return await registry.register_capability(payload.model_dump())


@router.get("/agent-tools")
async def list_agent_tools():
    """List all recognized organizational tools from the ToolRegistry."""
    from app.agentic.registry.tool_registry import ToolRegistry
    return ToolRegistry.get_all_tools()
