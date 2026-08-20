"""
SQLAlchemy models for the Dynamic Agentic Layer.
These models store the registry, agent groups, runtime states, and evidence.
"""
import enum
from typing import Optional, List
from sqlalchemy import String, Text, Boolean, Integer, JSON, ForeignKey, Enum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ExecutionStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PAUSED = "PAUSED"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"


class AgentCapability(UUIDMixin, TimestampMixin, Base):
    """Centralized registry of reusable agent capabilities."""
    __tablename__ = "agent_capabilities"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    supported_roles: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    required_tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    required_permissions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    
    input_schema: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    output_schema: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    
    system_instructions: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[str] = mapped_column(String(50), default="1.0.0")


class RoleCriteria(UUIDMixin, TimestampMixin, Base):
    """Structured criteria generated from a Role Twin for agent planning."""
    __tablename__ = "role_criteria"

    role_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    
    responsibilities: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    skills: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    
    capabilities_required: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    permissions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.LOW)
    approval_rules: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class AgentGroup(UUIDMixin, TimestampMixin, Base):
    """Dynamic grouping of agents assigned to a specific employee."""
    __tablename__ = "agent_groups"

    # Multi-tenancy & Isolation
    organization_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    employee_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE") # e.g. ACTIVE, DRAFT, ARCHIVED
    
    # Relationships
    agents: Mapped[List["Agent"]] = relationship(
        "Agent", back_populates="agent_group", cascade="all, delete-orphan"
    )


class Agent(UUIDMixin, TimestampMixin, Base):
    """An individual agent assigned to an AgentGroup, built from a Capability."""
    __tablename__ = "agents"

    agent_group_id: Mapped[str] = mapped_column(ForeignKey("agent_groups.id", ondelete="CASCADE"), nullable=False)
    capability_id: Mapped[str] = mapped_column(ForeignKey("agent_capabilities.id", ondelete="RESTRICT"), nullable=False)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Instance-specific configuration derived from Role/Human twin
    custom_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    permissions: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE")
    
    # Relationships
    agent_group: Mapped["AgentGroup"] = relationship("AgentGroup", back_populates="agents")
    capability: Mapped["AgentCapability"] = relationship("AgentCapability")
    executions: Mapped[List["AgentExecution"]] = relationship(
        "AgentExecution", back_populates="agent", cascade="all, delete-orphan"
    )


class AgentExecution(UUIDMixin, TimestampMixin, Base):
    """Record of a task execution by a specific agent."""
    __tablename__ = "agent_executions"

    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    parent_task_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    status: Mapped[ExecutionStatus] = mapped_column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    outputs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    agent: Mapped["Agent"] = relationship("Agent", back_populates="executions")
    evidence: Mapped[List["ExecutionEvidence"]] = relationship(
        "ExecutionEvidence", back_populates="execution", cascade="all, delete-orphan"
    )


class ExecutionEvidence(UUIDMixin, TimestampMixin, Base):
    """Artifacts and verification proofs produced during execution."""
    __tablename__ = "execution_evidence"

    execution_id: Mapped[str] = mapped_column(ForeignKey("agent_executions.id", ondelete="CASCADE"), nullable=False)
    
    action_taken: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "code_diff", "test_result"
    evidence_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(50), default="UNVERIFIED")
    
    execution: Mapped["AgentExecution"] = relationship("AgentExecution", back_populates="evidence")


class ApprovalRequest(UUIDMixin, TimestampMixin, Base):
    """Human-in-the-loop approval requests."""
    __tablename__ = "approval_requests"

    execution_id: Mapped[str] = mapped_column(ForeignKey("agent_executions.id", ondelete="CASCADE"), nullable=False)
    requested_by_agent_id: Mapped[str] = mapped_column(String(36), nullable=False)
    approver_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True) # Employee ID
    
    action_description: Mapped[str] = mapped_column(Text, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(Enum(RiskLevel), default=RiskLevel.HIGH)
    
    status: Mapped[str] = mapped_column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    execution: Mapped["AgentExecution"] = relationship("AgentExecution")
