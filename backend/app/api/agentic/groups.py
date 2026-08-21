"""
Agent Group Endpoints
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select

from app.db.session import get_db
from app.agentic.models import AgentGroup, Agent
from app.agentic.schemas import AgentGroupResponse
from app.agentic.planner.agent_planner import AgentPlanner
from app.agentic.factory.agent_factory import AgentFactory


router = APIRouter()


@router.post("/organizations/{org_id}/employees/{emp_id}/agent-group/generate", response_model=AgentGroupResponse)
async def generate_agent_group(
    org_id: str,
    emp_id: str,
    payload: Dict[str, Any], 
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamically generates an Agent Group for an employee.
    """
    human_twin = payload.get("human_twin", {})
    role_twin = payload.get("role_twin", {})
    
    # 1. Plan
    planner = AgentPlanner()
    required_capabilities = await planner.plan_agent_group(
        employee_id=emp_id,
        role_twin=role_twin,
        human_twin=human_twin
    )
    
    # 2. Factory
    factory = AgentFactory(db)
    group = await factory.create_agent_group(
        organization_id=org_id,
        employee_id=emp_id,
        required_capabilities=required_capabilities,
        human_twin=human_twin,
        role_twin=role_twin
    )
    
    # Eager reload
    res = await db.execute(
        select(AgentGroup)
        .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
        .where(AgentGroup.id == group.id)
    )
    return res.scalar_one()


@router.get("/employees/{emp_id}/agent-group", response_model=AgentGroupResponse)
async def get_agent_group(
    emp_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Fetch the active agent group for an employee."""
    result = await db.execute(
        select(AgentGroup)
        .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
        .where(AgentGroup.employee_id == emp_id, AgentGroup.status == "ACTIVE")
        .order_by(AgentGroup.created_at.desc())
    )
    group = result.scalars().first()
    if not group:
        raise HTTPException(status_code=404, detail="No active agent group found.")
    return group
