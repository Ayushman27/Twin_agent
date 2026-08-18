"""Desktop module — schemas, service, router."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.modules.desktop.models import Architecture, Platform


class DesktopReleaseResponse(BaseModel):
    model_config = {"from_attributes": True}
    id:            str
    version:       str
    platform:      Platform
    architecture:  Architecture
    download_url:  str
    checksum:      Optional[str]
    release_notes: Optional[str]
    is_latest:     bool
    created_at:    datetime
