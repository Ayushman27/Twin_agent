"""Documents module — SQLAlchemy model."""
import enum

from sqlalchemy import BigInteger, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class DocumentCategory(str, enum.Enum):
    COMPANY_PROFILE       = "COMPANY_PROFILE"
    ORGANIZATION_STRUCTURE= "ORGANIZATION_STRUCTURE"
    ROLE_DESCRIPTION      = "ROLE_DESCRIPTION"
    PROCESS_DOCUMENT      = "PROCESS_DOCUMENT"
    POLICY                = "POLICY"
    TECHNICAL_DOCUMENT    = "TECHNICAL_DOCUMENT"
    OTHER                 = "OTHER"


class ProcessingStatus(str, enum.Enum):
    UPLOADED   = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED  = "PROCESSED"
    FAILED     = "FAILED"


class ApplicationDocument(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "application_documents"

    application_id:  Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    file_name:         Mapped[str]              = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str]              = mapped_column(String(500), nullable=False)
    file_type:         Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory), default=DocumentCategory.OTHER, nullable=False
    )
    file_size:       Mapped[int]              = mapped_column(BigInteger, nullable=False)
    mime_type:       Mapped[str]              = mapped_column(String(100), nullable=False)
    storage_path:    Mapped[str]              = mapped_column(String(1000), nullable=False)
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus), default=ProcessingStatus.UPLOADED, nullable=False
    )
