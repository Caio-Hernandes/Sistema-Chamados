"""Regras de permissão e transição de status dos chamados (ver CLAUDE.md)."""

from app.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from app.modules.tickets.models import Ticket, TicketAction, TicketStatus
from app.modules.users.models import User, UserRole

TRANSITIONS: dict[TicketAction, tuple[TicketStatus, TicketStatus]] = {
    TicketAction.ASSIGN: (TicketStatus.OPEN, TicketStatus.IN_PROGRESS),
    TicketAction.RESOLVE: (TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED),
    TicketAction.CLOSE: (TicketStatus.RESOLVED, TicketStatus.CLOSED),
    TicketAction.REOPEN: (TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS),
}


class TicketNotFoundError(NotFoundError):
    default_message = "Ticket not found."


class InvalidStatusTransitionError(ConflictError):
    default_message = "This action is not allowed in the ticket's current status."


class TicketNotEditableError(ConflictError):
    default_message = "Only open tickets can be changed by their creator."


def is_admin(user: User) -> bool:
    return user.role == UserRole.ADMIN


def is_creator(user: User, ticket: Ticket) -> bool:
    return ticket.created_by_id == user.id


def can_view(user: User, ticket: Ticket) -> bool:
    return is_admin(user) or is_creator(user, ticket)


def ensure_can_edit(user: User, ticket: Ticket) -> None:
    if not is_creator(user, ticket):
        raise PermissionDeniedError("Only the ticket creator can edit it.")
    if ticket.status != TicketStatus.OPEN:
        raise TicketNotEditableError()


def ensure_can_delete(user: User, ticket: Ticket) -> None:
    if is_admin(user):
        return
    if not is_creator(user, ticket):
        raise PermissionDeniedError("Only the ticket creator or an admin can delete it.")
    if ticket.status != TicketStatus.OPEN:
        raise TicketNotEditableError()


def ensure_can_perform(user: User, ticket: Ticket, action: TicketAction) -> None:
    """Valida quem pode executar a ação. O status é validado por `target_status`."""
    match action:
        case TicketAction.ASSIGN:
            allowed = is_admin(user)
        case TicketAction.RESOLVE:
            # Chamado ainda sem responsável cai na validação de status (409).
            allowed = is_admin(user) and ticket.assigned_to_id in (None, user.id)
        case TicketAction.CLOSE:
            allowed = is_admin(user) or is_creator(user, ticket)
        case TicketAction.REOPEN:
            allowed = is_creator(user, ticket)
    if not allowed:
        raise PermissionDeniedError(f"You are not allowed to {action.lower()} this ticket.")


def target_status(ticket: Ticket, action: TicketAction) -> TicketStatus:
    source, target = TRANSITIONS[action]
    if ticket.status != source:
        raise InvalidStatusTransitionError(
            f"Cannot {action.lower()} a ticket with status {ticket.status}."
        )
    return target
