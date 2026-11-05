from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRole(StrEnum):
    USER = "USER"  # abre e acompanha os próprios chamados
    ADMIN = "ADMIN"  # atende e resolve chamados


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("email = lower(email)", name="email_lowercase"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, create_constraint=True, length=20),
        server_default=UserRole.USER.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
