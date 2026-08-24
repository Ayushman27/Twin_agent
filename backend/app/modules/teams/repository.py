"""Teams module — Database repository layer."""
from typing import Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.teams.models import (
    Team,
    TeamAIRoute,
    TeamKnowledgeSource,
    TeamMember,
    TeamMemberStatus,
    TeamStatus,
)


class TeamRepository:
    """Neon PostgreSQL repository for Teams and TeamMembers."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_team(self, team: Team) -> Team:
        self.db.add(team)
        await self.db.flush()
        await self.db.refresh(team)
        return team

    async def get_team_by_id(
        self, team_id: str, organization_id: Optional[str] = None
    ) -> Optional[Team]:
        stmt = (
            select(Team)
            .options(
                selectinload(Team.team_lead),
                selectinload(Team.members).selectinload(TeamMember.user),
            )
            .where(Team.id == team_id)
        )
        if organization_id:
            stmt = stmt.where(Team.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_team_by_name(self, organization_id: str, name: str) -> Optional[Team]:
        stmt = select(Team).where(
            Team.organization_id == organization_id,
            func.lower(Team.name) == name.strip().lower(),
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_teams(
        self,
        organization_id: str,
        department: Optional[str] = None,
        status: Optional[TeamStatus] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Team]:
        stmt = (
            select(Team)
            .options(selectinload(Team.team_lead))
            .where(Team.organization_id == organization_id)
        )
        if department:
            stmt = stmt.where(func.lower(Team.department) == department.strip().lower())
        if status:
            stmt = stmt.where(Team.status == status)
        if search:
            q = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                func.lower(Team.name).like(q)
                | func.lower(Team.description).like(q)
                | func.lower(Team.department).like(q)
            )
        stmt = stmt.order_by(Team.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_teams(
        self,
        organization_id: str,
        department: Optional[str] = None,
        status: Optional[TeamStatus] = None,
        search: Optional[str] = None,
    ) -> int:
        stmt = select(func.count(Team.id)).where(Team.organization_id == organization_id)
        if department:
            stmt = stmt.where(func.lower(Team.department) == department.strip().lower())
        if status:
            stmt = stmt.where(Team.status == status)
        if search:
            q = f"%{search.strip().lower()}%"
            stmt = stmt.where(
                func.lower(Team.name).like(q)
                | func.lower(Team.description).like(q)
                | func.lower(Team.department).like(q)
            )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def update_team(self, team: Team, **kwargs) -> Team:
        for k, v in kwargs.items():
            if hasattr(team, k) and v is not None:
                setattr(team, k, v)
        await self.db.flush()
        await self.db.refresh(team)
        return team

    async def delete_team(self, team: Team) -> None:
        await self.db.delete(team)
        await self.db.flush()

    async def get_member_counts(self, organization_id: str) -> Dict[str, int]:
        """Aggregate active member counts grouped by team_id."""
        stmt = (
            select(TeamMember.team_id, func.count(TeamMember.id))
            .join(Team, TeamMember.team_id == Team.id)
            .where(
                Team.organization_id == organization_id,
                TeamMember.status == TeamMemberStatus.ACTIVE,
            )
            .group_by(TeamMember.team_id)
        )
        result = await self.db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    # ── Team Members ──────────────────────────────────────────

    async def add_member(
        self,
        team_id: str,
        user_id: str,
        role_in_team: str = "Contributor",
        status: TeamMemberStatus = TeamMemberStatus.ACTIVE,
    ) -> TeamMember:
        member = TeamMember(
            team_id=team_id,
            user_id=user_id,
            role_in_team=role_in_team,
            status=status,
        )
        self.db.add(member)
        await self.db.flush()
        await self.db.refresh(member)
        return member

    async def get_team_member(self, team_id: str, user_id: str) -> Optional[TeamMember]:
        stmt = (
            select(TeamMember)
            .options(selectinload(TeamMember.user))
            .where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_team_members_with_profiles(
        self, team_id: str
    ) -> List[Tuple[TeamMember, User]]:
        stmt = (
            select(TeamMember, User)
            .join(User, TeamMember.user_id == User.id)
            .where(TeamMember.team_id == team_id)
            .order_by(TeamMember.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.all())

    async def remove_member(self, member: TeamMember) -> None:
        await self.db.delete(member)
        await self.db.flush()

    # ── Team AI Mesh Routes ───────────────────────────────────

    async def create_route(self, route: TeamAIRoute) -> TeamAIRoute:
        self.db.add(route)
        await self.db.flush()
        await self.db.refresh(route)
        return route

    async def get_route_by_id(
        self, route_id: str, team_id: Optional[str] = None
    ) -> Optional[TeamAIRoute]:
        stmt = (
            select(TeamAIRoute)
            .options(
                selectinload(TeamAIRoute.source_role),
                selectinload(TeamAIRoute.target_role),
                selectinload(TeamAIRoute.source_user),
                selectinload(TeamAIRoute.target_user),
            )
            .where(TeamAIRoute.id == route_id)
        )
        if team_id:
            stmt = stmt.where(TeamAIRoute.team_id == team_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_routes(self, team_id: str) -> List[TeamAIRoute]:
        stmt = (
            select(TeamAIRoute)
            .options(
                selectinload(TeamAIRoute.source_role),
                selectinload(TeamAIRoute.target_role),
                selectinload(TeamAIRoute.source_user),
                selectinload(TeamAIRoute.target_user),
            )
            .where(TeamAIRoute.team_id == team_id)
            .order_by(TeamAIRoute.priority.asc(), TeamAIRoute.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_route(self, route: TeamAIRoute, **kwargs) -> TeamAIRoute:
        for k, v in kwargs.items():
            if hasattr(route, k) and v is not None:
                setattr(route, k, v)
        await self.db.flush()
        await self.db.refresh(route)
        return route

    async def delete_route(self, route: TeamAIRoute) -> None:
        await self.db.delete(route)
        await self.db.flush()

    # ── Team Knowledge Sources ────────────────────────────────

    async def create_knowledge_source(
        self, source: TeamKnowledgeSource
    ) -> TeamKnowledgeSource:
        self.db.add(source)
        await self.db.flush()
        await self.db.refresh(source)
        return source

    async def get_knowledge_source_by_id(
        self, source_id: str, team_id: Optional[str] = None
    ) -> Optional[TeamKnowledgeSource]:
        stmt = select(TeamKnowledgeSource).where(TeamKnowledgeSource.id == source_id)
        if team_id:
            stmt = stmt.where(TeamKnowledgeSource.team_id == team_id)
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_knowledge_sources(
        self, team_id: str
    ) -> List[TeamKnowledgeSource]:
        stmt = (
            select(TeamKnowledgeSource)
            .where(TeamKnowledgeSource.team_id == team_id)
            .order_by(TeamKnowledgeSource.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_knowledge_source(
        self, source: TeamKnowledgeSource, **kwargs
    ) -> TeamKnowledgeSource:
        for k, v in kwargs.items():
            if hasattr(source, k) and v is not None:
                setattr(source, k, v)
        await self.db.flush()
        await self.db.refresh(source)
        return source

    async def delete_knowledge_source(
        self, source: TeamKnowledgeSource
    ) -> None:
        await self.db.delete(source)
        await self.db.flush()
