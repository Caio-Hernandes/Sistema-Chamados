from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.modules.tickets.models import Ticket, TicketAction, TicketEvent, TicketStatus
from app.modules.tickets.policies import (
    TicketNotFoundError,
    can_view,
    ensure_can_delete,
    ensure_can_edit,
    ensure_can_perform,
    is_admin,
    target_status,
)
from app.modules.tickets.repository import TicketRepository
from app.modules.tickets.schemas import TicketCreate, TicketFilters, TicketUpdate
from app.modules.users.models import User


class TicketChangedConcurrentlyError(ConflictError):
    default_message = "The ticket was changed by another request. Reload it and try again."


class TicketService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tickets = TicketRepository(session)

    async def create(self, user: User, data: TicketCreate) -> Ticket:
        ticket = Ticket(**data.model_dump(), created_by_id=user.id)
        self.tickets.add(ticket)
        await self.session.commit()
        await self.session.refresh(ticket)
        return ticket

    async def search(self, user: User, filters: TicketFilters) -> tuple[list[Ticket], int]:
        # USER só enxerga os próprios chamados, independentemente dos filtros enviados.
        only_created_by = None if is_admin(user) else user.id
        return await self.tickets.search(filters, only_created_by)

    async def get(self, user: User, ticket_id: int) -> Ticket:
        ticket = await self.tickets.get(ticket_id)
        # Chamado alheio responde 404 para não revelar que ele existe.
        if ticket is None or not can_view(user, ticket):
            raise TicketNotFoundError()
        return ticket

    async def update(self, user: User, ticket_id: int, data: TicketUpdate) -> Ticket:
        ticket = await self.get(user, ticket_id)
        ensure_can_edit(user, ticket)

        values = data.model_dump(exclude_unset=True)
        if not await self.tickets.update_if_status(ticket.id, TicketStatus.OPEN, values):
            raise TicketChangedConcurrentlyError()
        await self.session.commit()
        await self.session.refresh(ticket)
        return ticket

    async def delete(self, user: User, ticket_id: int) -> None:
        ticket = await self.get(user, ticket_id)
        ensure_can_delete(user, ticket)

        expected_status = None if is_admin(user) else TicketStatus.OPEN
        if not await self.tickets.delete(ticket.id, expected_status):
            raise TicketChangedConcurrentlyError()
        await self.session.commit()

    async def perform(self, user: User, ticket_id: int, action: TicketAction) -> Ticket:
        """Executa uma transição de status e registra o evento na mesma transação."""
        ticket = await self.get(user, ticket_id)
        ensure_can_perform(user, ticket, action)
        source = ticket.status
        target = target_status(ticket, action)

        values: dict[str, object] = {"status": target}
        if action == TicketAction.ASSIGN:
            values["assigned_to_id"] = user.id
        changed = await self.tickets.update_if_status(
            ticket.id, source, values, require_unassigned=action == TicketAction.ASSIGN
        )
        if not changed:
            raise TicketChangedConcurrentlyError()

        self.tickets.add_event(
            TicketEvent(
                ticket_id=ticket.id,
                actor_id=user.id,
                action=action,
                from_status=source,
                to_status=target,
            )
        )
        await self.session.commit()
        await self.session.refresh(ticket)
        return ticket

    async def history(self, user: User, ticket_id: int) -> list[TicketEvent]:
        ticket = await self.get(user, ticket_id)
        return await self.tickets.list_events(ticket.id)
