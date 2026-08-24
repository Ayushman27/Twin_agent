"""Projects repository — Database access layer for Neon PostgreSQL."""
from typing import Any, List, Optional, Tuple
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.projects.models import (
    IntegrationProvider,
    IntegrationStatus,
    MilestoneStatus,
    Project,
    ProjectIntegration,
    ProjectMember,
    ProjectMilestone,
    ProjectPriority,
    ProjectRiskLevel,
    ProjectStatus,
    ProjectTask,
    TaskStatus,
)


class ProjectRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_project(self, project: Project) -> Project:
        self.db.add(project)
        await self.db.flush()
        return project

    async def get_project_by_id(self, project_id: str, org_id: Optional[str] = None) -> Optional[Project]:
        query = (
            select(Project)
            .options(
                selectinload(Project.owner),
                selectinload(Project.team),
                selectinload(Project.members).selectinload(ProjectMember.user),
            )
            .where(Project.id == project_id)
        )
        if org_id:
            query = query.where(Project.organization_id == org_id)
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_project_by_code(self, org_id: str, project_code: str) -> Optional[Project]:
        query = (
            select(Project)
            .where(
                Project.organization_id == org_id,
                func.upper(Project.project_code) == project_code.upper().strip(),
            )
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_projects(
        self,
        org_id: str,
        status: Optional[ProjectStatus] = None,
        priority: Optional[ProjectPriority] = None,
        risk_level: Optional[ProjectRiskLevel] = None,
        team_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Project], int]:
        base_filter = [Project.organization_id == org_id]

        if status:
            base_filter.append(Project.status == status)
        if priority:
            base_filter.append(Project.priority == priority)
        if risk_level:
            base_filter.append(Project.risk_level == risk_level)
        if team_id:
            base_filter.append(Project.team_id == team_id)
        if owner_id:
            base_filter.append(Project.owner_id == owner_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            base_filter.append(
                or_(
                    Project.name.ilike(term),
                    Project.project_code.ilike(term),
                    Project.description.ilike(term),
                )
            )

        # Count total
        count_query = select(func.count(Project.id)).where(*base_filter)
        count_res = await self.db.execute(count_query)
        total = count_res.scalar_one()

        # Fetch projects
        fetch_query = (
            select(Project)
            .options(
                selectinload(Project.owner),
                selectinload(Project.team),
                selectinload(Project.members).selectinload(ProjectMember.user),
            )
            .where(*base_filter)
            .order_by(Project.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        fetch_res = await self.db.execute(fetch_query)
        projects = list(fetch_res.scalars().all())

        return projects, total

    async def update_project(self, project: Project) -> Project:
        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project: Project) -> None:
        await self.db.delete(project)
        await self.db.flush()

    async def add_project_member(self, member: ProjectMember) -> ProjectMember:
        self.db.add(member)
        await self.db.flush()
        return member

    async def get_project_member(self, project_id: str, user_id: str) -> Optional[ProjectMember]:
        query = select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_project_members_with_profiles(self, project_id: str) -> List[Tuple[ProjectMember, Any]]:
        from app.modules.auth.models import User
        query = (
            select(ProjectMember, User)
            .join(User, ProjectMember.user_id == User.id)
            .where(ProjectMember.project_id == project_id)
            .order_by(ProjectMember.joined_at.asc())
        )
        res = await self.db.execute(query)
        return list(res.all())

    async def remove_project_member(self, member: ProjectMember) -> None:
        await self.db.delete(member)
        await self.db.flush()

    # ── Milestone Repository Methods ────────────────────────────

    async def create_milestone(self, milestone: ProjectMilestone) -> ProjectMilestone:
        self.db.add(milestone)
        await self.db.flush()
        return milestone

    async def get_milestone(self, project_id: str, milestone_id: str) -> Optional[ProjectMilestone]:
        query = (
            select(ProjectMilestone)
            .options(selectinload(ProjectMilestone.tasks))
            .where(
                ProjectMilestone.project_id == project_id,
                ProjectMilestone.id == milestone_id,
            )
        )
        res = await self.db.execute(query)
        return res.scalars().first()

    async def list_milestones(self, project_id: str) -> List[ProjectMilestone]:
        query = (
            select(ProjectMilestone)
            .options(selectinload(ProjectMilestone.tasks))
            .where(ProjectMilestone.project_id == project_id)
            .order_by(ProjectMilestone.due_date.asc().nullslast(), ProjectMilestone.created_at.asc())
        )
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def update_milestone(self, milestone: ProjectMilestone) -> ProjectMilestone:
        await self.db.flush()
        await self.db.refresh(milestone)
        return milestone

    async def delete_milestone(self, milestone: ProjectMilestone) -> None:
        await self.db.delete(milestone)
        await self.db.flush()

    # ── Task Repository Methods ─────────────────────────────────

    async def create_task(self, task: ProjectTask) -> ProjectTask:
        self.db.add(task)
        await self.db.flush()
        return task

    async def get_task(self, project_id: str, task_id: str) -> Optional[ProjectTask]:
        query = (
            select(ProjectTask)
            .options(
                selectinload(ProjectTask.assignee),
                selectinload(ProjectTask.milestone),
            )
            .where(
                ProjectTask.project_id == project_id,
                ProjectTask.id == task_id,
            )
        )
        res = await self.db.execute(query)
        return res.scalars().first()

    async def list_tasks(
        self,
        project_id: str,
        milestone_id: Optional[str] = None,
        assignee_id: Optional[str] = None,
        status: Optional[TaskStatus] = None,
    ) -> List[ProjectTask]:
        query = (
            select(ProjectTask)
            .options(
                selectinload(ProjectTask.assignee),
                selectinload(ProjectTask.milestone),
            )
            .where(ProjectTask.project_id == project_id)
        )
        if milestone_id:
            query = query.where(ProjectTask.milestone_id == milestone_id)
        if assignee_id:
            query = query.where(ProjectTask.assignee_id == assignee_id)
        if status:
            query = query.where(ProjectTask.status == status)

        query = query.order_by(ProjectTask.due_date.asc().nullslast(), ProjectTask.created_at.asc())
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def update_task(self, task: ProjectTask) -> ProjectTask:
        await self.db.flush()
        await self.db.refresh(task)
        return task

    async def delete_task(self, task: ProjectTask) -> None:
        await self.db.delete(task)
        await self.db.flush()

    # ── Project Integrations ───────────────────────────────────────
    async def get_integration(
        self, project_id: str, provider: IntegrationProvider
    ) -> Optional[ProjectIntegration]:
        query = select(ProjectIntegration).where(
            ProjectIntegration.project_id == project_id,
            ProjectIntegration.provider == provider,
        )
        res = await self.db.execute(query)
        return res.scalars().first()

    async def get_integration_by_id(
        self, project_id: str, integration_id: str
    ) -> Optional[ProjectIntegration]:
        query = select(ProjectIntegration).where(
            ProjectIntegration.project_id == project_id,
            ProjectIntegration.id == integration_id,
        )
        res = await self.db.execute(query)
        return res.scalars().first()

    async def list_integrations(self, project_id: str) -> List[ProjectIntegration]:
        query = (
            select(ProjectIntegration)
            .where(ProjectIntegration.project_id == project_id)
            .order_by(ProjectIntegration.provider.asc())
        )
        res = await self.db.execute(query)
        return list(res.scalars().all())

    async def save_integration(self, integration: ProjectIntegration) -> ProjectIntegration:
        self.db.add(integration)
        await self.db.flush()
        await self.db.refresh(integration)
        return integration

    async def delete_integration(self, integration: ProjectIntegration) -> None:
        await self.db.delete(integration)
        await self.db.flush()


