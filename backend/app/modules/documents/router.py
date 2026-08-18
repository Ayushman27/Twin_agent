"""Documents module — HTTP router."""
from typing import List

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.modules.auth.models import User
from app.modules.documents.models import DocumentCategory
from app.modules.documents.schemas import DocumentResponse
from app.modules.documents.service import DocumentService

router = APIRouter()


@router.post(
    "/applications/{application_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document for an application",
)
async def upload_document(
    application_id: str,
    file: UploadFile = File(...),
    file_type: DocumentCategory = Form(DocumentCategory.OTHER),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    return await service.upload(application_id, file, file_type, current_user)


@router.get(
    "/applications/{application_id}/documents",
    response_model=List[DocumentResponse],
    summary="List documents for an application",
)
async def list_documents(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    return await service.list_documents(application_id, current_user)


@router.get(
    "/documents/{document_id}",
    response_model=DocumentResponse,
    summary="Get document metadata",
)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    return await service.get(document_id, current_user)


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document",
)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(db)
    await service.delete(document_id, current_user)
