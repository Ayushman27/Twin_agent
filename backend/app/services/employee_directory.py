"""
Employee Directory Service — Twin Agent Platform
=================================================
Provides organization-isolated employee identity resolution for Email, Messaging, and Agent tools.
Strictly ensures zero cross-organization leakage and provides structured ambiguity handling.
"""
import logging
import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.organizations.models import OrganizationMember, MemberStatus

logger = logging.getLogger(__name__)

# Noise prefixes often present in speech/text queries
QUERY_NOISE_RE = re.compile(
    r"^(?:employee|emp|user|to|email|send\s+to|send\s+email\s+to|message|tell)\s+",
    re.IGNORECASE,
)


@dataclass
class EmployeeProfile:
    user_id: str
    name: str
    email: str
    department: Optional[str] = None
    job_title: Optional[str] = None
    role: Optional[str] = None
    employee_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "department": self.department,
            "job_title": self.job_title,
            "role": self.role,
            "employee_id": self.employee_id,
        }


@dataclass
class DirectoryResolutionResult:
    success: bool
    status: str  # "RESOLVED", "AMBIGUOUS", "NOT_FOUND"
    query: str
    message: str
    employee: Optional[EmployeeProfile] = None
    candidates: List[EmployeeProfile] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "status": self.status,
            "query": self.query,
            "message": self.message,
            "employee": self.employee.to_dict() if self.employee else None,
            "candidates": [c.to_dict() for c in self.candidates],
        }


class EmployeeDirectoryService:
    """
    Organization-isolated employee search and identity resolution.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.db = session

    @staticmethod
    def clean_query(raw_query: str) -> str:
        """Strips conversational noise and whitespace from a search query."""
        cleaned = (raw_query or "").strip()
        while True:
            m = QUERY_NOISE_RE.match(cleaned)
            if not m:
                break
            cleaned = cleaned[m.end():].strip()
        return cleaned.strip("\"' ")

    async def resolve_recipient(
        self,
        organization_id: str,
        query: str,
        sender_id: Optional[str] = None,
    ) -> DirectoryResolutionResult:
        """
        Resolves an employee query to a single employee profile within the caller's organization.

        Supported resolution patterns:
          1. Exact Email match (e.g. 'rahul@company.com')
          2. Exact Employee ID match (e.g. 'EMP-123' or 'employee EMP-123')
          3. Exact Name match (e.g. 'Rahul Sharma')
          4. Partial Name match (e.g. 'Rahul', 'Sharma', or prefix 'Rah')

        Organization Isolation:
          Only employees belonging to `organization_id` with active membership are returned.
        """
        if not organization_id:
            return DirectoryResolutionResult(
                success=False,
                status="NOT_FOUND",
                query=query,
                message="Organization context is required for employee resolution.",
            )

        cleaned_q = self.clean_query(query)
        if not cleaned_q:
            return DirectoryResolutionResult(
                success=False,
                status="NOT_FOUND",
                query=query,
                message="Recipient search query is empty.",
            )

        # Base query joining User and OrganizationMember strictly isolated by organization_id
        base_stmt = (
            select(User, OrganizationMember)
            .join(OrganizationMember, User.id == OrganizationMember.user_id)
            .where(
                and_(
                    OrganizationMember.organization_id == organization_id,
                    OrganizationMember.status == MemberStatus.ACTIVE,
                    User.is_active == True,
                )
            )
        )

        # 1. Exact Email Match (High Priority)
        stmt_email = base_stmt.where(User.email.ilike(cleaned_q))
        res = await self.db.execute(stmt_email)
        matches = res.all()

        # 2. Exact Employee ID Match
        if not matches:
            stmt_emp_id = base_stmt.where(
                or_(
                    User.employee_id.ilike(cleaned_q),
                    User.employee_id.ilike(f"EMP-{cleaned_q}"),
                    User.employee_id.ilike(cleaned_q.replace(" ", "-")),
                )
            )
            res = await self.db.execute(stmt_emp_id)
            matches = res.all()

        # 3. Exact Full Name Match
        if not matches:
            stmt_name_exact = base_stmt.where(User.name.ilike(cleaned_q))
            res = await self.db.execute(stmt_name_exact)
            matches = res.all()

        # 4. Partial Name Match (contains substring)
        if not matches:
            stmt_name_partial = base_stmt.where(User.name.ilike(f"%{cleaned_q}%"))
            res = await self.db.execute(stmt_name_partial)
            matches = res.all()

        # 5. First Name / Last Name or Prefix Fallback (if multi-word or >= 3 chars)
        if not matches:
            words = cleaned_q.split()
            if words:
                first_word = words[0]
                if len(first_word) >= 3:
                    stmt_first_word = base_stmt.where(User.name.ilike(f"%{first_word}%"))
                    res = await self.db.execute(stmt_first_word)
                    matches = res.all()

        # Deduplicate matches by User ID
        unique_users: Dict[str, tuple[User, OrganizationMember]] = {}
        for u, mem in matches:
            if u.id not in unique_users:
                unique_users[u.id] = (u, mem)

        candidates: List[EmployeeProfile] = []
        for u, mem in unique_users.values():
            profile = EmployeeProfile(
                user_id=u.id,
                name=u.name,
                email=u.email,
                department=u.department,
                job_title=u.job_title,
                role=mem.role or (u.role.value if hasattr(u.role, "value") else str(u.role)),
                employee_id=u.employee_id,
            )
            candidates.append(profile)

        # If multiple candidates and sender_id is among them, remove self unless self is the only match
        if len(candidates) > 1 and sender_id:
            filtered = [c for c in candidates if c.user_id != sender_id]
            if filtered:
                candidates = filtered

        # Evaluate outcome
        if len(candidates) == 1:
            emp = candidates[0]
            return DirectoryResolutionResult(
                success=True,
                status="RESOLVED",
                query=cleaned_q,
                message=f"Resolved employee {emp.name} ({emp.email}).",
                employee=emp,
                candidates=[emp],
            )
        elif len(candidates) > 1:
            names_summary = ", ".join([f"{c.name} ({c.department or c.job_title or 'Employee'})" for c in candidates[:3]])
            return DirectoryResolutionResult(
                success=False,
                status="AMBIGUOUS",
                query=cleaned_q,
                message=f"Multiple employees matching '{cleaned_q}' were found: {names_summary}. Please select one.",
                candidates=candidates,
            )
        else:
            return DirectoryResolutionResult(
                success=False,
                status="NOT_FOUND",
                query=cleaned_q,
                message=f"No employee found matching '{cleaned_q}' in your organization.",
                candidates=[],
            )
