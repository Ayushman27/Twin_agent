"""Documents module — Service."""
import os
import uuid
from typing import List

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.integrations.storage.local import get_storage
from app.modules.applications.repository import ApplicationRepository
from app.modules.auth.models import User
from app.modules.documents.models import ApplicationDocument, DocumentCategory
from app.modules.documents.repository import DocumentRepository
from app.modules.organizations.repository import OrganizationRepository

ALLOWED_MIME_TYPES = {
    "application/pdf":  ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain":       ".txt",
    "text/csv":         ".csv",
    "image/jpeg":       ".jpg",
    "image/png":        ".png",
}
ALLOWED_EXTENSIONS = set(ALLOWED_MIME_TYPES.values())


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.repo     = DocumentRepository(db)
        self.app_repo = ApplicationRepository(db)
        self.org_repo = OrganizationRepository(db)
        self.storage  = get_storage()

    async def upload(
        self,
        application_id: str,
        file: UploadFile,
        file_type: DocumentCategory,
        current_user: User,
    ) -> ApplicationDocument:
        # Authorize
        app = await self.app_repo.get_by_id(application_id)
        if not app:
            raise NotFoundException("Application", application_id)
        await self._assert_org_member(app.organization_id, current_user)

        # Validate file
        content_type = file.content_type or ""
        if content_type not in ALLOWED_MIME_TYPES:
            raise ValidationException(
                f"Unsupported file type: {content_type}. Allowed: {list(ALLOWED_MIME_TYPES.keys())}"
            )
        ext = ALLOWED_MIME_TYPES[content_type]
        file_bytes = await file.read()
        if len(file_bytes) > settings.max_upload_bytes:
            raise ValidationException(
                f"File size {len(file_bytes)} bytes exceeds limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
            )

        # Safe storage path
        safe_name = f"{uuid.uuid4()}{ext}"
        storage_path = os.path.join(app.organization_id, application_id, safe_name)
        await self.storage.save(file_bytes, storage_path, content_type)

        return await self.repo.create(
            application_id=application_id,
            organization_id=app.organization_id,
            uploaded_by=current_user.id,
            file_name=safe_name,
            original_filename=file.filename or safe_name,
            file_type=file_type,
            file_size=len(file_bytes),
            mime_type=content_type,
            storage_path=storage_path,
        )

    async def list_documents(
        self, application_id: str, current_user: User
    ) -> List[ApplicationDocument]:
        app = await self.app_repo.get_by_id(application_id)
        if not app:
            raise NotFoundException("Application", application_id)
        await self._assert_org_member(app.organization_id, current_user)
        return await self.repo.list_by_application(application_id)

    async def get(self, doc_id: str, current_user: User) -> ApplicationDocument:
        doc = await self.repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundException("Document", doc_id)
        await self._assert_org_member(doc.organization_id, current_user)
        return doc

    async def delete(self, doc_id: str, current_user: User) -> None:
        doc = await self.repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundException("Document", doc_id)
        await self._assert_org_member(doc.organization_id, current_user)
        await self.storage.delete(doc.storage_path)
        await self.repo.delete(doc)

    async def _assert_org_member(self, org_id: str, user: User) -> None:
        from app.modules.auth.models import UserRole
        if user.role == UserRole.SUPER_ADMIN:
            return
        membership = await self.org_repo.get_user_membership(org_id, user.id)
        if not membership:
            raise ForbiddenException("You are not a member of this organization")
