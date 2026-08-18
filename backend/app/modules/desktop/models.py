"""Desktop module — DesktopRelease SQLAlchemy model."""
import enum

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class Platform(str, enum.Enum):
    WINDOWS = "windows"
    MACOS   = "macos"
    LINUX   = "linux"


class Architecture(str, enum.Enum):
    X64   = "x64"
    ARM64 = "arm64"
    X86   = "x86"


class DesktopRelease(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "desktop_releases"

    version:       Mapped[str]          = mapped_column(String(50),   nullable=False)
    platform:      Mapped[Platform]     = mapped_column(Enum(Platform), nullable=False)
    architecture:  Mapped[Architecture] = mapped_column(Enum(Architecture), nullable=False)
    download_url:  Mapped[str]          = mapped_column(String(1000), nullable=False)
    checksum:      Mapped[str | None]   = mapped_column(String(128),  nullable=True)
    release_notes: Mapped[str | None]   = mapped_column(Text,         nullable=True)
    is_latest:     Mapped[bool]         = mapped_column(Boolean, default=False, nullable=False)
