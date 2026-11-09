from typing import Any

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tickets.models import Ticket, TicketEvent, TicketStatus
from app.modules.tickets.schemas import SortOrder, TicketFilters, TicketSortField

# Ordenação só por colunas desta lista; o cliente nunca escolhe a coluna diretamente.
SORT_COLUMNS = {
    TicketSortField.CREATED_AT: Ticket.created_at,
    TicketSortField.UPDATED_AT: Ticket.updated_at,
    TicketSortField.TITLE: Ticket.title,
}


class TicketRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, ticket_id: int) -> Ticket | None:
        return await self.session.get(Ticket, ticket_id)

    def add(self, ticket: Ticket) -> None:
        self.session.add(ticket)

    def add_event(self, event: TicketEvent) -> None:
        self.session.add(event)

    async def search(
        self, filters: TicketFilters, created_by_id: int | None
    ) -> tuple[list[Ticket], int]:
        conditions = []
        if filters.status is not None:
            conditions.append(Ticket.status == filters.status)
        if filters.category is not None:
            conditions.append(Ticket.category == filters.category)
        if filters.assigned_to_id is not None:
            conditions.append(Ticket.assigned_to_id == filters.assigned_to_id)
        if filters.created_by_id is not None:
            conditions.append(Ticket.created_by_id == filters.created_by_id)
        if created_by_id is not None:
            conditions.append(Ticket.created_by_id == created_by_id)

        total = await self.session.scalar(
            select(func.count()).select_from(Ticket).where(*conditions)
        )

        column = SORT_COLUMNS[filters.sort_by]
        if filters.order == SortOrder.ASC:
            order_by = (column.asc(), Ticket.id.asc())
        else:
            order_by = (column.desc(), Ticket.id.desc())
        tickets = await self.session.scalars(  # scalars/scalar é quando a query é feita
            select(Ticket)
            .where(*conditions)
            .order_by(*order_by)
            .limit(filters.limit)
            .offset(filters.offset)
        )
        return list(tickets), total or 0

    async def update_if_status(
        self,
        ticket_id: int,
        expected_status: TicketStatus,
        values: dict[str, Any],
        *,
        require_unassigned: bool = False,
    ) -> bool:
        """UPDATE atômico condicionado ao status atual; retorna False se outra
        requisição alterou o chamado antes (nenhuma linha afetada)."""
        statement = update(Ticket).where(Ticket.id == ticket_id, Ticket.status == expected_status)
        if require_unassigned:
            statement = statement.where(Ticket.assigned_to_id.is_(None))
        result = await self.session.execute(
            statement.values(**values).execution_options(synchronize_session=False)
        )
        return result.rowcount == 1

    async def delete(self, ticket_id: int, expected_status: TicketStatus | None = None) -> bool:
        statement = delete(Ticket).where(Ticket.id == ticket_id)
        if expected_status is not None:
            statement = statement.where(Ticket.status == expected_status)
        result = await self.session.execute(statement.execution_options(synchronize_session=False))
        return result.rowcount == 1

    async def list_events(self, ticket_id: int) -> list[TicketEvent]:
        events = await self.session.scalars(
            select(TicketEvent)
            .where(TicketEvent.ticket_id == ticket_id)
            .order_by(TicketEvent.created_at, TicketEvent.id)
        )
        return list(events)
