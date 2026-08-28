"""
Persistent Agent Memory Service.
Stores and retrieves working and long-term memories for Digital Twins.
"""
from typing import Any, Dict, List, Optional
from datetime import datetime
from sqlalchemy import select, desc
from app.db.sqlite import AgentAsyncSessionLocal
from app.agentic.models import AgentMemory


DEFAULT_ROLE_MEMORIES = {
    "Software Engineer": [
        {
            "key": "Backend Architecture & Code Standards",
            "content": "Follow clean layer separation (Routers -> Services -> Models). Enforce typed Pydantic models, parameterized SQL queries to prevent injection, and proper error propagation.",
            "memory_type": "CODE_PATTERN"
        },
        {
            "key": "Database Optimization Guidelines",
            "content": "Use composite indexes on high-cardinality filters (organization_id, status). Favor async database sessions and pool size bounds of 20 with 10 max overflow.",
            "memory_type": "CODE_PATTERN"
        },
        {
            "key": "Security & Multi-Tenant Isolation",
            "content": "Always filter database operations by organization_id. Validate JWT roles on every protected endpoint.",
            "memory_type": "ORG_GUIDELINE"
        }
    ],
    "QA Engineer": [
        {
            "key": "Test Coverage & Automation Standards",
            "content": "Achieve minimum 85% branch test coverage. Write isolated async test fixtures and avoid global state mutation in integration tests.",
            "memory_type": "CODE_PATTERN"
        },
        {
            "key": "Regression & Edge Case Checklist",
            "content": "Always test concurrent session expiration, empty payload validation, invalid UUID handling, and rate limit boundaries.",
            "memory_type": "ORG_GUIDELINE"
        }
    ],
    "DevOps Engineer": [
        {
            "key": "Infrastructure & Deployment Standard",
            "content": "Enforce containerized Docker builds with non-root user execution, multi-stage compilation, and health checks on port 8000.",
            "memory_type": "CODE_PATTERN"
        },
        {
            "key": "Observability & Alerting",
            "content": "Structured JSON logging with trace_id correlation, Prometheus metric instrumentation, and automated Slack alerts on 5xx error spikes.",
            "memory_type": "ORG_GUIDELINE"
        }
    ],
    "Product Manager": [
        {
            "key": "PRD & User Story Framework",
            "content": "Structure requirements as Problem Statement -> User Persona -> User Stories (Given/When/Then) -> Acceptance Criteria -> Metric Success KPIs.",
            "memory_type": "ORG_GUIDELINE"
        }
    ],
    "Security Engineer": [
        {
            "key": "Zero-Trust & Access Governance",
            "content": "Enforce principle of least privilege. Implement role-based access control (RBAC), TLS 1.3 encryption in transit, and AES-256 for sensitive columns.",
            "memory_type": "ORG_GUIDELINE"
        }
    ],
    "Data Analyst": [
        {
            "key": "Data Pipeline & Query Tuning",
            "content": "Avoid SELECT * on wide tables. Use materialized views for periodic heavy analytical aggregations.",
            "memory_type": "CODE_PATTERN"
        }
    ]
}


class MemoryService:
    """
    Manages SQLite-backed long-term and working memory for employee Digital Twins.
    """

    async def recall_memories(
        self,
        employee_id: str,
        organization_id: str,
        role: str,
        task_query: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Recalls the most relevant memories for the employee, role, and task.
        Initializes default role memories if this is the employee's first execution.
        """
        async with AgentAsyncSessionLocal() as session:
            # 1. Fetch existing memories for this employee/org
            stmt = (
                select(AgentMemory)
                .where(
                    AgentMemory.organization_id == organization_id,
                    AgentMemory.employee_id == employee_id
                )
                .order_by(desc(AgentMemory.created_at))
                .limit(limit)
            )
            result = await session.execute(stmt)
            memories = result.scalars().all()

            # 2. If no memories exist yet, seed initial grounded role memories
            if not memories:
                role_defaults = DEFAULT_ROLE_MEMORIES.get(role, DEFAULT_ROLE_MEMORIES["Software Engineer"])
                seeded_memories = []
                for item in role_defaults:
                    mem = AgentMemory(
                        organization_id=organization_id,
                        employee_id=employee_id,
                        role=role,
                        key=item["key"],
                        content=item["content"],
                        memory_type=item["memory_type"],
                        relevance_score=1.0
                    )
                    session.add(mem)
                    seeded_memories.append(mem)
                await session.commit()
                memories = seeded_memories

            return [
                {
                    "id": m.id,
                    "key": m.key,
                    "content": m.content,
                    "memory_type": m.memory_type,
                    "role": m.role,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "relevance_score": m.relevance_score
                }
                for m in memories
            ]

    async def store_memory(
        self,
        employee_id: str,
        organization_id: str,
        role: str,
        key: str,
        content: str,
        source_task_id: Optional[str] = None,
        memory_type: str = "TASK_LEARNING"
    ) -> Dict[str, Any]:
        """
        Persists a new memory or learned takeaway into SQLite.
        """
        async with AgentAsyncSessionLocal() as session:
            mem = AgentMemory(
                organization_id=organization_id,
                employee_id=employee_id,
                role=role,
                key=key,
                content=content,
                source_task_id=source_task_id,
                memory_type=memory_type,
                relevance_score=1.0
            )
            session.add(mem)
            await session.commit()
            await session.refresh(mem)

            return {
                "id": mem.id,
                "key": mem.key,
                "content": mem.content,
                "memory_type": mem.memory_type,
                "role": mem.role,
                "created_at": mem.created_at.isoformat() if mem.created_at else None
            }

    async def list_all_memories(
        self,
        employee_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lists memories from SQLite with optional filtering."""
        async with AgentAsyncSessionLocal() as session:
            stmt = select(AgentMemory).order_by(desc(AgentMemory.created_at)).limit(limit)
            if employee_id:
                stmt = stmt.where(AgentMemory.employee_id == employee_id)
            if organization_id:
                stmt = stmt.where(AgentMemory.organization_id == organization_id)
            
            result = await session.execute(stmt)
            memories = result.scalars().all()

            return [
                {
                    "id": m.id,
                    "employee_id": m.employee_id,
                    "organization_id": m.organization_id,
                    "role": m.role,
                    "key": m.key,
                    "content": m.content,
                    "memory_type": m.memory_type,
                    "source_task_id": m.source_task_id,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "relevance_score": m.relevance_score
                }
                for m in memories
            ]


memory_service = MemoryService()
