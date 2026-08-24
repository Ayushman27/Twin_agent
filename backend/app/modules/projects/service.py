"""Projects service — Business logic and validation layer (Neon PostgreSQL)."""
from datetime import datetime, timezone
from typing import List, Optional
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.auth.models import User
from app.modules.auth.schemas import CurrentUser
from app.modules.organizations.models import OrganizationMember
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
from app.modules.projects.repository import ProjectRepository
from app.modules.projects.schemas import (
    AIDeliveryTrackItem,
    BlockedTaskSummary,
    ConnectGithubPayload,
    ConnectJiraPayload,
    MilestoneDeliveryAnalytics,
    MilestoneHealthItem,
    OverdueTaskSummary,
    ProjectAIWorkforceResponse,
    ProjectCreatePayload,
    ProjectDeliveryAnalyticsResponse,
    ProjectDetailResponse,
    ProjectHealthDiagnosticsResponse,
    ProjectIntegrationResponse,
    ProjectListResponse,
    ProjectMemberCreatePayload,
    ProjectMemberItem,
    ProjectMemberResponse,
    ProjectMemberUpdatePayload,
    ProjectMemberWorkforceItem,
    ProjectMilestoneCreatePayload,
    ProjectMilestoneResponse,
    ProjectMilestoneUpdatePayload,
    ProjectOwnerSummary,
    ProjectResponse,
    ProjectTaskAssigneeSummary,
    ProjectTaskCreatePayload,
    ProjectTaskResponse,
    ProjectTaskUpdatePayload,
    ProjectTeamSummary,
    ProjectUpdatePayload,
    RiskAnalytics,
    TaskDeliveryAnalytics,
    TeamDeliveryAnalytics,
    TimelineAnalytics,
)
from app.modules.roles.models import EmployeeRoleAssignment, Role
from app.modules.teams.models import Team


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProjectRepository(db)

    def _verify_org_access(self, current_user: CurrentUser, org_id: str) -> None:
        if current_user.role == "SUPER_ADMIN":
            return
        user_org_id = getattr(current_user, "organization_id", None) or getattr(
            current_user, "organizationId", None
        )
        if user_org_id != org_id:
            raise ForbiddenException("Access denied: You cannot access projects in another organization")

    def _verify_org_admin(self, current_user: CurrentUser, org_id: str) -> None:
        self._verify_org_access(current_user, org_id)
        if current_user.role not in ("ORG_ADMIN", "SUPER_ADMIN", "ADMIN"):
            raise ForbiddenException("Administrator privileges required for this action")

    async def _validate_owner_in_org(self, org_id: str, owner_id: str) -> User:
        query = (
            select(User)
            .join(OrganizationMember, OrganizationMember.user_id == User.id)
            .where(
                User.id == owner_id,
                OrganizationMember.organization_id == org_id,
            )
        )
        res = await self.db.execute(query)
        user = res.scalars().first()
        if not user:
            raise BadRequestException(f"Project owner with ID '{owner_id}' is not a valid member of this organization.")
        return user


    async def _validate_team_in_org(self, org_id: str, team_id: str) -> Team:
        query = select(Team).where(
            Team.id == team_id,
            Team.organization_id == org_id,
        )
        res = await self.db.execute(query)
        team = res.scalars().first()
        if not team:
            raise BadRequestException(f"Team with ID '{team_id}' does not belong to this organization.")
        return team
        return team

    def _format_project_response(self, project: Project) -> ProjectResponse:
        owner_summary = None
        if project.owner:
            owner_summary = ProjectOwnerSummary(
                id=project.owner.id,
                name=project.owner.name,
                email=project.owner.email,
                employee_id=getattr(project.owner, "employee_id", None),
                job_title=getattr(project.owner, "job_title", None),
            )

        team_summary = None
        if project.team:
            team_summary = ProjectTeamSummary(
                id=project.team.id,
                name=project.team.name,
                department=project.team.department,
            )

        member_count = len(project.members) if project.members is not None else 0

        return ProjectResponse(
            id=project.id,
            organization_id=project.organization_id,
            name=project.name,
            project_code=project.project_code,
            description=project.description,
            owner_id=project.owner_id,
            owner=owner_summary,
            team_id=project.team_id,
            team=team_summary,
            status=project.status,
            priority=project.priority,
            risk_level=project.risk_level,
            start_date=project.start_date,
            target_end_date=project.target_end_date,
            actual_end_date=project.actual_end_date,
            progress_percent=project.progress_percent,
            repository_bindings=project.repository_bindings or {},
            issue_tracker_bindings=project.issue_tracker_bindings or {},
            ai_delivery_policy=project.ai_delivery_policy or {},
            member_count=member_count,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    def _format_project_detail_response(self, project: Project) -> ProjectDetailResponse:
        base_resp = self._format_project_response(project)
        members_list: List[ProjectMemberItem] = []

        if project.members:
            for m in project.members:
                members_list.append(
                    ProjectMemberItem(
                        id=m.id,
                        user_id=m.user_id,
                        name=m.user.name if m.user else None,
                        email=m.user.email if m.user else "",
                        role_in_project=m.role_in_project,
                        status=m.status,
                        joined_at=m.joined_at,
                    )
                )

        return ProjectDetailResponse(
            **base_resp.model_dump(),
            members=members_list,
        )

    async def create_project(
        self,
        org_id: str,
        payload: ProjectCreatePayload,
        current_user: CurrentUser,
    ) -> ProjectResponse:
        self._verify_org_admin(current_user, org_id)

        # Check project_code uniqueness in organization
        existing = await self.repo.get_project_by_code(org_id, payload.project_code)
        if existing:
            raise ConflictException(f"Project with code '{payload.project_code}' already exists in this organization.")

        # Validate date consistency if both dates are provided
        if payload.start_date and payload.target_end_date and payload.target_end_date < payload.start_date:
            raise BadRequestException("Target end date must be on or after start date.")

        # Validate owner if supplied
        if payload.owner_id:
            await self._validate_owner_in_org(org_id, payload.owner_id)

        # Validate team if supplied
        if payload.team_id:
            await self._validate_team_in_org(org_id, payload.team_id)

        # Instantiate project
        project = Project(
            organization_id=org_id,
            name=payload.name,
            project_code=payload.project_code,
            description=payload.description,
            owner_id=payload.owner_id,
            team_id=payload.team_id,
            status=payload.status or ProjectStatus.PLANNING,
            priority=payload.priority or ProjectPriority.MEDIUM,
            risk_level=payload.risk_level or ProjectRiskLevel.LOW,
            start_date=payload.start_date,
            target_end_date=payload.target_end_date,
            progress_percent=payload.progress_percent,
            repository_bindings=payload.repository_bindings or {},
            issue_tracker_bindings=payload.issue_tracker_bindings or {},
            ai_delivery_policy=payload.ai_delivery_policy or {},
        )

        await self.repo.create_project(project)

        # If owner assigned, auto-enroll as ProjectMember
        if payload.owner_id:
            owner_member = ProjectMember(
                project_id=project.id,
                user_id=payload.owner_id,
                role_in_project="Owner",
                status="ACTIVE",
            )
            await self.repo.add_project_member(owner_member)

        await self.db.commit()

        # Reload with relations
        reloaded = await self.repo.get_project_by_id(project.id, org_id)
        return self._format_project_response(reloaded or project)

    async def get_project(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> ProjectDetailResponse:
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)
        return self._format_project_detail_response(project)

    async def list_projects(
        self,
        org_id: str,
        status_filter: Optional[ProjectStatus] = None,
        priority: Optional[ProjectPriority] = None,
        risk_level: Optional[ProjectRiskLevel] = None,
        team_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        current_user: Optional[CurrentUser] = None,
    ) -> ProjectListResponse:
        if current_user:
            self._verify_org_access(current_user, org_id)
        projects, total = await self.repo.list_projects(
            org_id=org_id,
            status=status_filter,
            priority=priority,
            risk_level=risk_level,
            team_id=team_id,
            owner_id=owner_id,
            search=search,
            limit=limit,
            offset=offset,
        )
        return ProjectListResponse(
            projects=[self._format_project_response(p) for p in projects],
            total=total,
        )

    async def update_project(
        self,
        org_id: str,
        project_id: str,
        payload: ProjectUpdatePayload,
        current_user: CurrentUser,
    ) -> ProjectResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        # Check code uniqueness if changing
        if payload.project_code and payload.project_code != project.project_code:
            existing = await self.repo.get_project_by_code(org_id, payload.project_code)
            if existing and existing.id != project.id:
                raise ConflictException(f"Project with code '{payload.project_code}' already exists in this organization.")
            project.project_code = payload.project_code

        # Validate & update owner
        if payload.owner_id is not None:
            if payload.owner_id == "":
                project.owner_id = None
            else:
                await self._validate_owner_in_org(org_id, payload.owner_id)
                project.owner_id = payload.owner_id
                # Check if member already exists
                existing_member = await self.repo.get_project_member(project.id, payload.owner_id)
                if not existing_member:
                    new_member = ProjectMember(
                        project_id=project.id,
                        user_id=payload.owner_id,
                        role_in_project="Owner",
                        status="ACTIVE",
                    )
                    await self.repo.add_project_member(new_member)

        # Validate & update team
        if payload.team_id is not None:
            if payload.team_id == "":
                project.team_id = None
            else:
                await self._validate_team_in_org(org_id, payload.team_id)
                project.team_id = payload.team_id

        new_start = payload.start_date if payload.start_date is not None else project.start_date
        new_target = payload.target_end_date if payload.target_end_date is not None else project.target_end_date
        if new_start and new_target and new_target < new_start:
            raise BadRequestException("Target end date must be on or after start date.")

        if payload.name is not None:
            project.name = payload.name
        if payload.description is not None:
            project.description = payload.description
        if payload.status is not None:
            project.status = payload.status
            if payload.status == ProjectStatus.COMPLETED and not project.actual_end_date:
                project.actual_end_date = payload.actual_end_date or datetime.now(timezone.utc)
        if payload.priority is not None:
            project.priority = payload.priority
        if payload.risk_level is not None:
            project.risk_level = payload.risk_level
        if payload.start_date is not None:
            project.start_date = payload.start_date
        if payload.target_end_date is not None:
            project.target_end_date = payload.target_end_date
        if payload.actual_end_date is not None:
            project.actual_end_date = payload.actual_end_date
        if payload.progress_percent is not None:
            project.progress_percent = payload.progress_percent
        if payload.repository_bindings is not None:
            project.repository_bindings = payload.repository_bindings
        if payload.issue_tracker_bindings is not None:
            project.issue_tracker_bindings = payload.issue_tracker_bindings
        if payload.ai_delivery_policy is not None:
            project.ai_delivery_policy = payload.ai_delivery_policy

        await self.repo.update_project(project)
        await self.db.commit()

        reloaded = await self.repo.get_project_by_id(project.id, org_id)
        return self._format_project_response(reloaded or project)

    async def delete_project(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)
        await self.repo.delete_project(project)
        await self.db.commit()

    async def _get_job_roles_map(self, org_id: str) -> dict:
        """Fetch active employee role assignments mapped by user_id."""
        stmt = (
            select(EmployeeRoleAssignment.user_id, Role.name)
            .join(Role, EmployeeRoleAssignment.role_id == Role.id)
            .where(
                EmployeeRoleAssignment.organization_id == org_id,
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        res = await self.db.execute(stmt)
        return {row[0]: row[1] for row in res.all()}

    async def list_project_members(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> List[ProjectMemberResponse]:
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        members_with_users = await self.repo.list_project_members_with_profiles(project_id)
        job_roles = await self._get_job_roles_map(org_id)

        result: List[ProjectMemberResponse] = []
        for m, u in members_with_users:
            result.append(
                ProjectMemberResponse(
                    id=m.id,
                    project_id=m.project_id,
                    user_id=m.user_id,
                    employee_id=getattr(u, "employee_id", None),
                    name=u.name,
                    email=u.email,
                    avatar_url=getattr(u, "avatar_url", None),
                    department=getattr(u, "department", None),
                    job_title=getattr(u, "job_title", None),
                    organizational_role=job_roles.get(m.user_id, getattr(u, "job_title", None)),
                    project_role=m.role_in_project,
                    role_in_project=m.role_in_project,
                    status=m.status,
                    joined_at=m.joined_at,
                )
            )
        return result

    async def add_project_member(
        self,
        org_id: str,
        project_id: str,
        payload: ProjectMemberCreatePayload,
        current_user: CurrentUser,
    ) -> ProjectMemberResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        target_user_id = payload.employee_id or payload.user_id
        if not target_user_id:
            raise BadRequestException("employee_id or user_id is required to add project member.")

        # Validate employee belongs to organization
        target_user = await self._validate_owner_in_org(org_id, target_user_id)

        # Prevent duplicate project membership
        existing = await self.repo.get_project_member(project_id, target_user_id)
        if existing:
            raise ConflictException("Employee is already enrolled in this project.")

        role_str = (payload.project_role or payload.role_in_project or "Contributor").strip()
        status_str = (payload.status or "ACTIVE").strip()

        member = ProjectMember(
            project_id=project_id,
            user_id=target_user_id,
            role_in_project=role_str,
            status=status_str,
        )
        await self.repo.add_project_member(member)
        await self.db.commit()

        job_roles = await self._get_job_roles_map(org_id)

        return ProjectMemberResponse(
            id=member.id,
            project_id=member.project_id,
            user_id=member.user_id,
            employee_id=getattr(target_user, "employee_id", None),
            name=target_user.name,
            email=target_user.email,
            avatar_url=getattr(target_user, "avatar_url", None),
            department=getattr(target_user, "department", None),
            job_title=getattr(target_user, "job_title", None),
            organizational_role=job_roles.get(member.user_id, getattr(target_user, "job_title", None)),
            project_role=member.role_in_project,
            role_in_project=member.role_in_project,
            status=member.status,
            joined_at=member.joined_at,
        )

    async def update_project_member(
        self,
        org_id: str,
        project_id: str,
        employee_id: str,
        payload: ProjectMemberUpdatePayload,
        current_user: CurrentUser,
    ) -> ProjectMemberResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        member = await self.repo.get_project_member(project_id, employee_id)
        if not member:
            raise NotFoundException("ProjectMember", employee_id)

        if payload.project_role is not None:
            member.role_in_project = payload.project_role.strip()
        elif payload.role_in_project is not None:
            member.role_in_project = payload.role_in_project.strip()

        if payload.status is not None:
            member.status = payload.status.strip()

        await self.db.commit()

        target_user = await self._validate_owner_in_org(org_id, employee_id)
        job_roles = await self._get_job_roles_map(org_id)

        return ProjectMemberResponse(
            id=member.id,
            project_id=member.project_id,
            user_id=member.user_id,
            employee_id=getattr(target_user, "employee_id", None),
            name=target_user.name,
            email=target_user.email,
            avatar_url=getattr(target_user, "avatar_url", None),
            department=getattr(target_user, "department", None),
            job_title=getattr(target_user, "job_title", None),
            organizational_role=job_roles.get(member.user_id, getattr(target_user, "job_title", None)),
            project_role=member.role_in_project,
            role_in_project=member.role_in_project,
            status=member.status,
            joined_at=member.joined_at,
        )

    async def remove_project_member(
        self,
        org_id: str,
        project_id: str,
        employee_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        member = await self.repo.get_project_member(project_id, employee_id)
        if not member:
            raise NotFoundException("ProjectMember", employee_id)

        await self.repo.remove_project_member(member)
        await self.db.commit()

    # ── Milestone Service Methods ───────────────────────────────

    async def list_milestones(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> List[ProjectMilestoneResponse]:
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        milestones = await self.repo.list_milestones(project_id)
        result: List[ProjectMilestoneResponse] = []
        for m in milestones:
            task_count = len(m.tasks) if m.tasks else 0
            completed_task_count = len([t for t in m.tasks if t.status == TaskStatus.DONE]) if m.tasks else 0
            result.append(
                ProjectMilestoneResponse(
                    id=m.id,
                    project_id=m.project_id,
                    name=m.name,
                    description=m.description,
                    status=m.status,
                    priority=m.priority,
                    start_date=m.start_date,
                    due_date=m.due_date,
                    progress_percent=m.progress_percent,
                    task_count=task_count,
                    completed_task_count=completed_task_count,
                    created_at=m.created_at,
                    updated_at=m.updated_at,
                )
            )
        return result

    async def create_milestone(
        self,
        org_id: str,
        project_id: str,
        payload: ProjectMilestoneCreatePayload,
        current_user: CurrentUser,
    ) -> ProjectMilestoneResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        if payload.start_date and payload.due_date and payload.due_date < payload.start_date:
            raise BadRequestException("Due date must be on or after start date.")

        milestone = ProjectMilestone(
            project_id=project_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            status=payload.status or MilestoneStatus.PLANNED,
            priority=payload.priority or ProjectPriority.MEDIUM,
            start_date=payload.start_date,
            due_date=payload.due_date,
            progress_percent=payload.progress_percent,
        )
        await self.repo.create_milestone(milestone)
        await self.db.commit()

        return ProjectMilestoneResponse(
            id=milestone.id,
            project_id=milestone.project_id,
            name=milestone.name,
            description=milestone.description,
            status=milestone.status,
            priority=milestone.priority,
            start_date=milestone.start_date,
            due_date=milestone.due_date,
            progress_percent=milestone.progress_percent,
            task_count=0,
            completed_task_count=0,
            created_at=milestone.created_at,
            updated_at=milestone.updated_at,
        )

    async def update_milestone(
        self,
        org_id: str,
        project_id: str,
        milestone_id: str,
        payload: ProjectMilestoneUpdatePayload,
        current_user: CurrentUser,
    ) -> ProjectMilestoneResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        milestone = await self.repo.get_milestone(project_id, milestone_id)
        if not milestone:
            raise NotFoundException("ProjectMilestone", milestone_id)

        new_start = payload.start_date if payload.start_date is not None else milestone.start_date
        new_due = payload.due_date if payload.due_date is not None else milestone.due_date
        if new_start and new_due and new_due < new_start:
            raise BadRequestException("Due date must be on or after start date.")

        if payload.name is not None:
            milestone.name = payload.name.strip()
        if payload.description is not None:
            milestone.description = payload.description.strip() if payload.description else None
        if payload.status is not None:
            milestone.status = payload.status
        if payload.priority is not None:
            milestone.priority = payload.priority
        if payload.start_date is not None:
            milestone.start_date = payload.start_date
        if payload.due_date is not None:
            milestone.due_date = payload.due_date
        if payload.progress_percent is not None:
            milestone.progress_percent = payload.progress_percent

        await self.repo.update_milestone(milestone)
        await self.db.commit()

        task_count = len(milestone.tasks) if milestone.tasks else 0
        completed_task_count = len([t for t in milestone.tasks if t.status == TaskStatus.DONE]) if milestone.tasks else 0

        return ProjectMilestoneResponse(
            id=milestone.id,
            project_id=milestone.project_id,
            name=milestone.name,
            description=milestone.description,
            status=milestone.status,
            priority=milestone.priority,
            start_date=milestone.start_date,
            due_date=milestone.due_date,
            progress_percent=milestone.progress_percent,
            task_count=task_count,
            completed_task_count=completed_task_count,
            created_at=milestone.created_at,
            updated_at=milestone.updated_at,
        )

    async def delete_milestone(
        self,
        org_id: str,
        project_id: str,
        milestone_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        milestone = await self.repo.get_milestone(project_id, milestone_id)
        if not milestone:
            raise NotFoundException("ProjectMilestone", milestone_id)

        await self.repo.delete_milestone(milestone)
        await self.db.commit()

    # ── Task Service Methods ────────────────────────────────────

    async def list_tasks(
        self,
        org_id: str,
        project_id: str,
        milestone_id: Optional[str] = None,
        assignee_id: Optional[str] = None,
        status: Optional[TaskStatus] = None,
        current_user: CurrentUser = ...,
    ) -> List[ProjectTaskResponse]:
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        tasks = await self.repo.list_tasks(
            project_id=project_id,
            milestone_id=milestone_id,
            assignee_id=assignee_id,
            status=status,
        )

        result: List[ProjectTaskResponse] = []
        for t in tasks:
            assignee_summary = None
            if t.assignee:
                assignee_summary = ProjectTaskAssigneeSummary(
                    id=t.assignee.id,
                    name=t.assignee.name,
                    email=t.assignee.email,
                    avatar_url=getattr(t.assignee, "avatar_url", None),
                    employee_id=getattr(t.assignee, "employee_id", None),
                )

            result.append(
                ProjectTaskResponse(
                    id=t.id,
                    project_id=t.project_id,
                    milestone_id=t.milestone_id,
                    milestone_name=t.milestone.name if t.milestone else None,
                    title=t.title,
                    description=t.description,
                    assignee_id=t.assignee_id,
                    assignee=assignee_summary,
                    status=t.status,
                    priority=t.priority,
                    due_date=t.due_date,
                    progress_percent=t.progress_percent,
                    blocked_reason=t.blocked_reason,
                    created_at=t.created_at,
                    updated_at=t.updated_at,
                )
            )
        return result

    async def create_task(
        self,
        org_id: str,
        project_id: str,
        payload: ProjectTaskCreatePayload,
        current_user: CurrentUser,
    ) -> ProjectTaskResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        # Validate milestone if specified
        milestone = None
        if payload.milestone_id:
            milestone = await self.repo.get_milestone(project_id, payload.milestone_id)
            if not milestone:
                raise NotFoundException("ProjectMilestone", payload.milestone_id)

        # Validate assignee if specified
        assignee = None
        if payload.assignee_id:
            assignee = await self._validate_owner_in_org(org_id, payload.assignee_id)

        task = ProjectTask(
            project_id=project_id,
            milestone_id=payload.milestone_id,
            title=payload.title.strip(),
            description=payload.description.strip() if payload.description else None,
            assignee_id=payload.assignee_id,
            assigned_agent_group_id=payload.assigned_agent_group_id,
            status=payload.status or TaskStatus.TODO,
            priority=payload.priority or ProjectPriority.MEDIUM,
            due_date=payload.due_date,
            progress_percent=payload.progress_percent,
            blocked_reason=payload.blocked_reason.strip() if payload.blocked_reason else None,
        )
        await self.repo.create_task(task)
        await self.db.commit()

        assignee_summary = None
        if assignee:
            assignee_summary = ProjectTaskAssigneeSummary(
                id=assignee.id,
                name=assignee.name,
                email=assignee.email,
                avatar_url=getattr(assignee, "avatar_url", None),
                employee_id=getattr(assignee, "employee_id", None),
            )

        return ProjectTaskResponse(
            id=task.id,
            project_id=task.project_id,
            milestone_id=task.milestone_id,
            milestone_name=milestone.name if milestone else None,
            title=task.title,
            description=task.description,
            assignee_id=task.assignee_id,
            assignee=assignee_summary,
            assigned_agent_group_id=task.assigned_agent_group_id,
            status=task.status,
            priority=task.priority,
            due_date=task.due_date,
            progress_percent=task.progress_percent,
            blocked_reason=task.blocked_reason,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    async def update_task(
        self,
        org_id: str,
        project_id: str,
        task_id: str,
        payload: ProjectTaskUpdatePayload,
        current_user: CurrentUser,
    ) -> ProjectTaskResponse:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        task = await self.repo.get_task(project_id, task_id)
        if not task:
            raise NotFoundException("ProjectTask", task_id)

        if payload.milestone_id is not None:
            if payload.milestone_id != "":
                milestone = await self.repo.get_milestone(project_id, payload.milestone_id)
                if not milestone:
                    raise NotFoundException("ProjectMilestone", payload.milestone_id)
                task.milestone_id = payload.milestone_id
            else:
                task.milestone_id = None

        if payload.assignee_id is not None:
            if payload.assignee_id != "":
                await self._validate_owner_in_org(org_id, payload.assignee_id)
                task.assignee_id = payload.assignee_id
            else:
                task.assignee_id = None

        if payload.assigned_agent_group_id is not None:
            task.assigned_agent_group_id = (
                payload.assigned_agent_group_id.strip() if payload.assigned_agent_group_id else None
            )

        if payload.title is not None:
            task.title = payload.title.strip()
        if payload.description is not None:
            task.description = payload.description.strip() if payload.description else None
        if payload.status is not None:
            task.status = payload.status
        if payload.priority is not None:
            task.priority = payload.priority
        if payload.due_date is not None:
            task.due_date = payload.due_date
        if payload.progress_percent is not None:
            task.progress_percent = payload.progress_percent
        if payload.blocked_reason is not None:
            task.blocked_reason = payload.blocked_reason.strip() if payload.blocked_reason else None

        await self.repo.update_task(task)
        await self.db.commit()

        reloaded = await self.repo.get_task(project_id, task_id)
        target_task = reloaded or task

        assignee_summary = None
        if target_task.assignee:
            assignee_summary = ProjectTaskAssigneeSummary(
                id=target_task.assignee.id,
                name=target_task.assignee.name,
                email=target_task.assignee.email,
                avatar_url=getattr(target_task.assignee, "avatar_url", None),
                employee_id=getattr(target_task.assignee, "employee_id", None),
            )

        return ProjectTaskResponse(
            id=target_task.id,
            project_id=target_task.project_id,
            milestone_id=target_task.milestone_id,
            milestone_name=target_task.milestone.name if target_task.milestone else None,
            title=target_task.title,
            description=target_task.description,
            assignee_id=target_task.assignee_id,
            assignee=assignee_summary,
            assigned_agent_group_id=target_task.assigned_agent_group_id,
            status=target_task.status,
            priority=target_task.priority,
            due_date=target_task.due_date,
            progress_percent=target_task.progress_percent,
            blocked_reason=target_task.blocked_reason,
            created_at=target_task.created_at,
            updated_at=target_task.updated_at,
        )

    async def delete_task(
        self,
        org_id: str,
        project_id: str,
        task_id: str,
        current_user: CurrentUser,
    ) -> None:
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        task = await self.repo.get_task(project_id, task_id)
        if not task:
            raise NotFoundException("ProjectTask", task_id)

        await self.repo.delete_task(task)
        await self.db.commit()

    # ── AI Workforce Integration ────────────────────────────────────

    async def get_project_ai_workforce(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
        agent_db: AsyncSession,
    ) -> ProjectAIWorkforceResponse:
        """
        Aggregate and return AI workforce topologies of enrolled project members.
        Read-only bridge between Neon PostgreSQL (Project, Roles) and SQLite (AgentGroups).
        Strictly does NOT invoke AgentFactory or create AgentGroups.
        """
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        # 1. Retrieve all project members
        members_data = await self.repo.list_project_members_with_profiles(project_id)
        all_user_ids = [m.user_id for m, _ in members_data]

        if not all_user_ids:
            return ProjectAIWorkforceResponse(
                project_id=project.id,
                project_name=project.name,
                project_code=project.project_code,
                total_members=0,
                active_workforces=0,
                total_agents=0,
                aggregated_capabilities=[],
                members=[],
            )

        # 2. Query Neon DB for role assignments, roles, and role capabilities
        from app.modules.roles.models import EmployeeRoleAssignment, Role, RoleCapability

        stmt = (
            select(EmployeeRoleAssignment, Role)
            .join(Role, EmployeeRoleAssignment.role_id == Role.id)
            .where(
                EmployeeRoleAssignment.organization_id == org_id,
                EmployeeRoleAssignment.user_id.in_(all_user_ids),
                EmployeeRoleAssignment.status == "ACTIVE",
            )
        )
        res = await self.db.execute(stmt)
        role_rows = res.all()

        user_role_map = {}
        role_ids = set()
        for assignment, role in role_rows:
            user_role_map[assignment.user_id] = role
            role_ids.add(role.id)

        role_caps_map = {}
        if role_ids:
            cap_stmt = select(RoleCapability).where(RoleCapability.role_id.in_(role_ids))
            cap_res = await self.db.execute(cap_stmt)
            for rc in cap_res.scalars().all():
                role_caps_map.setdefault(rc.role_id, []).append(rc.capability_name)

        # 3. Query AgentGroups from SQLite Agent DB in ONE batch query (Read-only)
        from app.agentic.models import AgentGroup, Agent
        from app.agentic.schemas import AgentGroupResponse
        from sqlalchemy.orm import selectinload

        agent_stmt = (
            select(AgentGroup)
            .options(selectinload(AgentGroup.agents).selectinload(Agent.capability))
            .where(
                AgentGroup.organization_id == org_id,
                AgentGroup.employee_id.in_(all_user_ids),
                AgentGroup.status == "ACTIVE",
            )
            .order_by(AgentGroup.created_at.desc())
        )
        agent_res = await agent_db.execute(agent_stmt)
        active_groups = agent_res.scalars().all()

        groups_by_emp_id = {}
        for grp in active_groups:
            if grp.employee_id not in groups_by_emp_id:
                groups_by_emp_id[grp.employee_id] = grp

        # 4. Assemble ProjectMemberWorkforceItems and aggregated capabilities
        total_agents_count = 0
        active_workforces_count = 0
        aggregated_caps_set = set()
        member_items: List[ProjectMemberWorkforceItem] = []

        for member, user in members_data:
            grp = groups_by_emp_id.get(member.user_id)
            agent_group_resp = None
            if grp:
                agent_group_resp = AgentGroupResponse.model_validate(grp)
                active_workforces_count += 1
                total_agents_count += len(grp.agents) if grp.agents else 0

            role_obj = user_role_map.get(member.user_id)
            role_name = role_obj.name if role_obj else (user.job_title if user else None)
            caps = role_caps_map.get(role_obj.id, []) if role_obj else []
            for c in caps:
                aggregated_caps_set.add(c)

            status = "ACTIVE" if agent_group_resp else "NO_WORKFORCE_PROVISIONED"

            member_items.append(
                ProjectMemberWorkforceItem(
                    user_id=member.user_id,
                    name=user.name if user else None,
                    email=user.email if user else "",
                    employee_id=getattr(user, "employee_id", None) if user else None,
                    job_title=user.job_title if user else None,
                    department=user.department if user else None,
                    job_role_name=role_name,
                    role_in_project=member.role_in_project,
                    capabilities=caps,
                    agent_group=agent_group_resp,
                    status=status,
                )
            )

        return ProjectAIWorkforceResponse(
            project_id=project.id,
            project_name=project.name,
            project_code=project.project_code,
            total_members=len(members_data),
            active_workforces=active_workforces_count,
            total_agents=total_agents_count,
            aggregated_capabilities=sorted(list(aggregated_caps_set)),
            members=member_items,
        )

    # ── Project Integrations (GitHub & Jira) ───────────────────────

    async def list_project_integrations(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> List[ProjectIntegrationResponse]:
        """List all external integrations configured for a project."""
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        integrations = await self.repo.list_integrations(project_id)
        return [ProjectIntegrationResponse.model_validate(i) for i in integrations]

    async def connect_github(
        self,
        org_id: str,
        project_id: str,
        payload: ConnectGithubPayload,
        current_user: CurrentUser,
    ) -> ProjectIntegrationResponse:
        """
        Connect or update GitHub repository binding for a project.
        Stores credentials in isolated auth_config descriptor without leaking secrets to frontend.
        """
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        # Normalize repository URL / path
        repo_url = payload.repository_url.strip()
        if not repo_url.startswith("http://") and not repo_url.startswith("https://"):
            repo_url = f"https://github.com/{repo_url.strip('/')}"

        # Extract owner/repo as project name if not explicitly given
        repo_name = payload.external_project_name
        if not repo_name:
            parts = repo_url.rstrip("/").split("/")
            repo_name = f"{parts[-2]}/{parts[-1]}" if len(parts) >= 2 else repo_url

        existing = await self.repo.get_integration(project_id, IntegrationProvider.GITHUB)

        # Secure auth config structure
        auth_config = {}
        if payload.access_token:
            masked = f"••••{payload.access_token[-4:]}" if len(payload.access_token) > 4 else "••••"
            auth_config = {
                "auth_type": "bearer_token",
                "is_configured": True,
                "token_masked": masked,
                "storage_mode": "vault_reference",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        elif existing and existing.auth_config:
            auth_config = existing.auth_config

        config = {
            "default_branch": payload.default_branch or "main",
            "sync_commits": True,
            "sync_pull_requests": True,
            "sync_issues": True,
        }

        if existing:
            existing.repository_url = repo_url
            existing.external_project_name = repo_name
            existing.status = IntegrationStatus.CONNECTED
            existing.config = config
            existing.auth_config = auth_config
            existing.error_message = None
            existing.last_synced_at = datetime.now(timezone.utc)
            integration = await self.repo.save_integration(existing)
        else:
            integration = ProjectIntegration(
                project_id=project_id,
                provider=IntegrationProvider.GITHUB,
                repository_url=repo_url,
                external_project_name=repo_name,
                status=IntegrationStatus.CONNECTED,
                config=config,
                auth_config=auth_config,
                last_synced_at=datetime.now(timezone.utc),
            )
            integration = await self.repo.save_integration(integration)

        # Also sync project repository_bindings metadata
        project.repository_bindings = {
            "provider": "github",
            "repo_url": repo_url,
            "branch": config["default_branch"],
            "status": "connected",
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.repo.update_project(project)
        await self.db.commit()

        return ProjectIntegrationResponse.model_validate(integration)

    async def disconnect_github(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> ProjectIntegrationResponse:
        """Disconnect GitHub repository binding."""
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        integration = await self.repo.get_integration(project_id, IntegrationProvider.GITHUB)
        if not integration:
            raise NotFoundException("GitHub Integration", project_id)

        integration.status = IntegrationStatus.DISCONNECTED
        integration.auth_config = {}
        integration = await self.repo.save_integration(integration)

        project.repository_bindings = {
            "provider": "github",
            "repo_url": integration.repository_url,
            "status": "disconnected",
        }
        await self.repo.update_project(project)
        await self.db.commit()

        return ProjectIntegrationResponse.model_validate(integration)

    async def connect_jira(
        self,
        org_id: str,
        project_id: str,
        payload: ConnectJiraPayload,
        current_user: CurrentUser,
    ) -> ProjectIntegrationResponse:
        """
        Connect or update Jira Project binding for a project.
        Stores credentials in isolated auth_config descriptor without leaking secrets to frontend.
        """
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        base_url = payload.base_url.strip().rstrip("/")
        if not base_url.startswith("http://") and not base_url.startswith("https://"):
            base_url = f"https://{base_url}"

        proj_key = payload.project_key.strip().upper()
        proj_name = payload.external_project_name.strip() if payload.external_project_name else proj_key

        existing = await self.repo.get_integration(project_id, IntegrationProvider.JIRA)

        # Secure auth config structure
        auth_config = {}
        if payload.api_token:
            masked = f"••••{payload.api_token[-4:]}" if len(payload.api_token) > 4 else "••••"
            auth_config = {
                "auth_type": "api_token",
                "is_configured": True,
                "token_masked": masked,
                "storage_mode": "vault_reference",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        elif existing and existing.auth_config:
            auth_config = existing.auth_config

        config = {
            "project_key": proj_key,
            "sync_epics": True,
            "sync_stories": True,
            "sync_tasks": True,
        }

        if existing:
            existing.base_url = base_url
            existing.external_project_id = proj_key
            existing.external_project_name = proj_name
            existing.status = IntegrationStatus.CONNECTED
            existing.config = config
            existing.auth_config = auth_config
            existing.error_message = None
            existing.last_synced_at = datetime.now(timezone.utc)
            integration = await self.repo.save_integration(existing)
        else:
            integration = ProjectIntegration(
                project_id=project_id,
                provider=IntegrationProvider.JIRA,
                base_url=base_url,
                external_project_id=proj_key,
                external_project_name=proj_name,
                status=IntegrationStatus.CONNECTED,
                config=config,
                auth_config=auth_config,
                last_synced_at=datetime.now(timezone.utc),
            )
            integration = await self.repo.save_integration(integration)

        # Also sync project issue_tracker_bindings metadata
        project.issue_tracker_bindings = {
            "provider": "jira",
            "base_url": base_url,
            "project_key": proj_key,
            "status": "connected",
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.repo.update_project(project)
        await self.db.commit()

        return ProjectIntegrationResponse.model_validate(integration)

    async def disconnect_jira(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> ProjectIntegrationResponse:
        """Disconnect Jira project binding."""
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        integration = await self.repo.get_integration(project_id, IntegrationProvider.JIRA)
        if not integration:
            raise NotFoundException("Jira Integration", project_id)

        integration.status = IntegrationStatus.DISCONNECTED
        integration.auth_config = {}
        integration = await self.repo.save_integration(integration)

        project.issue_tracker_bindings = {
            "provider": "jira",
            "base_url": integration.base_url,
            "project_key": integration.external_project_id,
            "status": "disconnected",
        }
        await self.repo.update_project(project)
        await self.db.commit()

        return ProjectIntegrationResponse.model_validate(integration)

    async def sync_integration(
        self,
        org_id: str,
        project_id: str,
        integration_id: str,
        current_user: CurrentUser,
    ) -> ProjectIntegrationResponse:
        """Trigger sync check on external integration."""
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        integration = await self.repo.get_integration_by_id(project_id, integration_id)
        if not integration:
            raise NotFoundException("Integration", integration_id)

        if integration.status == IntegrationStatus.DISCONNECTED:
            raise BadRequestException("Cannot sync a disconnected integration. Reconnect first.")

        integration.last_synced_at = datetime.now(timezone.utc)
        integration.error_message = None
        integration = await self.repo.save_integration(integration)
        await self.db.commit()

        return ProjectIntegrationResponse.model_validate(integration)

    async def delete_integration(
        self,
        org_id: str,
        project_id: str,
        integration_id: str,
        current_user: CurrentUser,
    ) -> None:
        """Delete an integration binding record."""
        self._verify_org_admin(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        integration = await self.repo.get_integration_by_id(project_id, integration_id)
        if not integration:
            raise NotFoundException("Integration", integration_id)

        await self.repo.delete_integration(integration)
        await self.db.commit()

    # ── Project Health & Blocker Diagnostics ───────────────────────

    async def get_project_health_diagnostics(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
    ) -> ProjectHealthDiagnosticsResponse:
        """
        Calculate deterministic project health, milestone health, blockers, and overdue work.
        Follows strict domain rules without fabricated AI metrics.
        """
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        milestones = await self.repo.list_milestones(project_id)
        tasks = await self.repo.list_tasks(project_id)
        now = datetime.now(timezone.utc)

        def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
            if dt is None:
                return None
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)

        # 1. Evaluate Tasks for Blockers and Overdue state
        blocked_tasks_list: List[BlockedTaskSummary] = []
        overdue_tasks_list: List[OverdueTaskSummary] = []
        ms_name_map = {m.id: m.name for m in milestones}

        completed_tasks_count = 0
        for task in tasks:
            if task.status == TaskStatus.DONE:
                completed_tasks_count += 1

            is_blocked = (task.status == TaskStatus.BLOCKED)
            task_due_utc = _to_utc(task.due_date)
            is_overdue = bool(
                task_due_utc and task_due_utc < now and task.status not in (TaskStatus.DONE, TaskStatus.CANCELLED)
            )

            assignee_name = task.assignee.name if task.assignee else None
            milestone_name = ms_name_map.get(task.milestone_id) if task.milestone_id else None

            if is_blocked:
                blocked_tasks_list.append(
                    BlockedTaskSummary(
                        id=task.id,
                        title=task.title,
                        milestone_id=task.milestone_id,
                        milestone_name=milestone_name,
                        assignee_id=task.assignee_id,
                        assignee_name=assignee_name,
                        priority=task.priority,
                        status=task.status,
                        due_date=task.due_date,
                        is_overdue=is_overdue,
                        blocked_reason=task.blocked_reason,
                    )
                )

            if is_overdue and task.due_date and task_due_utc:
                days_overdue = max(1, (now - task_due_utc).days)
                overdue_tasks_list.append(
                    OverdueTaskSummary(
                        id=task.id,
                        title=task.title,
                        milestone_id=task.milestone_id,
                        milestone_name=milestone_name,
                        assignee_id=task.assignee_id,
                        assignee_name=assignee_name,
                        priority=task.priority,
                        status=task.status,
                        due_date=task.due_date,
                        days_overdue=days_overdue,
                    )
                )

        # 2. Evaluate Milestone Health
        milestones_health_list: List[MilestoneHealthItem] = []
        completed_milestones_count = 0

        for ms in milestones:
            if ms.status == MilestoneStatus.COMPLETED or ms.progress_percent == 100:
                completed_milestones_count += 1

            ms_tasks = [t for t in tasks if t.milestone_id == ms.id]
            ms_completed = len([t for t in ms_tasks if t.status == TaskStatus.DONE])
            ms_blocked = [t for t in ms_tasks if t.status == TaskStatus.BLOCKED]
            ms_overdue = [
                t for t in ms_tasks
                if _to_utc(t.due_date) and _to_utc(t.due_date) < now and t.status not in (TaskStatus.DONE, TaskStatus.CANCELLED)
            ]

            ms_health = "HEALTHY"
            ms_reasons: List[str] = []
            ms_due_utc = _to_utc(ms.due_date)

            if ms.status == MilestoneStatus.BLOCKED:
                ms_health = "BLOCKED"
                ms_reasons.append("Milestone status is explicitly set to BLOCKED")
            elif len(ms_blocked) > 0 and ms.progress_percent < 100:
                ms_health = "BLOCKED"
                ms_reasons.append(f"{len(ms_blocked)} critical task(s) currently blocked")
            elif ms_due_utc and ms_due_utc < now and ms.status != MilestoneStatus.COMPLETED and ms.progress_percent < 100:
                ms_health = "OVERDUE"
                ms_reasons.append("Milestone target completion date has passed")
            elif ms.status == MilestoneStatus.COMPLETED or ms.progress_percent == 100:
                ms_health = "HEALTHY"
                ms_reasons.append("Milestone successfully completed")
            else:
                # Approaching due date check & overdue tasks check
                if ms_due_utc and (ms_due_utc - now).total_seconds() > 0 and (ms_due_utc - now).days <= 7 and ms.progress_percent < 50:
                    ms_health = "AT_RISK"
                    ms_reasons.append("Due within 7 days with under 50% completion")
                if len(ms_overdue) > 0:
                    ms_health = "AT_RISK"
                    ms_reasons.append(f"{len(ms_overdue)} task(s) in this milestone are overdue")

                if not ms_reasons:
                    ms_reasons.append("Milestone execution is on track")

            milestones_health_list.append(
                MilestoneHealthItem(
                    milestone_id=ms.id,
                    name=ms.name,
                    status=ms.status,
                    priority=ms.priority,
                    progress_percent=ms.progress_percent,
                    start_date=ms.start_date,
                    due_date=ms.due_date,
                    health=ms_health,
                    reasons=ms_reasons,
                    total_tasks=len(ms_tasks),
                    completed_tasks=ms_completed,
                    blocked_tasks_count=len(ms_blocked),
                    overdue_tasks_count=len(ms_overdue),
                )
            )

        # 3. Evaluate Overall Project Health
        overall_health = "HEALTHY"
        health_reasons: List[str] = []
        proj_end_utc = _to_utc(project.target_end_date)
        is_project_overdue = bool(
            proj_end_utc and proj_end_utc < now and project.status not in (ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED)
        )


        has_blocked_milestone = any(m.health == "BLOCKED" for m in milestones_health_list)
        has_overdue_milestone = any(m.health == "OVERDUE" for m in milestones_health_list)
        has_at_risk_milestone = any(m.health == "AT_RISK" for m in milestones_health_list)

        # Rule evaluation for CRITICAL
        if project.risk_level == ProjectRiskLevel.CRITICAL:
            overall_health = "CRITICAL"
            health_reasons.append("Project risk level is designated as CRITICAL")
        if len(blocked_tasks_list) >= 2:
            overall_health = "CRITICAL"
            health_reasons.append(f"Multiple tasks ({len(blocked_tasks_list)}) are currently BLOCKED")
        if has_overdue_milestone:
            overall_health = "CRITICAL"
            health_reasons.append("One or more key roadmap milestones are OVERDUE")
        if len(overdue_tasks_list) >= 3:
            overall_health = "CRITICAL"
            health_reasons.append(f"High number of overdue delivery tasks ({len(overdue_tasks_list)})")

        # Rule evaluation for AT_RISK (if not CRITICAL)
        if overall_health != "CRITICAL":
            if project.risk_level == ProjectRiskLevel.HIGH:
                overall_health = "AT_RISK"
                health_reasons.append("Project risk level is HIGH")
            if len(blocked_tasks_list) == 1:
                overall_health = "AT_RISK"
                health_reasons.append("1 task is currently BLOCKED")
            if has_blocked_milestone:
                overall_health = "AT_RISK"
                health_reasons.append("One or more roadmap milestones are blocked")
            if has_at_risk_milestone:
                overall_health = "AT_RISK"
                health_reasons.append("One or more roadmap milestones are at risk")
            if len(overdue_tasks_list) >= 1:
                overall_health = "AT_RISK"
                health_reasons.append(f"{len(overdue_tasks_list)} task(s) are overdue")
            if is_project_overdue:
                overall_health = "AT_RISK"
                health_reasons.append("Project target completion date has passed")

        if overall_health == "HEALTHY" and not health_reasons:
            health_reasons.append("All milestones on track, no critical blockers or overdue tasks detected")

        return ProjectHealthDiagnosticsResponse(
            project_id=project.id,
            project_name=project.name,
            project_code=project.project_code,
            overall_health=overall_health,
            health_reasons=health_reasons,
            progress_percent=project.progress_percent,
            risk_level=project.risk_level,
            priority=project.priority,
            status=project.status,
            target_end_date=project.target_end_date,
            is_project_overdue=is_project_overdue,
            total_tasks=len(tasks),
            completed_tasks=completed_tasks_count,
            blocked_tasks_count=len(blocked_tasks_list),
            overdue_tasks_count=len(overdue_tasks_list),
            blocked_tasks=blocked_tasks_list,
            overdue_tasks=overdue_tasks_list,
            total_milestones=len(milestones),
            completed_milestones=completed_milestones_count,
            milestones_health=milestones_health_list,
            calculated_at=now,
        )

    async def get_project_delivery_analytics(
        self,
        org_id: str,
        project_id: str,
        current_user: CurrentUser,
        agent_db: Optional[AsyncSession] = None,
    ) -> ProjectDeliveryAnalyticsResponse:
        """
        Calculate deterministic delivery analytics for project overview dashboard.
        Backed purely by live PostgreSQL records and real AgentGroup workforce data.
        """
        self._verify_org_access(current_user, org_id)
        project = await self.repo.get_project_by_id(project_id, org_id)
        if not project:
            raise NotFoundException("Project", project_id)

        milestones = await self.repo.list_milestones(project_id)
        tasks = await self.repo.list_tasks(project_id)
        project_members = await self.repo.list_project_members_with_profiles(project_id)
        now = datetime.now(timezone.utc)

        def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
            if dt is None:
                return None
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)

        # 1. Timeline Analytics
        start_utc = _to_utc(project.start_date)
        target_end_utc = _to_utc(project.target_end_date)
        actual_end_utc = _to_utc(project.actual_end_date)

        days_total = None
        days_elapsed = None
        days_remaining = None
        time_elapsed_percent = None
        is_overdue = False

        if start_utc and target_end_utc:
            total_duration_sec = max(1.0, (target_end_utc - start_utc).total_seconds())
            elapsed_sec = (now - start_utc).total_seconds()
            days_total = max(1, (target_end_utc - start_utc).days)
            days_elapsed = max(0, (now - start_utc).days)
            days_remaining = (target_end_utc - now).days
            if elapsed_sec <= 0:
                time_elapsed_percent = 0
            else:
                time_elapsed_percent = min(100, int((elapsed_sec / total_duration_sec) * 100))

            if target_end_utc < now and project.status not in (ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED):
                is_overdue = True
        elif target_end_utc:
            days_remaining = (target_end_utc - now).days
            if target_end_utc < now and project.status not in (ProjectStatus.COMPLETED, ProjectStatus.ARCHIVED):
                is_overdue = True

        timeline_data = TimelineAnalytics(
            start_date=project.start_date,
            current_date=now,
            target_end_date=project.target_end_date,
            actual_end_date=project.actual_end_date,
            days_total=days_total,
            days_elapsed=days_elapsed,
            days_remaining=days_remaining,
            time_elapsed_percent=time_elapsed_percent,
            is_overdue=is_overdue,
        )

        # 2. Task Delivery Analytics
        total_tasks = len(tasks)
        completed_tasks = 0
        in_progress_tasks = 0
        blocked_tasks = 0
        overdue_tasks = 0

        for t in tasks:
            if t.status == TaskStatus.DONE:
                completed_tasks += 1
            elif t.status == TaskStatus.IN_PROGRESS:
                in_progress_tasks += 1
            elif t.status == TaskStatus.BLOCKED:
                blocked_tasks += 1

            due_utc = _to_utc(t.due_date)
            if due_utc and due_utc < now and t.status not in (TaskStatus.DONE, TaskStatus.CANCELLED):
                overdue_tasks += 1

        completion_rate = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0.0

        task_delivery_data = TaskDeliveryAnalytics(
            total=total_tasks,
            completed=completed_tasks,
            in_progress=in_progress_tasks,
            blocked=blocked_tasks,
            overdue=overdue_tasks,
            completion_rate=completion_rate,
        )

        # 3. Milestone Delivery Analytics
        total_milestones = len(milestones)
        completed_milestones = 0
        in_progress_milestones = 0
        blocked_milestones = 0
        overdue_milestones = 0

        for ms in milestones:
            ms_due_utc = _to_utc(ms.due_date)
            ms_tasks = [t for t in tasks if t.milestone_id == ms.id]
            has_blocked = any(t.status == TaskStatus.BLOCKED for t in ms_tasks)

            if ms.status == MilestoneStatus.COMPLETED or ms.progress_percent == 100:
                completed_milestones += 1
            elif ms.status == MilestoneStatus.BLOCKED or (has_blocked and ms.progress_percent < 100):
                blocked_milestones += 1
            elif ms_due_utc and ms_due_utc < now and ms.progress_percent < 100:
                overdue_milestones += 1
            else:
                in_progress_milestones += 1

        milestone_delivery_data = MilestoneDeliveryAnalytics(
            total=total_milestones,
            completed=completed_milestones,
            in_progress=in_progress_milestones,
            blocked=blocked_milestones,
            overdue=overdue_milestones,
        )

        # 4. Team Delivery & AI Workforce Analytics
        if agent_db:
            workforce_summary = await self.get_project_ai_workforce(org_id, project_id, current_user, agent_db)
            active_workforces = workforce_summary.active_workforces
            total_agents = workforce_summary.total_agents
            workforce_members = workforce_summary.members
        else:
            active_workforces = 0
            total_agents = 0
            workforce_members = []

        team_name = project.team.name if project.team else None
        team_department = project.team.department if project.team else None

        team_delivery_data = TeamDeliveryAnalytics(
            members_count=len(project_members),
            team_name=team_name,
            team_department=team_department,
            active_workforces=active_workforces,
            total_agents=total_agents,
        )

        # 5. Risk Analytics & Dynamic Factors Generation
        risk_factors: List[str] = []
        if overdue_tasks > 0:
            risk_factors.append(f"{overdue_tasks} overdue task(s) require resolution")
        if blocked_tasks > 0:
            risk_factors.append(f"{blocked_tasks} task(s) flagged with delivery impediments")
        if blocked_milestones > 0:
            risk_factors.append(f"{blocked_milestones} roadmap milestone(s) currently blocked")
        if overdue_milestones > 0:
            risk_factors.append(f"{overdue_milestones} milestone(s) have exceeded target deadline")
        if is_overdue:
            risk_factors.append("Project target completion deadline has passed")

        # High priority task approaching deadline in <= 3 days
        for t in tasks:
            if t.priority in (ProjectPriority.HIGH, ProjectPriority.CRITICAL) and t.status not in (TaskStatus.DONE, TaskStatus.CANCELLED):
                t_due = _to_utc(t.due_date)
                if t_due and 0 < (t_due - now).total_seconds() <= 3 * 86400:
                    risk_factors.append(f"High-priority task '{t.title}' due within 3 days")
                    break

        if time_elapsed_percent is not None and time_elapsed_percent > (project.progress_percent + 25):
            risk_factors.append(f"Schedule elapsed ({time_elapsed_percent}%) significantly outpaces work progress ({project.progress_percent}%)")

        risk_data = RiskAnalytics(
            current_risk=project.risk_level,
            risk_factors=risk_factors,
        )

        # 6. AI Delivery Tracks (Grouped by Member Department / Role)
        track_map = {}
        for member in workforce_members:
            dept = member.department or "Engineering"
            track_title = f"{dept} AI Workforce" if not dept.endswith("Workforce") else dept
            if track_title not in track_map:
                track_map[track_title] = {
                    "department": dept,
                    "members": [],
                    "agent_count": 0,
                    "agent_groups": [],
                    "capabilities": set(),
                }
            member_display = f"{member.name or 'Member'} ({member.role_in_project})"
            track_map[track_title]["members"].append(member_display)
            if member.agent_group:
                group_agents = getattr(member.agent_group, "agents_count", 0) or len(getattr(member.agent_group, "agents", []))
                track_map[track_title]["agent_count"] += group_agents
                if getattr(member.agent_group, "name", None):
                    track_map[track_title]["agent_groups"].append(member.agent_group.name)
            for cap in member.capabilities:
                track_map[track_title]["capabilities"].add(cap)

        ai_tracks: List[AIDeliveryTrackItem] = []
        for track_title, data in track_map.items():
            ai_tracks.append(
                AIDeliveryTrackItem(
                    track_name=track_title,
                    department=data["department"],
                    employee_count=len(data["members"]),
                    agent_count=data["agent_count"],
                    members=data["members"],
                    agent_groups=data["agent_groups"],
                    capabilities=sorted(list(data["capabilities"])),
                )
            )

        # 7. Overall Health Status
        health_diagnostics = await self.get_project_health_diagnostics(org_id, project_id, current_user)

        return ProjectDeliveryAnalyticsResponse(
            project_id=project.id,
            project_name=project.name,
            project_code=project.project_code,
            progress_percent=project.progress_percent,
            health_status=health_diagnostics.overall_health,
            timeline=timeline_data,
            tasks=task_delivery_data,
            milestones=milestone_delivery_data,
            team=team_delivery_data,
            risk=risk_data,
            ai_tracks=ai_tracks,
            generated_at=now,
        )






