"""Roles module — Service layer with authorization, multi-tenancy, and Capability validation."""
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agentic.registry.capability_registry import CapabilityRegistry
from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.modules.auth.models import User
from app.modules.auth.schemas import CurrentUser
from app.modules.organizations.models import MemberStatus, OrganizationMember
from app.modules.roles.models import EmployeeRoleAssignment, Role, RoleCapability, RoleStatus
from app.modules.roles.repository import RoleRepository
from app.modules.roles.schemas import (
    EmployeeRoleAssignmentResponse,
    RoleCapabilitiesListResponse,
    RoleCapabilitySummary,
    RoleCreate,
    RoleListResponse,
    RoleResponse,
    RoleUpdate,
    RoleWithCapabilitiesResponse,
)


class RoleService:
    def __init__(self, neon_db: AsyncSession, agent_db: Optional[AsyncSession] = None):
        self.neon_db = neon_db
        self.agent_db = agent_db if agent_db is not None else neon_db
        self.repo = RoleRepository(neon_db)
        self.capability_registry = CapabilityRegistry(self.agent_db)

    def _verify_org_access(self, organization_id: str, current_user: CurrentUser) -> None:
        """Enforce that the requesting admin belongs to the target organization."""
        if current_user.role == "SUPER_ADMIN":
            return
        if current_user.organization_id != organization_id:
            raise ForbiddenException("Access denied: You cannot access roles for another organization")

    async def list_roles(
        self,
        organization_id: str,
        current_user: CurrentUser,
        department: Optional[str] = None,
        status: Optional[RoleStatus] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> RoleListResponse:
        self._verify_org_access(organization_id, current_user)
        roles = await self.repo.list_by_organization(
            organization_id=organization_id,
            department=department,
            status=status,
            search=search,
            limit=limit,
            offset=offset,
        )
        total = await self.repo.count_by_organization(
            organization_id=organization_id,
            department=department,
            status=status,
            search=search,
        )

        # Pre-fetch capability counts per role
        cap_counts_res = await self.neon_db.execute(
            select(RoleCapability.role_id, func.count(RoleCapability.id))
            .group_by(RoleCapability.role_id)
        )
        cap_counts = dict(cap_counts_res.all())

        # Pre-fetch active employee role assignments
        assignments_res = await self.neon_db.execute(
            select(EmployeeRoleAssignment.role_id, func.count(EmployeeRoleAssignment.id))
            .where(
                EmployeeRoleAssignment.organization_id == organization_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
            .group_by(EmployeeRoleAssignment.role_id)
        )
        assignment_counts = dict(assignments_res.all())

        # Pre-fetch organization members to count assigned employees per role (fallback)
        members_res = await self.neon_db.execute(
            select(OrganizationMember.role, User.job_title)
            .join(User, OrganizationMember.user_id == User.id)
            .where(
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.status == MemberStatus.ACTIVE,
            )
        )
        member_rows = members_res.all()

        role_responses = []
        for r in roles:
            # Check explicit assignments first, then fallback to name match
            emp_count = assignment_counts.get(r.id)
            if emp_count is None:
                emp_count = sum(
                    1 for m_role, j_title in member_rows
                    if (m_role and m_role.lower() == r.name.lower()) or (j_title and j_title.lower() == r.name.lower())
                )

            c_count = cap_counts.get(r.id, 0)
            role_dict = RoleResponse.model_validate(r).model_dump()
            role_dict["employee_count"] = emp_count
            role_dict["capabilities_count"] = c_count
            role_dict["agent_groups_count"] = emp_count
            role_responses.append(RoleResponse(**role_dict))

        return RoleListResponse(
            roles=role_responses,
            total=total,
        )

    async def get_role(
        self,
        organization_id: str,
        role_id: str,
        current_user: CurrentUser,
    ) -> RoleWithCapabilitiesResponse:
        self._verify_org_access(organization_id, current_user)
        role = await self.repo.get_by_id(role_id=role_id, organization_id=organization_id)
        if not role:
            raise NotFoundException("Role not found in this organization")

        # Resolve configured capabilities
        mappings = await self.repo.get_role_capabilities(role_id=role.id)
        capability_summaries = []
        for m in mappings:
            cap = await self.capability_registry.get_by_id_or_name(m.capability_id)
            if not cap:
                cap = await self.capability_registry.get_by_id_or_name(m.capability_name)
            if cap:
                capability_summaries.append(
                    RoleCapabilitySummary(
                        id=cap.id,
                        name=cap.name,
                        description=cap.description,
                        risk_level=cap.risk_level.value if hasattr(cap.risk_level, "value") else str(cap.risk_level),
                        approval_required=cap.approval_required,
                        enabled=cap.enabled,
                        version=cap.version,
                        required_tools=cap.required_tools or [],
                        required_permissions=cap.required_permissions or [],
                    )
                )

        # Count assigned members (explicit assignments first, fallback to job_title/name)
        assign_count_res = await self.neon_db.execute(
            select(func.count(EmployeeRoleAssignment.id))
            .where(
                EmployeeRoleAssignment.organization_id == organization_id,
                EmployeeRoleAssignment.role_id == role.id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        emp_count = assign_count_res.scalar_one() or 0
        if emp_count == 0:
            members_res = await self.neon_db.execute(
                select(func.count(OrganizationMember.id))
                .join(User, OrganizationMember.user_id == User.id)
                .where(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.status == MemberStatus.ACTIVE,
                    (func.lower(OrganizationMember.role) == role.name.lower()) | (func.lower(User.job_title) == role.name.lower()),
                )
            )
            emp_count = members_res.scalar_one() or 0

        base_data = RoleResponse.model_validate(role).model_dump()
        base_data["employee_count"] = emp_count
        base_data["capabilities_count"] = len(capability_summaries)
        base_data["agent_groups_count"] = emp_count

        return RoleWithCapabilitiesResponse(**base_data, capabilities=capability_summaries)

    async def create_role(
        self,
        organization_id: str,
        data: RoleCreate,
        current_user: CurrentUser,
    ) -> RoleResponse:
        self._verify_org_access(organization_id, current_user)
        
        # Check uniqueness of role name within organization
        existing = await self.repo.get_by_name(organization_id=organization_id, name=data.name)
        if existing:
            raise ConflictException(f"A role named '{data.name}' already exists in this organization")

        # Validate tools against ToolRegistry if provided
        if data.tools:
            from app.agentic.registry.tool_registry import ToolRegistry
            available_tool_ids = {t["tool_id"].lower() for t in ToolRegistry.get_all_tools()}
            for tool in data.tools:
                if tool.strip().lower() not in available_tool_ids:
                    valid_tools_str = ", ".join(sorted(available_tool_ids))
                    raise BadRequestException(
                        f"Unsupported tool '{tool}'. Valid tools from ToolRegistry are: {valid_tools_str}"
                    )

        role = await self.repo.create(
            organization_id=organization_id,
            **data.model_dump(),
        )
        await self.neon_db.commit()
        await self.neon_db.refresh(role)
        return RoleResponse.model_validate(role)

    async def update_role(
        self,
        organization_id: str,
        role_id: str,
        data: RoleUpdate,
        current_user: CurrentUser,
    ) -> RoleResponse:
        self._verify_org_access(organization_id, current_user)
        role = await self.repo.get_by_id(role_id=role_id, organization_id=organization_id)
        if not role:
            raise NotFoundException("Role not found in this organization")

        # If name is being changed, verify uniqueness within org
        if data.name and data.name.strip().lower() != role.name.strip().lower():
            existing = await self.repo.get_by_name(organization_id=organization_id, name=data.name)
            if existing and existing.id != role.id:
                raise ConflictException(f"A role named '{data.name}' already exists in this organization")

        # Validate tools against ToolRegistry if provided
        if data.tools is not None:
            from app.agentic.registry.tool_registry import ToolRegistry
            available_tool_ids = {t["tool_id"].lower() for t in ToolRegistry.get_all_tools()}
            for tool in data.tools:
                if tool.strip().lower() not in available_tool_ids:
                    valid_tools_str = ", ".join(sorted(available_tool_ids))
                    raise BadRequestException(
                        f"Unsupported tool '{tool}'. Valid tools from ToolRegistry are: {valid_tools_str}"
                    )

        update_dict = data.model_dump(exclude_unset=True)
        updated_role = await self.repo.update(role, **update_dict)
        await self.neon_db.commit()
        await self.neon_db.refresh(updated_role)
        return RoleResponse.model_validate(updated_role)

    async def delete_role(
        self,
        organization_id: str,
        role_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_access(organization_id, current_user)
        role = await self.repo.get_by_id(role_id=role_id, organization_id=organization_id)
        if not role:
            raise NotFoundException("Role not found in this organization")

        await self.repo.delete(role)
        await self.neon_db.commit()

    # ── Role Capability Mappings ──────────────────────────────────
    async def get_role_capabilities(
        self,
        organization_id: str,
        role_id: str,
        current_user: CurrentUser,
    ) -> RoleCapabilitiesListResponse:
        self._verify_org_access(organization_id, current_user)
        role = await self.repo.get_by_id(role_id=role_id, organization_id=organization_id)
        if not role:
            raise NotFoundException("Role not found in this organization")

        mappings = await self.repo.get_role_capabilities(role_id=role.id)
        capability_summaries = []
        for m in mappings:
            cap = await self.capability_registry.get_by_id_or_name(m.capability_id)
            if not cap:
                cap = await self.capability_registry.get_by_id_or_name(m.capability_name)
            if cap:
                capability_summaries.append(
                    RoleCapabilitySummary(
                        id=cap.id,
                        name=cap.name,
                        description=cap.description,
                        risk_level=cap.risk_level.value if hasattr(cap.risk_level, "value") else str(cap.risk_level),
                        approval_required=cap.approval_required,
                        enabled=cap.enabled,
                        version=cap.version,
                        required_tools=cap.required_tools or [],
                        required_permissions=cap.required_permissions or [],
                    )
                )

        return RoleCapabilitiesListResponse(
            role_id=role.id,
            role_name=role.name,
            capabilities=capability_summaries,
            total=len(capability_summaries),
        )

    async def update_role_capabilities(
        self,
        organization_id: str,
        role_id: str,
        capability_identifiers: List[str],
        current_user: CurrentUser,
    ) -> RoleCapabilitiesListResponse:
        self._verify_org_access(organization_id, current_user)
        role = await self.repo.get_by_id(role_id=role_id, organization_id=organization_id)
        if not role:
            raise NotFoundException("Role not found in this organization")

        # Validate each capability identifier against CapabilityRegistry
        validated_capabilities = []
        for identifier in capability_identifiers:
            cap = await self.capability_registry.get_by_id_or_name(identifier)
            if not cap:
                raise BadRequestException(f"Agent capability '{identifier}' does not exist in the capability registry.")
            if not cap.enabled:
                raise BadRequestException(f"Agent capability '{cap.name}' is currently disabled and cannot be assigned to a role.")
            validated_capabilities.append(cap)

        # Build unique tuple list (capability_id, capability_name)
        seen_ids = set()
        capability_tuples = []
        capability_summaries = []
        for cap in validated_capabilities:
            if cap.id not in seen_ids:
                seen_ids.add(cap.id)
                capability_tuples.append((cap.id, cap.name))
                capability_summaries.append(
                    RoleCapabilitySummary(
                        id=cap.id,
                        name=cap.name,
                        description=cap.description,
                        risk_level=cap.risk_level.value if hasattr(cap.risk_level, "value") else str(cap.risk_level),
                        approval_required=cap.approval_required,
                        enabled=cap.enabled,
                        version=cap.version,
                        required_tools=cap.required_tools or [],
                        required_permissions=cap.required_permissions or [],
                    )
                )

        # Persist reconciled mappings in Neon PostgreSQL
        await self.repo.set_role_capabilities(role_id=role.id, capabilities=capability_tuples)
        await self.neon_db.commit()

        return RoleCapabilitiesListResponse(
            role_id=role.id,
            role_name=role.name,
            capabilities=capability_summaries,
            total=len(capability_summaries),
        )

    # ── Employee Role Assignment Layer ────────────────────────────
    async def _resolve_employee_user_and_member(
        self, organization_id: str, employee_identifier: str
    ) -> tuple[User, OrganizationMember]:
        """
        Resolves employee by user_id or member_id, verifying membership in organization.
        """
        # Try finding member by user_id or member id
        member_res = await self.neon_db.execute(
            select(OrganizationMember)
            .where(
                OrganizationMember.organization_id == organization_id,
                (OrganizationMember.user_id == employee_identifier) | (OrganizationMember.id == employee_identifier),
            )
        )
        member = member_res.scalars().first()
        if not member:
            raise NotFoundException("Employee is not a member of this organization")

        user_res = await self.neon_db.execute(select(User).where(User.id == member.user_id))
        user = user_res.scalars().first()
        if not user:
            raise NotFoundException("User account associated with this employee was not found")

        return user, member

    async def get_employee_role_assignment(
        self,
        organization_id: str,
        employee_id: str,
        current_user: CurrentUser,
    ) -> EmployeeRoleAssignmentResponse:
        self._verify_org_access(organization_id, current_user)
        user, member = await self._resolve_employee_user_and_member(organization_id, employee_id)

        assignment = await self.repo.get_active_employee_role_assignment(
            organization_id=organization_id, user_id=user.id
        )

        assigned_role_resp = None
        if assignment:
            # Resolve full role details with capabilities
            assigned_role_resp = await self.get_role(
                organization_id=organization_id,
                role_id=assignment.role_id,
                current_user=current_user,
            )

        return EmployeeRoleAssignmentResponse(
            id=assignment.id if assignment else None,
            organization_id=organization_id,
            user_id=user.id,
            employee_name=user.name,
            employee_email=user.email,
            membership_role=member.role,
            assigned_role=assigned_role_resp,
            status=assignment.status if assignment else "UNASSIGNED",
            assigned_by=assignment.assigned_by if assignment else None,
            assigned_at=assignment.created_at if assignment else None,
            created_at=assignment.created_at if assignment else None,
            updated_at=assignment.updated_at if assignment else None,
        )

    async def assign_employee_role(
        self,
        organization_id: str,
        employee_id: str,
        role_id: str,
        current_user: CurrentUser,
    ) -> EmployeeRoleAssignmentResponse:
        self._verify_org_access(organization_id, current_user)
        user, member = await self._resolve_employee_user_and_member(organization_id, employee_id)

        # Verify that the target role exists and belongs to the same organization
        target_role = await self.repo.get_by_id(role_id=role_id, organization_id=organization_id)
        if not target_role:
            raise BadRequestException("Target Job/AI Role does not exist in this organization")

        # Assign role in Neon (clean separation from organization_members.role)
        assignment = await self.repo.assign_employee_role(
            organization_id=organization_id,
            user_id=user.id,
            role_id=target_role.id,
            assigned_by=current_user.id if hasattr(current_user, "id") else None,
        )
        await self.neon_db.commit()
        await self.neon_db.refresh(assignment)

        # Fetch full role response with capabilities
        assigned_role_resp = await self.get_role(
            organization_id=organization_id,
            role_id=target_role.id,
            current_user=current_user,
        )

        return EmployeeRoleAssignmentResponse(
            id=assignment.id,
            organization_id=organization_id,
            user_id=user.id,
            employee_name=user.name,
            employee_email=user.email,
            membership_role=member.role,  # Unmodified organization membership role
            assigned_role=assigned_role_resp,
            status=assignment.status,
            assigned_by=assignment.assigned_by,
            assigned_at=assignment.created_at,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
