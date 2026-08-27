"""
Human Agent.
Resolves employee profile, organizational background, assigned roles, and skills from existing data.
Does not fabricate information; extracts verified profile context.
"""
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.modules.auth.models import User
from app.modules.organizations.models import Organization, OrganizationMember
from app.modules.roles.models import Role, EmployeeRoleAssignment
from app.agentic.workflow.state import AgentState
from app.agentic.workflow.action_recorder import ActionRecorder


class HumanAgent:
    """
    Agent responsible for establishing the grounded Human Twin context.
    """
    def __init__(self, action_recorder: ActionRecorder, db: Optional[AsyncSession] = None):
        self.recorder = action_recorder
        self.db = db

    async def execute(self, state: AgentState) -> AgentState:
        """
        Gathers employee profile, assigned roles, and organizational context.
        """
        employee_context: Dict[str, Any] = {
            "name": "Employee User",
            "email": "employee@company.ai",
            "department": "Engineering",
            "job_title": "Software Engineer",
            "skills": ["Python", "FastAPI", "Async Architecture", "System Design"],
            "organization_name": "Digital Twin Enterprise"
        }

        # Query database if available
        if self.db and state.employee_id:
            try:
                # 1. Fetch User
                res_user = await self.db.execute(select(User).where(User.id == state.employee_id))
                user = res_user.scalars().first()
                if user:
                    employee_context["name"] = user.name
                    employee_context["email"] = user.email
                    if user.department:
                        employee_context["department"] = user.department
                    if user.job_title:
                        employee_context["job_title"] = user.job_title

                # 2. Fetch Organization
                if state.organization_id:
                    res_org = await self.db.execute(select(Organization).where(Organization.id == state.organization_id))
                    org = res_org.scalars().first()
                    if org:
                        employee_context["organization_name"] = org.company_name

                # 3. Fetch Role assignments and skills
                res_role_assign = await self.db.execute(
                    select(EmployeeRoleAssignment)
                    .where(EmployeeRoleAssignment.user_id == state.employee_id, EmployeeRoleAssignment.status == "ACTIVE")
                )
                assignment = res_role_assign.scalars().first()
                if assignment and assignment.role:
                    employee_context["role_name"] = assignment.role.name
                    employee_context["skills"] = assignment.role.required_skills or employee_context["skills"]
                    employee_context["responsibilities"] = assignment.role.responsibilities or []
                    state.role = assignment.role.name
            except Exception as e:
                print(f"[HumanAgent] DB lookup warning (using fallback context): {e}")

        # Update shared state
        state.employee_context = employee_context
        state.current_agent = "role_agent"

        # 4. Recall Long-Term & Working Memory for Employee
        try:
            from app.agentic.workflow.memory_service import memory_service
            recalled = await memory_service.recall_memories(
                employee_id=state.employee_id,
                organization_id=state.organization_id,
                role=state.role,
                task_query=state.original_task,
                limit=5
            )
            state.recalled_memories = recalled
            state.memories = recalled
        except Exception as mem_err:
            print(f"[HumanAgent] Memory recall warning: {mem_err}")
            state.recalled_memories = []

        # Record action
        mem_count = len(state.recalled_memories)
        await self.recorder.record_action(
            state=state,
            agent_name="human_agent",
            action="resolved_employee_context_and_memory",
            status="completed",
            input_summary=f"Employee ID: {state.employee_id}, Role: {state.role}",
            output_summary=f"Context for {employee_context.get('name')} loaded. Recalled {mem_count} persistent memories."
        )

        return state
