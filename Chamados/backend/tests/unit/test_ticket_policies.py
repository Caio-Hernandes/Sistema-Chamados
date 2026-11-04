import pytest

from app.core.exceptions import PermissionDeniedError
from app.modules.tickets.models import Ticket, TicketAction, TicketStatus
from app.modules.tickets.policies import (
    InvalidStatusTransitionError,
    TicketNotEditableError,
    can_view,
    ensure_can_delete,
    ensure_can_edit,
    ensure_can_perform,
    target_status,
)
from app.modules.users.models import User, UserRole

CREATOR = User(id=1, role=UserRole.USER)
STRANGER = User(id=2, role=UserRole.USER)
ADMIN = User(id=10, role=UserRole.ADMIN)
OTHER_ADMIN = User(id=11, role=UserRole.ADMIN)


def make_ticket(status: TicketStatus = TicketStatus.OPEN, assigned_to_id: int | None = None):
    return Ticket(id=100, created_by_id=CREATOR.id, status=status, assigned_to_id=assigned_to_id)


@pytest.mark.parametrize(
    ("action", "source", "target"),
    [
        (TicketAction.ASSIGN, TicketStatus.OPEN, TicketStatus.IN_PROGRESS),
        (TicketAction.RESOLVE, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED),
        (TicketAction.CLOSE, TicketStatus.RESOLVED, TicketStatus.CLOSED),
        (TicketAction.REOPEN, TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS),
    ],
)
def test_allowed_transitions(
    action: TicketAction, source: TicketStatus, target: TicketStatus
) -> None:
    assert target_status(make_ticket(source), action) == target


@pytest.mark.parametrize(
    ("action", "source"),
    [
        (action, status)
        for action, allowed in [
            (TicketAction.ASSIGN, TicketStatus.OPEN),
            (TicketAction.RESOLVE, TicketStatus.IN_PROGRESS),
            (TicketAction.CLOSE, TicketStatus.RESOLVED),
            (TicketAction.REOPEN, TicketStatus.RESOLVED),
        ]
        for status in TicketStatus
        if status != allowed
    ],
)
def test_other_transitions_are_rejected(action: TicketAction, source: TicketStatus) -> None:
    with pytest.raises(InvalidStatusTransitionError):
        target_status(make_ticket(source), action)


def test_closed_is_final() -> None:
    for action in TicketAction:
        with pytest.raises(InvalidStatusTransitionError):
            target_status(make_ticket(TicketStatus.CLOSED), action)


def test_visibility() -> None:
    ticket = make_ticket()

    assert can_view(CREATOR, ticket)
    assert can_view(ADMIN, ticket)
    assert not can_view(STRANGER, ticket)


@pytest.mark.parametrize(
    ("user", "action", "ticket", "allowed"),
    [
        (ADMIN, TicketAction.ASSIGN, make_ticket(), True),
        (CREATOR, TicketAction.ASSIGN, make_ticket(), False),
        (ADMIN, TicketAction.RESOLVE, make_ticket(TicketStatus.IN_PROGRESS, ADMIN.id), True),
        (OTHER_ADMIN, TicketAction.RESOLVE, make_ticket(TicketStatus.IN_PROGRESS, ADMIN.id), False),
        (CREATOR, TicketAction.RESOLVE, make_ticket(TicketStatus.IN_PROGRESS, ADMIN.id), False),
        (CREATOR, TicketAction.CLOSE, make_ticket(TicketStatus.RESOLVED, ADMIN.id), True),
        (OTHER_ADMIN, TicketAction.CLOSE, make_ticket(TicketStatus.RESOLVED, ADMIN.id), True),
        (STRANGER, TicketAction.CLOSE, make_ticket(TicketStatus.RESOLVED, ADMIN.id), False),
        (CREATOR, TicketAction.REOPEN, make_ticket(TicketStatus.RESOLVED, ADMIN.id), True),
        (ADMIN, TicketAction.REOPEN, make_ticket(TicketStatus.RESOLVED, ADMIN.id), False),
    ],
)
def test_action_permissions(
    user: User, action: TicketAction, ticket: Ticket, allowed: bool
) -> None:
    if allowed:
        ensure_can_perform(user, ticket, action)
    else:
        with pytest.raises(PermissionDeniedError):
            ensure_can_perform(user, ticket, action)


def test_only_creator_edits_and_only_while_open() -> None:
    ensure_can_edit(CREATOR, make_ticket())

    with pytest.raises(PermissionDeniedError):
        ensure_can_edit(ADMIN, make_ticket())
    with pytest.raises(TicketNotEditableError):
        ensure_can_edit(CREATOR, make_ticket(TicketStatus.IN_PROGRESS, ADMIN.id))


def test_delete_rules() -> None:
    ensure_can_delete(CREATOR, make_ticket())
    ensure_can_delete(ADMIN, make_ticket(TicketStatus.CLOSED, ADMIN.id))

    with pytest.raises(PermissionDeniedError):
        ensure_can_delete(STRANGER, make_ticket())
    with pytest.raises(TicketNotEditableError):
        ensure_can_delete(CREATOR, make_ticket(TicketStatus.RESOLVED, ADMIN.id))
