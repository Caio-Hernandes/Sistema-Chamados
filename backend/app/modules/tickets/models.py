from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, String, Text, case, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.db.base import Base
from app.modules.users.models import User, UserRole


class TicketStatus(StrEnum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketCategory(StrEnum):
    HARDWARE = "HARDWARE"
    SOFTWARE = "SOFTWARE"
    NETWORK = "NETWORK"
    ACCESS = "ACCESS"
    OTHER = "OTHER"


class TicketAction(StrEnum):
    ASSIGN = "ASSIGN"
    RESOLVE = "RESOLVE"
    CLOSE = "CLOSE"
    REOPEN = "REOPEN"


def string_enum(enum_class: type[StrEnum], name: str) -> Enum:
    """Enum guardado como VARCHAR com CHECK, mais simples de migrar que um ENUM nativo."""
    return Enum(enum_class, name=name, native_enum=False, create_constraint=True, length=20)


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        # Só chamados OPEN ficam sem responsável.
        CheckConstraint(
            "(status = 'OPEN') = (assigned_to_id IS NULL)", name="assignee_matches_status"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[TicketCategory] = mapped_column(string_enum(TicketCategory, "ticket_category"))
    status: Mapped[TicketStatus] = mapped_column(
        string_enum(TicketStatus, "ticket_status"),
        server_default=TicketStatus.OPEN.value,
        index=True,
    )
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_by_name: Mapped[str] = column_property(
        select(case((User.role == UserRole.ADMIN, "Admin"), else_=User.name))
        .where(User.id == created_by_id)
        .correlate_except(User)
        .scalar_subquery()
    )
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    assigned_to_name: Mapped[str | None] = column_property(
        select(case((User.role == UserRole.ADMIN, "Admin"), else_=User.name))
        .where(User.id == assigned_to_id)
        .correlate_except(User)
        .scalar_subquery()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TicketEvent(Base):
    """Histórico de atribuições e mudanças de status de um chamado."""

    __tablename__ = "ticket_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = column_property(
        select(case((User.role == UserRole.ADMIN, "Admin"), else_=User.name))
        .where(User.id == actor_id)
        .correlate_except(User)
        .scalar_subquery()
    )
    action: Mapped[TicketAction] = mapped_column(string_enum(TicketAction, "ticket_action"))
    from_status: Mapped[TicketStatus] = mapped_column(string_enum(TicketStatus, "from_status"))
    to_status: Mapped[TicketStatus] = mapped_column(string_enum(TicketStatus, "to_status"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
