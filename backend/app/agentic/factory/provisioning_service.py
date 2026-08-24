"""
Role Provisioning Service.
Connects Neon Organizational Role Blueprints with the SQLite Dynamic Agentic Layer.
Flow: Neon Employee + Role -> CriteriaEngine -> AgentPlanner -> AgentFactory -> AgentGroup + Agents.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.agentic.factory.agent_factory import AgentFactory
from app.agentic.models import Agent, AgentGroup
from app.agentic.planner.agent_planner import AgentPlanner
from app.agentic.schemas import AgentGroupResponse, AgentResponse
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.modules.auth.models import User
from app.modules.auth.schemas import CurrentUser
from app.modules.organizations.models import OrganizationMember
from app.modules.roles.models import EmployeeRoleAssignment, Role, RoleCapability
from app.modules.roles.service import RoleService


class RoleProvisioningService:
    """
    Authoritative service for orchestrating employee-specific AI workforce provisioning
    from Neon PostgreSQL organizational roles into SQLite Agent DB.
    """

    def __init__(self, neon_db: AsyncSession, agent_db: AsyncSession):
        self.neon_db = neon_db
        self.agent_db = agent_db
        self.planner = AgentPlanner()
        self.factory = AgentFactory(agent_db)
        self.role_service = RoleService(neon_db=neon_db, agent_db=agent_db)

    def _verify_org_access(self, organization_id: str, current_user: CurrentUser) -> None:
        if current_user.role == "SUPER_ADMIN":
            return
        if current_user.organization_id != organization_id:
            raise ForbiddenException("Access denied: You cannot provision workforce for another organization")

    async def get_employee_active_workforce(
        self,
        organization_id: str,
        employee_id: str,
        current_user: CurrentUser,
    ) -> Optional[AgentGroupResponse]:
        """Fetch current active agent group for an employee if present in Agent DB."""
        self._verify_org_access(organization_id, current_user)
        user, _ = await self.role_service._resolve_employee_user_and_member(organization_id, employee_id)

        result = await self.agent_db.execute(
            select(AgentGroup)
            .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
            .where(
                AgentGroup.organization_id == organization_id,
                AgentGroup.employee_id == user.id,
                AgentGroup.status == "ACTIVE",
            )
            .order_by(AgentGroup.created_at.desc())
        )
        group = result.scalars().first()
        if not group:
            return None

        return AgentGroupResponse.model_validate(group)

    async def provision_employee_workforce(
        self,
        organization_id: str,
        employee_id: str,
        current_user: CurrentUser,
        target_role_id: Optional[str] = None,
        force_regenerate: bool = False,
    ) -> AgentGroupResponse:
        """
        Orchestrates workforce provisioning:
        1. Resolve employee in Neon.
        2. Resolve assigned Job/AI role blueprint in Neon.
        3. Extract role capabilities & persona.
        4. Construct role_twin and human_twin payloads.
        5. Invoke AgentPlanner to determine recommended capabilities.
        6. Safely manage duplicate active agent groups (archive prior if role changed/regenerated).
        7. Invoke authoritative AgentFactory to assemble the AgentGroup and instantiate agents.
        8. Return structured AgentGroupResponse.
        """
        self._verify_org_access(organization_id, current_user)

        # 1. Resolve employee user and membership in Neon
        user, member = await self.role_service._resolve_employee_user_and_member(organization_id, employee_id)

        # 2. Resolve target role: explicit target or active assignment
        if target_role_id:
            role = await self.role_service.repo.get_by_id(role_id=target_role_id, organization_id=organization_id)
            if not role:
                raise BadRequestException("Target Role does not exist in this organization")
            # Ensure assignment is active
            await self.role_service.repo.assign_employee_role(
                organization_id=organization_id,
                user_id=user.id,
                role_id=role.id,
                assigned_by=current_user.id if hasattr(current_user, "id") else None,
            )
            await self.neon_db.commit()
        else:
            assignment = await self.role_service.repo.get_active_employee_role_assignment(
                organization_id=organization_id, user_id=user.id
            )
            if not assignment:
                raise BadRequestException(
                    "Employee has no assigned Job/AI Role blueprint. Assign a role before provisioning AI workforce."
                )
            role = await self.role_service.repo.get_by_id(role_id=assignment.role_id, organization_id=organization_id)
            if not role:
                raise NotFoundException("Assigned role blueprint could not be found in Neon")

        # 3. Retrieve role capabilities mappings from Neon
        role_caps_mappings = await self.role_service.repo.get_role_capabilities(role_id=role.id)
        configured_capability_names = [m.capability_name for m in role_caps_mappings]

        # 4. Construct Human Twin & Role Twin payloads
        human_twin: Dict[str, Any] = {
            "employee_id": user.id,
            "name": user.name,
            "email": user.email,
            "job_title": user.job_title or role.name,
            "department": user.department or role.department,
            "skills": {
                "technical_skills": role.required_skills or [],
            },
            "persona": {
                "communication_style": role.persona.get("communication_style", "professional")
                if role.persona
                else "professional",
            },
        }

        role_twin: Dict[str, Any] = {
            "role_id": role.id,
            "role_title": role.name,
            "name": role.name,
            "department": role.department,
            "responsibilities": role.responsibilities or [],
            "required_skills": role.required_skills or [],
            "skills": role.required_skills or [],
            "tools": role.tools or [],
            "permissions": role.permissions or [],
            "persona": role.persona or {},
            "risk_level": role.risk_level.value if hasattr(role.risk_level, "value") else str(role.risk_level),
            "approval_rules": role.approval_rules or {},
            "capabilities_required": configured_capability_names,
        }

        # 5. Invoke AgentPlanner
        planned_capabilities = await self.planner.plan_agent_group(
            employee_id=user.id,
            role_twin=role_twin,
            human_twin=human_twin,
        )

        # Merge explicit configured capabilities if planner didn't infer all
        all_required_capabilities = list(set(planned_capabilities + configured_capability_names))
        if not all_required_capabilities:
            # Fallback to default coding & debugging if role has no configured capabilities
            all_required_capabilities = ["coding", "debugging"]

        # 6. Check existing active agent groups in SQLite Agent DB
        existing_groups_res = await self.agent_db.execute(
            select(AgentGroup)
            .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
            .where(
                AgentGroup.organization_id == organization_id,
                AgentGroup.employee_id == user.id,
                AgentGroup.status == "ACTIVE",
            )
        )
        existing_active_groups = list(existing_groups_res.scalars().all())

        if existing_active_groups and not force_regenerate:
            # Check if current active group matches the exact target role and capabilities
            active_group = existing_active_groups[0]
            existing_agent_caps = {a.name.replace(" Agent", "").lower() for a in active_group.agents}
            target_caps_lower = {c.lower() for c in all_required_capabilities}

            if existing_agent_caps == target_caps_lower and role.name.lower() in active_group.name.lower():
                # Already up-to-date, reuse existing active group
                return AgentGroupResponse.model_validate(active_group)

        # Archive previous active groups to preserve execution history without duplicates
        for existing in existing_active_groups:
            existing.status = "ARCHIVED"
        await self.agent_db.flush()

        # 7. Invoke authoritative AgentFactory
        agent_group = await self.factory.create_agent_group(
            organization_id=organization_id,
            employee_id=user.id,
            required_capabilities=all_required_capabilities,
            human_twin=human_twin,
            role_twin=role_twin,
        )

        # 8. Reload AgentGroup with agents and capability definitions
        res = await self.agent_db.execute(
            select(AgentGroup)
            .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
            .where(AgentGroup.id == agent_group.id)
        )
        loaded_group = res.scalar_one()

        return AgentGroupResponse.model_validate(loaded_group)
