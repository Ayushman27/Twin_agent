"""Teams module — Business logic and service orchestration."""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    NotFoundException,
)
from app.modules.auth.models import User
from app.modules.auth.schemas import CurrentUser
from app.modules.organizations.models import MemberStatus, OrganizationMember
from app.modules.roles.models import EmployeeRoleAssignment, Role
from app.modules.teams.models import (
    Team,
    TeamAIRoute,
    TeamKnowledgeSource,
    TeamMember,
    TeamMemberStatus,
    TeamStatus,
)
from app.modules.teams.repository import TeamRepository
from app.modules.teams.schemas import (
    TeamAIRouteCreate,
    TeamAIRouteListResponse,
    TeamAIRouteResponse,
    TeamAIRouteUpdate,
    TeamAIRuntimeStats,
    TeamAIWorkforceResponse,
    TeamCreate,
    TeamDetailResponse,
    TeamKnowledgeOverviewResponse,
    TeamKnowledgePolicyUpdate,
    TeamKnowledgeSourceCreate,
    TeamKnowledgeSourceResponse,
    TeamKnowledgeSourceUpdate,
    TeamLeadSummary,
    TeamListResponse,
    TeamMemberCreate,
    TeamMemberResponse,
    TeamMemberRuntimeStats,
    TeamMemberUpdate,
    TeamMemberWorkforceItem,
    TeamMemberWorkloadStatus,
    TeamMetricsOverviewResponse,
    TeamResponse,
    TeamUpdate,
)


