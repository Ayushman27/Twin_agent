"""Documents module — schemas, repository, service, router."""
# ── schemas.py ────────────────────────────────────────────────
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.modules.documents.models import DocumentCategory, ProcessingStatus


class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}
    id:                str
    application_id:    str
    organization_id:   str
    uploaded_by:       Optional[str]
    file_name:         str
    original_filename: str
    file_type:         DocumentCategory
    file_size:         int
    mime_type:         str
    storage_path:      str
    processing_status: ProcessingStatus
    created_at:        datetime
