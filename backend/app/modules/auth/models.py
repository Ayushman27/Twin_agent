"""Auth module — User SQLAlchemy model."""
import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ORG_ADMIN   = "ORG_ADMIN"
    MANAGER     = "MANAGER"
    EMPLOYEE    = "EMPLOYEE"
    DEMO_USER   = "DEMO_USER"


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name:          Mapped[str]         = mapped_column(String(255), nullable=False)
    email:         Mapped[str]         = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str]         = mapped_column(String(255), nullable=False)
    phone:         Mapped[str | None]  = mapped_column(String(30),  nullable=True)
    employee_id:   Mapped[str | None]  = mapped_column(String(50),  nullable=True, index=True)
    job_title:     Mapped[str | None]  = mapped_column(String(255), nullable=True)
    department:    Mapped[str | None]  = mapped_column(String(100), nullable=True)
    role:          Mapped[UserRole]    = mapped_column(
        Enum(UserRole), default=UserRole.DEMO_USER, nullable=False
    )
    is_active:     Mapped[bool]        = mapped_column(Boolean, default=True, nullable=False)