class TeamService:
    """Service layer enforcing multi-tenancy, lead verification, and team lifecycle."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TeamRepository(db)

    def _verify_org_access(self, organization_id: str, current_user: CurrentUser) -> None:
        if current_user.role == "SUPER_ADMIN":
            return
        if current_user.organization_id != organization_id:
            raise ForbiddenException("Access denied: You cannot access teams in another organization")

    def _verify_org_admin(self, organization_id: str, current_user: CurrentUser) -> None:
        self._verify_org_access(organization_id, current_user)
        if current_user.role not in ("ORG_ADMIN", "SUPER_ADMIN"):
            raise ForbiddenException("Administrator privileges required for this action")

    async def _verify_user_in_org(self, organization_id: str, user_id: str) -> User:
        """Verify that a user exists and is an active member of the specified organization."""
        stmt = (
            select(User)
            .join(OrganizationMember, User.id == OrganizationMember.user_id)
            .where(
                User.id == user_id,
                OrganizationMember.organization_id == organization_id,
                OrganizationMember.status == MemberStatus.ACTIVE,
            )
        )
        result = await self.db.execute(stmt)
        user = result.scalars().first()
        if not user:
            raise BadRequestException(
                f"User {user_id} is not an approved member of this organization"
            )
        return user

    async def _get_job_roles_map(self, organization_id: str) -> dict:
        """Fetch active employee role assignments mapped by user_id."""
        stmt = (
            select(EmployeeRoleAssignment.user_id, Role.name)
            .join(Role, EmployeeRoleAssignment.role_id == Role.id)
            .where(
                EmployeeRoleAssignment.organization_id == organization_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        res = await self.db.execute(stmt)
        return {row[0]: row[1] for row in res.all()}

    # ── Team CRUD ─────────────────────────────────────────────

    async def create_team(
        self,
        organization_id: str,
        payload: TeamCreate,
        current_user: CurrentUser,
    ) -> TeamResponse:
        self._verify_org_admin(organization_id, current_user)

        # Check unique team name within organization
        existing = await self.repo.get_team_by_name(organization_id, payload.name)
        if existing:
            raise BadRequestException(
                f"Team with name '{payload.name}' already exists in this organization"
            )

        # Validate team lead if provided
        lead_user = None
        if payload.team_lead_id:
            lead_user = await self._verify_user_in_org(organization_id, payload.team_lead_id)

        team = Team(
            organization_id=organization_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            department=payload.department.strip() if payload.department else None,
            team_lead_id=payload.team_lead_id,
            status=payload.status,
            ai_routing_policy=payload.ai_routing_policy or {},
            knowledge_access_config=payload.knowledge_access_config or {},
            memory_isolation_level=payload.memory_isolation_level or "TEAM_ISOLATED",
        )
        await self.repo.create_team(team)

        # Automatically enroll team lead as initial member if specified
        if payload.team_lead_id:
            await self.repo.add_member(
                team_id=team.id,
                user_id=payload.team_lead_id,
                role_in_team="Lead",
                status=TeamMemberStatus.ACTIVE,
            )

        await self.db.commit()
        await self.db.refresh(team)

        # Build response
        lead_summary = None
        if lead_user:
            lead_summary = TeamLeadSummary(
                id=lead_user.id,
                name=lead_user.name,
                email=lead_user.email,
                employee_id=lead_user.employee_id,
                job_title=lead_user.job_title,
                department=lead_user.department,
            )

        return TeamResponse(
            id=team.id,
            organization_id=team.organization_id,
            name=team.name,
            description=team.description,
            department=team.department,
            team_lead_id=team.team_lead_id,
            team_lead=lead_summary,
            status=team.status,
            ai_routing_policy=team.ai_routing_policy,
            knowledge_access_config=team.knowledge_access_config,
            memory_isolation_level=team.memory_isolation_level,
            member_count=1 if payload.team_lead_id else 0,
            created_at=team.created_at,
            updated_at=team.updated_at,
        )

    async def list_teams(
        self,
        organization_id: str,
        current_user: CurrentUser,
        department: Optional[str] = None,
        status: Optional[TeamStatus] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> TeamListResponse:
        self._verify_org_access(organization_id, current_user)

        teams = await self.repo.list_teams(
            organization_id=organization_id,
            department=department,
            status=status,
            search=search,
            limit=limit,
            offset=offset,
        )
        total = await self.repo.count_teams(
            organization_id=organization_id,
            department=department,
            status=status,
            search=search,
        )
        member_counts = await self.repo.get_member_counts(organization_id)

        items: List[TeamResponse] = []
        for t in teams:
            lead_summary = None
            if t.team_lead:
                lead_summary = TeamLeadSummary(
                    id=t.team_lead.id,
                    name=t.team_lead.name,
                    email=t.team_lead.email,
                    employee_id=t.team_lead.employee_id,
                    job_title=t.team_lead.job_title,
                    department=t.team_lead.department,
                )

            items.append(
                TeamResponse(
                    id=t.id,
                    organization_id=t.organization_id,
                    name=t.name,
                    description=t.description,
                    department=t.department,
                    team_lead_id=t.team_lead_id,
                    team_lead=lead_summary,
                    status=t.status,
                    ai_routing_policy=t.ai_routing_policy or {},
                    knowledge_access_config=t.knowledge_access_config or {},
                    memory_isolation_level=t.memory_isolation_level or "TEAM_ISOLATED",
                    member_count=member_counts.get(t.id, 0),
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                )
            )

        return TeamListResponse(teams=items, total=total)

    async def get_team_detail(
        self,
        organization_id: str,
        team_id: str,
        current_user: CurrentUser,
    ) -> TeamDetailResponse:
        self._verify_org_access(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        job_roles_map = await self._get_job_roles_map(organization_id)

        members_list: List[TeamMemberResponse] = []
        for m in team.members:
            u = m.user
            members_list.append(
                TeamMemberResponse(
                    id=m.id,
                    team_id=m.team_id,
                    user_id=m.user_id,
                    role_in_team=m.role_in_team,
                    status=m.status,
                    joined_at=m.joined_at,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                    name=u.name if u else None,
                    email=u.email if u else None,
                    employee_id=u.employee_id if u else None,
                    job_title=u.job_title if u else None,
                    department=u.department if u else None,
                    job_role_name=job_roles_map.get(m.user_id, u.job_title if u else None),
                )
            )

        lead_summary = None
        if team.team_lead:
            lead_summary = TeamLeadSummary(
                id=team.team_lead.id,
                name=team.team_lead.name,
                email=team.team_lead.email,
                employee_id=team.team_lead.employee_id,
                job_title=team.team_lead.job_title,
                department=team.team_lead.department,
            )

        return TeamDetailResponse(
            id=team.id,
            organization_id=team.organization_id,
            name=team.name,
            description=team.description,
            department=team.department,
            team_lead_id=team.team_lead_id,
            team_lead=lead_summary,
            status=team.status,
            ai_routing_policy=team.ai_routing_policy or {},
            knowledge_access_config=team.knowledge_access_config or {},
            memory_isolation_level=team.memory_isolation_level or "TEAM_ISOLATED",
            member_count=len(members_list),
            members=members_list,
            created_at=team.created_at,
            updated_at=team.updated_at,
        )

    async def update_team(
        self,
        organization_id: str,
        team_id: str,
        payload: TeamUpdate,
        current_user: CurrentUser,
    ) -> TeamResponse:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        # Validate unique name if updated
        if payload.name and payload.name.strip().lower() != team.name.lower():
            existing = await self.repo.get_team_by_name(organization_id, payload.name)
            if existing and existing.id != team.id:
                raise BadRequestException(
                    f"Team with name '{payload.name}' already exists in this organization"
                )

        # Validate team lead if updated
        if payload.team_lead_id:
            await self._verify_user_in_org(organization_id, payload.team_lead_id)

        updates = payload.model_dump(exclude_unset=True)
        if "name" in updates and updates["name"]:
            updates["name"] = updates["name"].strip()
        if "description" in updates and updates["description"]:
            updates["description"] = updates["description"].strip()
        if "department" in updates and updates["department"]:
            updates["department"] = updates["department"].strip()

        updated_team = await self.repo.update_team(team, **updates)
        await self.db.commit()
        await self.db.refresh(updated_team)

        counts = await self.repo.get_member_counts(organization_id)
        return TeamResponse(
            id=updated_team.id,
            organization_id=updated_team.organization_id,
            name=updated_team.name,
            description=updated_team.description,
            department=updated_team.department,
            team_lead_id=updated_team.team_lead_id,
            status=updated_team.status,
            ai_routing_policy=updated_team.ai_routing_policy or {},
            knowledge_access_config=updated_team.knowledge_access_config or {},
            memory_isolation_level=updated_team.memory_isolation_level or "TEAM_ISOLATED",
            member_count=counts.get(updated_team.id, 0),
            created_at=updated_team.created_at,
            updated_at=updated_team.updated_at,
        )

    async def delete_team(
        self,
        organization_id: str,
        team_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        # Soft delete / archive to preserve history
        team.status = TeamStatus.ARCHIVED
        await self.db.commit()

    # ── Team Members Management ───────────────────────────────

    async def list_team_members(
        self,
        organization_id: str,
        team_id: str,
        current_user: CurrentUser,
    ) -> List[TeamMemberResponse]:
        self._verify_org_access(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        members_with_profiles = await self.repo.get_team_members_with_profiles(team_id)
        job_roles_map = await self._get_job_roles_map(organization_id)

        result: List[TeamMemberResponse] = []
        for m, u in members_with_profiles:
            result.append(
                TeamMemberResponse(
                    id=m.id,
                    team_id=m.team_id,
                    user_id=m.user_id,
                    role_in_team=m.role_in_team,
                    status=m.status,
                    joined_at=m.joined_at,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                    name=u.name,
                    email=u.email,
                    employee_id=u.employee_id,
                    job_title=u.job_title,
                    department=u.department,
                    job_role_name=job_roles_map.get(m.user_id, u.job_title),
                )
            )
        return result

    async def add_team_member(
        self,
        organization_id: str,
        team_id: str,
        payload: TeamMemberCreate,
        current_user: CurrentUser,
    ) -> TeamMemberResponse:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        # Validate target user belongs to the same organization as an active member
        target_user = await self._verify_user_in_org(organization_id, payload.user_id)

        # Prevent duplicate membership
        existing_member = await self.repo.get_team_member(team_id, payload.user_id)
        if existing_member:
            raise BadRequestException("Employee is already a member of this team")

        member = await self.repo.add_member(
            team_id=team_id,
            user_id=payload.user_id,
            role_in_team=payload.role_in_team,
            status=payload.status,
        )
        await self.db.commit()
        await self.db.refresh(member)

        job_roles_map = await self._get_job_roles_map(organization_id)

        return TeamMemberResponse(
            id=member.id,
            team_id=member.team_id,
            user_id=member.user_id,
            role_in_team=member.role_in_team,
            status=member.status,
            joined_at=member.joined_at,
            created_at=member.created_at,
            updated_at=member.updated_at,
            name=target_user.name,
            email=target_user.email,
            employee_id=target_user.employee_id,
            job_title=target_user.job_title,
            department=target_user.department,
            job_role_name=job_roles_map.get(member.user_id, target_user.job_title),
        )

    async def remove_team_member(
        self,
        organization_id: str,
        team_id: str,
        user_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        member = await self.repo.get_team_member(team_id, user_id)
        if not member:
            raise NotFoundException("TeamMember", user_id)

        await self.repo.remove_member(member)

        # If removed member was the team lead, clear the lead reference
        if team.team_lead_id == user_id:
            team.team_lead_id = None

        await self.db.commit()

    # ── Team AI Workforce Aggregation (Bridging Neon & SQLite) ──

    async def get_team_ai_workforce(
        self,
        organization_id: str,
        team_id: str,
        current_user: CurrentUser,
        agent_db: AsyncSession,
    ) -> TeamAIWorkforceResponse:
        """
        Aggregates a team's members with their existing provisioned AgentGroups.
        - Team & Member relationships: Neon PostgreSQL
        - AgentGroups & Agents: SQLite Agent DB
        - No cross-database SQL joins or foreign keys.
        - Does NOT create new AgentGroups or invoke AgentFactory.
        """
        self._verify_org_access(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        # 1. Fetch team members with user profile details from Neon
        members_data = await self.repo.get_team_members_with_profiles(team_id)
        job_roles_map = await self._get_job_roles_map(organization_id)

        if not members_data:
            return TeamAIWorkforceResponse(
                team_id=team.id,
                team_name=team.name,
                department=team.department,
                total_members=0,
                active_workforces=0,
                total_agents=0,
                members=[],
            )

        member_user_ids = [m.user_id for m, _ in members_data]

        # 2. Query AgentGroups from SQLite Agent DB in ONE batch query
        from app.agentic.models import AgentGroup, Agent
        from app.agentic.schemas import AgentGroupResponse
        from sqlalchemy.orm import selectinload

        stmt = (
            select(AgentGroup)
            .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
            .where(
                AgentGroup.organization_id == organization_id,
                AgentGroup.employee_id.in_(member_user_ids),
                AgentGroup.status == "ACTIVE",
            )
            .order_by(AgentGroup.created_at.desc())
        )
        res = await agent_db.execute(stmt)
        active_groups = res.scalars().all()

        # Map groups by employee_id (user_id) - keep latest active group per member
        groups_by_emp_id: dict = {}
        for grp in active_groups:
            if grp.employee_id not in groups_by_emp_id:
                groups_by_emp_id[grp.employee_id] = grp

        # 3. Assemble member workforce items and aggregated counts
        total_agents_count = 0
        active_workforces_count = 0
        member_items: List[TeamMemberWorkforceItem] = []

        for member, user in members_data:
            grp = groups_by_emp_id.get(member.user_id)
            agent_group_resp = None
            if grp:
                agent_group_resp = AgentGroupResponse.model_validate(grp)
                active_workforces_count += 1
                total_agents_count += len(grp.agents) if grp.agents else 0

            member_items.append(
                TeamMemberWorkforceItem(
                    user_id=member.user_id,
                    name=user.name if user else None,
                    email=user.email if user else None,
                    employee_id=user.employee_id if user else None,
                    job_title=user.job_title if user else None,
                    department=user.department if user else team.department,
                    job_role_name=job_roles_map.get(member.user_id, user.job_title if user else None),
                    role_in_team=member.role_in_team,
                    agent_group=agent_group_resp,
                )
            )

        return TeamAIWorkforceResponse(
            team_id=team.id,
            team_name=team.name,
            department=team.department,
            total_members=len(members_data),
            active_workforces=active_workforces_count,
            total_agents=total_agents_count,
            members=member_items,
        )

    # ── Team AI Mesh Routing Configuration ──────────────────────

    async def _verify_role_in_org(self, organization_id: str, role_id: str) -> Role:
        stmt = select(Role).where(Role.id == role_id, Role.organization_id == organization_id)
        res = await self.db.execute(stmt)
        role = res.scalars().first()
        if not role:
            raise BadRequestException(f"Job/AI Role {role_id} does not exist in this organization")
        return role

    def _to_route_response(self, route: TeamAIRoute) -> TeamAIRouteResponse:
        return TeamAIRouteResponse(
            id=route.id,
            team_id=route.team_id,
            organization_id=route.organization_id,
            source_role_id=route.source_role_id,
            target_role_id=route.target_role_id,
            source_user_id=route.source_user_id,
            target_user_id=route.target_user_id,
            source_role_name=route.source_role.name if route.source_role else None,
            target_role_name=route.target_role.name if route.target_role else None,
            source_user_name=route.source_user.name if route.source_user else None,
            target_user_name=route.target_user.name if route.target_user else None,
            priority=route.priority,
            condition=route.condition,
            description=route.description,
            enabled=route.enabled,
            created_at=route.created_at,
            updated_at=route.updated_at,
        )

    async def create_team_route(
        self,
        organization_id: str,
        team_id: str,
        payload: TeamAIRouteCreate,
        current_user: CurrentUser,
    ) -> TeamAIRouteResponse:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        # Must specify at least one source and one target
        if not payload.source_role_id and not payload.source_user_id:
            raise BadRequestException("At least one source role or source employee must be specified")
        if not payload.target_role_id and not payload.target_user_id:
            raise BadRequestException("At least one target role or target employee must be specified")

        # Prevent source == target
        if (
            payload.source_role_id
            and payload.target_role_id
            and payload.source_role_id == payload.target_role_id
            and payload.source_user_id == payload.target_user_id
        ):
            raise BadRequestException("Source and target in a routing rule cannot be identical")

        if (
            payload.source_user_id
            and payload.target_user_id
            and payload.source_user_id == payload.target_user_id
            and payload.source_role_id == payload.target_role_id
        ):
            raise BadRequestException("Source and target employee in a routing rule cannot be identical")

        # Validate source & target roles belong to organization
        if payload.source_role_id:
            await self._verify_role_in_org(organization_id, payload.source_role_id)
        if payload.target_role_id:
            await self._verify_role_in_org(organization_id, payload.target_role_id)

        # Validate source & target users belong to organization
        if payload.source_user_id:
            await self._verify_user_in_org(organization_id, payload.source_user_id)
        if payload.target_user_id:
            await self._verify_user_in_org(organization_id, payload.target_user_id)

        route = TeamAIRoute(
            team_id=team_id,
            organization_id=organization_id,
            source_role_id=payload.source_role_id,
            target_role_id=payload.target_role_id,
            source_user_id=payload.source_user_id,
            target_user_id=payload.target_user_id,
            priority=payload.priority,
            condition=payload.condition,
            description=payload.description,
            enabled=payload.enabled,
        )
        saved_route = await self.repo.create_route(route)
        await self.db.commit()

        # Reload with relationships
        loaded_route = await self.repo.get_route_by_id(saved_route.id, team_id=team_id)
        return self._to_route_response(loaded_route or saved_route)

    async def list_team_routes(
        self,
        organization_id: str,
        team_id: str,
        current_user: CurrentUser,
    ) -> TeamAIRouteListResponse:
        self._verify_org_access(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        routes = await self.repo.list_routes(team_id)
        return TeamAIRouteListResponse(
            routes=[self._to_route_response(r) for r in routes],
            total=len(routes),
        )

    async def update_team_route(
        self,
        organization_id: str,
        team_id: str,
        route_id: str,
        payload: TeamAIRouteUpdate,
        current_user: CurrentUser,
    ) -> TeamAIRouteResponse:
        self._verify_org_admin(organization_id, current_user)

        route = await self.repo.get_route_by_id(route_id, team_id=team_id)
        if not route or route.organization_id != organization_id:
            raise NotFoundException("TeamAIRoute", route_id)

        updated_route = await self.repo.update_route(
            route,
            priority=payload.priority,
            condition=payload.condition,
            description=payload.description,
            enabled=payload.enabled,
        )
        await self.db.commit()
        loaded = await self.repo.get_route_by_id(updated_route.id, team_id=team_id)
        return self._to_route_response(loaded or updated_route)

    async def delete_team_route(
        self,
        organization_id: str,
        team_id: str,
        route_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(organization_id, current_user)

        route = await self.repo.get_route_by_id(route_id, team_id=team_id)
        if not route or route.organization_id != organization_id:
            raise NotFoundException("TeamAIRoute", route_id)

        await self.repo.delete_route(route)
        await self.db.commit()

    # ── Team Knowledge & Memory Boundaries ──────────────────────

    def _to_knowledge_source_response(
        self, source: TeamKnowledgeSource
    ) -> TeamKnowledgeSourceResponse:
        return TeamKnowledgeSourceResponse(
            id=source.id,
            team_id=source.team_id,
            organization_id=source.organization_id,
            name=source.name,
            source_type=source.source_type,
            source_identifier=source.source_identifier,
            description=source.description,
            is_active=source.is_active,
            created_at=source.created_at,
            updated_at=source.updated_at,
        )

    async def get_team_knowledge(
        self,
        organization_id: str,
        team_id: str,
        current_user: CurrentUser,
    ) -> TeamKnowledgeOverviewResponse:
        self._verify_org_access(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        sources = await self.repo.list_knowledge_sources(team_id)
        cfg = team.knowledge_access_config or {}

        return TeamKnowledgeOverviewResponse(
            team_id=team.id,
            shared_knowledge_enabled=cfg.get("shared_knowledge_enabled", True),
            knowledge_scope=cfg.get("knowledge_scope", "TEAM"),
            memory_isolation_level=team.memory_isolation_level or "TEAM_ISOLATED",
            access_rule=cfg.get("access_rule", "TEAM_MEMBERS_ONLY"),
            accessible_categories=cfg.get("accessible_categories", ["TECHNICAL_DOCUMENT", "PROCESS_DOCUMENT"]),
            allow_cross_team_query=cfg.get("allow_cross_team_query", False),
            sources=[self._to_knowledge_source_response(s) for s in sources],
            total_sources=len(sources),
        )

    async def update_team_knowledge_policy(
        self,
        organization_id: str,
        team_id: str,
        payload: TeamKnowledgePolicyUpdate,
        current_user: CurrentUser,
    ) -> TeamKnowledgeOverviewResponse:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        updated_cfg = dict(team.knowledge_access_config or {})
        updated_cfg["shared_knowledge_enabled"] = payload.shared_knowledge_enabled
        updated_cfg["knowledge_scope"] = payload.knowledge_scope
        updated_cfg["access_rule"] = payload.access_rule
        updated_cfg["accessible_categories"] = payload.accessible_categories
        updated_cfg["allow_cross_team_query"] = payload.allow_cross_team_query

        await self.repo.update_team(
            team,
            memory_isolation_level=payload.memory_isolation_level,
            knowledge_access_config=updated_cfg,
        )
        await self.db.commit()

        return await self.get_team_knowledge(organization_id, team_id, current_user)

    async def create_team_knowledge_source(
        self,
        organization_id: str,
        team_id: str,
        payload: TeamKnowledgeSourceCreate,
        current_user: CurrentUser,
    ) -> TeamKnowledgeSourceResponse:
        self._verify_org_admin(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        source = TeamKnowledgeSource(
            team_id=team_id,
            organization_id=organization_id,
            name=payload.name.strip(),
            source_type=payload.source_type,
            source_identifier=payload.source_identifier.strip(),
            description=payload.description.strip() if payload.description else None,
            is_active=payload.is_active,
        )
        saved_source = await self.repo.create_knowledge_source(source)
        await self.db.commit()
        return self._to_knowledge_source_response(saved_source)

    async def update_team_knowledge_source(
        self,
        organization_id: str,
        team_id: str,
        source_id: str,
        payload: TeamKnowledgeSourceUpdate,
        current_user: CurrentUser,
    ) -> TeamKnowledgeSourceResponse:
        self._verify_org_admin(organization_id, current_user)

        source = await self.repo.get_knowledge_source_by_id(source_id, team_id=team_id)
        if not source or source.organization_id != organization_id:
            raise NotFoundException("TeamKnowledgeSource", source_id)

        updated_source = await self.repo.update_knowledge_source(
            source,
            name=payload.name.strip() if payload.name else None,
            source_type=payload.source_type,
            source_identifier=payload.source_identifier.strip() if payload.source_identifier else None,
            description=payload.description.strip() if payload.description else None,
            is_active=payload.is_active,
        )
        await self.db.commit()
        return self._to_knowledge_source_response(updated_source)

    async def delete_team_knowledge_source(
        self,
        organization_id: str,
        team_id: str,
        source_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(organization_id, current_user)

        source = await self.repo.get_knowledge_source_by_id(source_id, team_id=team_id)
        if not source or source.organization_id != organization_id:
            raise NotFoundException("TeamKnowledgeSource", source_id)

        await self.repo.delete_knowledge_source(source)
        await self.db.commit()

    # ── Team Workload & Performance Metrics ─────────────────────

    async def get_team_workload_and_metrics(
        self,
        organization_id: str,
        team_id: str,
        agent_db: AsyncSession,
        current_user: CurrentUser,
    ) -> TeamMetricsOverviewResponse:
        """
        Aggregate squad AI runtime metrics from SQLite (AgentExecution, Evidence, Approvals)
        while honestly reporting task/project workload as unavailable.
        Zero fabricated metrics or mock performance percentages.
        """
        self._verify_org_access(organization_id, current_user)

        team = await self.repo.get_team_by_id(team_id, organization_id=organization_id)
        if not team:
            raise NotFoundException("Team", team_id)

        # 1. Fetch enrolled squad members
        members_data = await self.repo.get_team_members_with_profiles(team_id)
        job_roles_map = await self._get_job_roles_map(organization_id)

        if not members_data:
            return TeamMetricsOverviewResponse(
                team_id=team.id,
                ai_runtime_metrics=TeamAIRuntimeStats(),
                member_runtime_breakdown=[],
                workload_metrics_integrated=False,
                workload_status_message="Workload data unavailable until task/project management integration.",
                member_workloads=[],
                project_velocity_integrated=False,
                project_velocity_message="Project velocity will be available after project/task integration.",
            )

        member_user_ids = [m.user_id for m, _ in members_data]

        # 2. Query AgentGroups and Agents from SQLite
        from app.agentic.models import (
            Agent,
            AgentExecution,
            AgentGroup,
            ApprovalRequest,
            ExecutionEvidence,
            ExecutionStatus,
        )
        from sqlalchemy.orm import selectinload

        stmt = (
            select(AgentGroup)
            .options(selectinload(AgentGroup.agents))
            .where(
                AgentGroup.organization_id == organization_id,
                AgentGroup.employee_id.in_(member_user_ids),
                AgentGroup.status == "ACTIVE",
            )
        )
        res = await agent_db.execute(stmt)
        active_groups = res.scalars().all()

        groups_by_emp_id = {grp.employee_id: grp for grp in active_groups}

        # Collect all agent IDs
        all_agent_ids: List[str] = []
        agent_to_emp_map: dict = {}
        for emp_id, grp in groups_by_emp_id.items():
            for agent in grp.agents or []:
                all_agent_ids.append(agent.id)
                agent_to_emp_map[agent.id] = emp_id

        # 3. Query AgentExecutions from SQLite
        total_execs = 0
        completed_execs = 0
        failed_execs = 0
        running_execs = 0
        verified_evidences = 0
        pending_approvals = 0

        member_exec_stats: dict = {
            emp_id: {"total": 0, "completed": 0, "failed": 0, "running": 0}
            for emp_id in member_user_ids
        }

        if all_agent_ids:
            exec_stmt = select(AgentExecution).where(AgentExecution.agent_id.in_(all_agent_ids))
            exec_res = await agent_db.execute(exec_stmt)
            executions = exec_res.scalars().all()

            exec_ids = [e.id for e in executions]
            total_execs = len(executions)

            for exc in executions:
                emp_id = agent_to_emp_map.get(exc.agent_id)
                if exc.status == ExecutionStatus.COMPLETED:
                    completed_execs += 1
                    if emp_id and emp_id in member_exec_stats:
                        member_exec_stats[emp_id]["completed"] += 1
                elif exc.status == ExecutionStatus.FAILED:
                    failed_execs += 1
                    if emp_id and emp_id in member_exec_stats:
                        member_exec_stats[emp_id]["failed"] += 1
                elif exc.status in (ExecutionStatus.RUNNING, ExecutionStatus.PENDING):
                    running_execs += 1
                    if emp_id and emp_id in member_exec_stats:
                        member_exec_stats[emp_id]["running"] += 1

                if emp_id and emp_id in member_exec_stats:
                    member_exec_stats[emp_id]["total"] += 1

            if exec_ids:
                # Query verified evidence count
                ev_stmt = select(ExecutionEvidence).where(ExecutionEvidence.execution_id.in_(exec_ids))
                ev_res = await agent_db.execute(ev_stmt)
                verified_evidences = len(ev_res.scalars().all())

                # Query pending approval count
                app_stmt = select(ApprovalRequest).where(
                    ApprovalRequest.execution_id.in_(exec_ids),
                    ApprovalRequest.status == "PENDING",
                )
                app_res = await agent_db.execute(app_stmt)
                pending_approvals = len(app_res.scalars().all())

        # 4. Assemble breakdown and workload lists
        runtime_breakdown: List[TeamMemberRuntimeStats] = []
        workload_statuses: List[TeamMemberWorkloadStatus] = []

        for member, user in members_data:
            grp = groups_by_emp_id.get(member.user_id)
            stats = member_exec_stats.get(member.user_id, {"total": 0, "completed": 0, "failed": 0, "running": 0})
            role_name = job_roles_map.get(member.user_id, user.job_title if user else None)

            runtime_breakdown.append(
                TeamMemberRuntimeStats(
                    user_id=member.user_id,
                    name=user.name if user else "Unnamed",
                    role_in_team=member.role_in_team,
                    job_role_name=role_name,
                    agent_group_id=grp.id if grp else None,
                    agent_group_name=grp.name if grp else None,
                    total_agents=len(grp.agents) if (grp and grp.agents) else 0,
                    total_executions=stats["total"],
                    completed_executions=stats["completed"],
                    failed_executions=stats["failed"],
                    running_executions=stats["running"],
                )
            )

            workload_statuses.append(
                TeamMemberWorkloadStatus(
                    user_id=member.user_id,
                    name=user.name if user else "Unnamed",
                    role_in_team=member.role_in_team,
                    job_role_name=role_name,
                    active_tasks=None,
                    in_progress=None,
                    blocked=None,
                    completed=None,
                    is_available=False,
                    status_message="Workload data unavailable",
                )
            )

        return TeamMetricsOverviewResponse(
            team_id=team.id,
            ai_runtime_metrics=TeamAIRuntimeStats(
                total_executions=total_execs,
                completed_executions=completed_execs,
                failed_executions=failed_execs,
                running_executions=running_execs,
                pending_approvals=pending_approvals,
                verified_evidences=verified_evidences,
            ),
            member_runtime_breakdown=runtime_breakdown,
            workload_metrics_integrated=False,
            workload_status_message="Workload data unavailable until task/project management integration.",
            member_workloads=workload_statuses,
            project_velocity_integrated=False,
            project_velocity_message="Project velocity will be available after project/task integration.",
        )
