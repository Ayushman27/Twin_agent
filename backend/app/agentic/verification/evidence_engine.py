"""
Evidence Engine - Generates and persists execution evidence.
"""
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.agentic.models import ExecutionEvidence


class EvidenceEngine:
    """
    Every agent execution must produce evidence.
    This engine creates ExecutionEvidence records.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def log_evidence(
        self,
        execution_id: str,
        action_taken: str,
        evidence_type: str,
        evidence_data: Dict[str, Any],
        confidence_score: Optional[float] = None
    ) -> ExecutionEvidence:
        """Log evidence for an execution."""
        
        evidence = ExecutionEvidence(
            execution_id=execution_id,
            action_taken=action_taken,
            evidence_type=evidence_type,
            evidence_data=evidence_data,
            confidence_score=confidence_score,
            verification_status="UNVERIFIED"
        )
        self.db.add(evidence)
        await self.db.commit()
        await self.db.refresh(evidence)
        return evidence
