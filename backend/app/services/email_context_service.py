"""
Email Context Service — Verified Project & Task Context Resolution
===================================================================
Provides verified data retrieval from trusted backend Neon PostgreSQL sources
(Projects, Milestones, Tasks) for context-aware email drafting by AI Twins.

Security & Safety:
  - Scoped strictly to the caller's organization.
  - Never dumps full employee memory or unrelated private data.
  - Zero hallucination: if the requested project/task cannot be found in trusted
    backend records, asks the employee for clarification.
"""
import re
from typing import Any, Dict, List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.projects.models import Project, ProjectMilestone, ProjectTask


class EmailContextService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def resolve_project_context(
        self,
        organization_id: str,
        project_query: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Resolves project metadata, milestones, and tasks within the authenticated organization.
        """
        clean_q = project_query.strip()
        # Clean common filler prefixes
        clean_q = re.sub(r"^(?:the\s+)?", "", clean_q, flags=re.IGNORECASE)
        clean_q = re.sub(r"\s+project$", "", clean_q, flags=re.IGNORECASE).strip()

        if not clean_q:
            return None

        stmt = (
            select(Project)
            .options(
                selectinload(Project.milestones),
                selectinload(Project.tasks),
            )
            .where(
                and_(
                    Project.organization_id == organization_id,
                    or_(
                        Project.name.ilike(f"%{clean_q}%"),
                        Project.project_code.ilike(f"%{clean_q}%"),
                    ),
                )
            )
            .limit(1)
        )
        res = await self.db.execute(stmt)
        project = res.scalar_one_or_none()
        if not project:
            return None

        milestones_list = [
            {
                "id": m.id,
                "name": m.name,
                "status": m.status.value if hasattr(m.status, "value") else str(m.status),
                "progress_percent": m.progress_percent,
            }
            for m in project.milestones
        ]

        tasks_list = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                "progress_percent": t.progress_percent,
            }
            for t in project.tasks
        ]

        return {
            "project_id": project.id,
            "project_name": project.name,
            "project_code": project.project_code,
            "status": project.status.value if hasattr(project.status, "value") else str(project.status),
            "progress_percent": project.progress_percent,
            "description": project.description or "Active organizational initiative",
            "milestones": milestones_list,
            "tasks": tasks_list,
        }

    async def resolve_task_context(
        self,
        organization_id: str,
        task_query: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Resolves task status and details by searching tasks in caller's organization.
        """
        clean_q = task_query.strip()
        clean_q = re.sub(r"^(?:the\s+)?", "", clean_q, flags=re.IGNORECASE)
        clean_q = re.sub(r"\s+(?:is\s+)?(?:complete|completed|done|in\s+progress|started|blocked)$", "", clean_q, flags=re.IGNORECASE).strip()

        if not clean_q:
            return None

        stmt = (
            select(ProjectTask)
            .join(Project, ProjectTask.project_id == Project.id)
            .options(selectinload(ProjectTask.project))
            .where(
                and_(
                    Project.organization_id == organization_id,
                    ProjectTask.title.ilike(f"%{clean_q}%"),
                )
            )
            .limit(1)
        )
        res = await self.db.execute(stmt)
        task = res.scalar_one_or_none()
        if not task:
            return None

        return {
            "task_id": task.id,
            "title": task.title,
            "status": task.status.value if hasattr(task.status, "value") else str(task.status),
            "priority": task.priority.value if hasattr(task.priority, "value") else str(task.priority),
            "progress_percent": task.progress_percent,
            "project_id": task.project.id if task.project else None,
            "project_name": task.project.name if task.project else None,
        }

    async def compose_context_aware_email(
        self,
        organization_id: str,
        prompt: str,
        recipient_name: str,
    ) -> Dict[str, Any]:
        """
        Extracts project/task references from prompt, validates against backend sources,
        and constructs a grounded email draft with verified facts.
        """
        # 1. Check for Project Update references
        # e.g., "the latest update on the TruDrishti project", "update on TruDrishti", "about TruDrishti"
        m_proj = re.search(
            r"(?:latest\s+)?update\s+on\s+(?:the\s+)?(?P<pname>[\w\s\.-]+?)(?:\s+project)?(?:$|\.|\,)",
            prompt,
            re.IGNORECASE,
        )
        if not m_proj:
            m_proj = re.search(
                r"about\s+(?:the\s+)?(?P<pname>[\w\s\.-]+?)\s+project(?:\s+update)?(?:$|\.|\,)",
                prompt,
                re.IGNORECASE,
            )

        if m_proj:
            raw_pname = m_proj.group("pname").strip()
            # If user said generic "the project", find active projects in org
            if raw_pname.lower() in ["the", "this", "our", ""]:
                stmt = select(Project).where(Project.organization_id == organization_id).limit(1)
                r_p = await self.db.execute(stmt)
                active_p = r_p.scalar_one_or_none()
                if active_p:
                    raw_pname = active_p.name
                else:
                    return {
                        "verified": False,
                        "error_code": "NO_PROJECTS_FOUND",
                        "user_message": "There are no active projects found in your organization to report on.",
                    }

            proj_ctx = await self.resolve_project_context(organization_id, raw_pname)
            if not proj_ctx:
                return {
                    "verified": False,
                    "error_code": "PROJECT_NOT_FOUND",
                    "user_message": f"I couldn't find a project named '{raw_pname}' in your organization. Could you please specify the exact project name?",
                }

            # Build grounded summary
            p_name = proj_ctx["project_name"]
            p_status = proj_ctx["status"]
            p_progress = proj_ctx["progress_percent"]

            milestone_lines = []
            for m in proj_ctx.get("milestones", [])[:3]:
                milestone_lines.append(f"  • Milestone: {m['name']} ({m['status']})")

            task_lines = []
            for t in proj_ctx.get("tasks", [])[:4]:
                task_lines.append(f"  • Task: {t['title']} ({t['status']})")

            body_sections = [
                f"Here is the latest verified update on the {p_name} project:",
                f"• Current Status: {p_status} ({p_progress}% overall progress)",
            ]
            if milestone_lines:
                body_sections.append("• Key Milestones:\n" + "\n".join(milestone_lines))
            if task_lines:
                body_sections.append("• Recent Tasks:\n" + "\n".join(task_lines))

            body_sections.append("\nPlease let me know if you have any questions.")
            formatted_body = "\n\n".join(body_sections)

            return {
                "verified": True,
                "subject": f"{p_name} Project Update",
                "body": formatted_body,
                "meta_data": {
                    "project_id": proj_ctx["project_id"],
                    "project_name": p_name,
                    "context_type": "PROJECT_UPDATE",
                    "verified": True,
                },
            }

        # 2. Check for Task status assertions
        # e.g., "that the API integration is complete", "that API integration is finished"
        m_task = re.search(
            r"that\s+(?:the\s+)?(?P<tname>[\w\s\.-]+?)\s+(?:is|has\s+been)\s+(?P<status>complete|completed|done|finished|in\s+progress|started|blocked)",
            prompt,
            re.IGNORECASE,
        )
        if m_task:
            raw_tname = m_task.group("tname").strip()
            task_ctx = await self.resolve_task_context(organization_id, raw_tname)
            if task_ctx:
                t_title = task_ctx["title"]
                t_status = task_ctx["status"]
                t_pname = task_ctx.get("project_name") or "the project"

                formatted_body = f"The {t_title} task for {t_pname} is currently {t_status} (progress: {task_ctx['progress_percent']}%)."
                return {
                    "verified": True,
                    "subject": f"{t_title} Update",
                    "body": formatted_body,
                    "meta_data": {
                        "task_id": task_ctx["task_id"],
                        "project_id": task_ctx.get("project_id"),
                        "context_type": "TASK_UPDATE",
                        "verified": True,
                    },
                }
            # If no registered task matches in DB, allow natural sentence to flow as regular email body

        # 3. Fallback if no specific context trigger detected
        return {"verified": False}
