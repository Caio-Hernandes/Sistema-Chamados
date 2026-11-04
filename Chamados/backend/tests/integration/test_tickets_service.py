"""Garantias de transação e concorrência, testadas contra o PostgreSQL real."""

import asyncio

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.exceptions import ConflictError
from app.modules.tickets.models import (
    Ticket,
    TicketAction,
    TicketCategory,
    TicketEvent,
    TicketStatus,
)
from app.modules.tickets.repository import TicketRepository
from app.modules.tickets.schemas import TicketCreate
from app.modules.tickets.service import TicketService
from app.modules.users.models import User, UserRole

Sessionmaker = async_sessionmaker[AsyncSession]


async def create_user(sessionmaker: Sessionmaker, email: str, role: UserRole) -> User:
    async with sessionmaker() as session:
        user = User(name="Test", email=email, password_hash="not-used", role=role)
        session.add(user)
        await session.commit()
        return user


async def create_ticket(sessionmaker: Sessionmaker, owner: User) -> Ticket:
    data = TicketCreate(title="Ticket", description="Details", category=TicketCategory.OTHER)
    async with sessionmaker() as session:
        return await TicketService(session).create(owner, data)


async def assign(sessionmaker: Sessionmaker, admin: User, ticket_id: int) -> Ticket:
    # Cada tentativa usa a própria sessão/conexão, como duas requisições reais.
    async with sessionmaker() as session:
        return await TicketService(session).perform(admin, ticket_id, TicketAction.ASSIGN)


async def test_concurrent_assignments_have_exactly_one_winner(sessionmaker: Sessionmaker) -> None:
    owner = await create_user(sessionmaker, "owner@example.com", UserRole.USER)
    admins = [
        await create_user(sessionmaker, f"admin{i}@example.com", UserRole.ADMIN) for i in range(2)
    ]

    for _ in range(10):
        ticket = await create_ticket(sessionmaker, owner)

        results = await asyncio.gather(
            *(assign(sessionmaker, admin, ticket.id) for admin in admins),
            return_exceptions=True,
        )

        winners = [r for r in results if isinstance(r, Ticket)]
        losers = [r for r in results if isinstance(r, ConflictError)]
        assert len(winners) == 1, results
        assert len(losers) == 1, results

        async with sessionmaker() as session:
            stored = await session.get(Ticket, ticket.id)
            events = await session.scalar(
                select(func.count()).where(TicketEvent.ticket_id == ticket.id)
            )
        assert stored is not None
        assert stored.assigned_to_id == winners[0].assigned_to_id
        assert events == 1


async def test_failure_after_update_rolls_back_status_change(
    sessionmaker: Sessionmaker, monkeypatch: pytest.MonkeyPatch
) -> None:
    owner = await create_user(sessionmaker, "owner@example.com", UserRole.USER)
    admin = await create_user(sessionmaker, "admin@example.com", UserRole.ADMIN)
    ticket = await create_ticket(sessionmaker, owner)

    def fail_to_record_event(self: TicketRepository, event: TicketEvent) -> None:
        raise RuntimeError("simulated failure while writing history")

    monkeypatch.setattr(TicketRepository, "add_event", fail_to_record_event)

    with pytest.raises(RuntimeError):
        await assign(sessionmaker, admin, ticket.id)

    async with sessionmaker() as session:
        stored = await session.get(Ticket, ticket.id)
        events = await session.scalar(select(func.count()).select_from(TicketEvent))
    assert stored is not None
    assert stored.status == TicketStatus.OPEN
    assert stored.assigned_to_id is None
    assert events == 0


async def test_database_rejects_in_progress_ticket_without_assignee(
    sessionmaker: Sessionmaker,
) -> None:
    owner = await create_user(sessionmaker, "owner@example.com", UserRole.USER)

    async with sessionmaker() as session:
        with pytest.raises(IntegrityError):
            await session.execute(
                text(
                    "INSERT INTO tickets (title, description, category, status, created_by_id) "
                    "VALUES ('T', 'D', 'OTHER', 'IN_PROGRESS', :owner)"
                ),
                {"owner": owner.id},
            )
