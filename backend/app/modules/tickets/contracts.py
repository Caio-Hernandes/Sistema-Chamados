from typing import Any, Protocol

from app.modules.tickets.models import Ticket, TicketEvent, TicketStatus
from app.modules.tickets.schemas import TicketFilters


class TicketRepositoryProtocol(Protocol):
    async def get(self, ticket_id: int) -> Ticket | None: ...

    def add(self, ticket: Ticket) -> None: ...

    def add_event(self, event: TicketEvent) -> None: ...

    async def search(
        self,
        filters: TicketFilters,
        created_by_id: int | None,
    ) -> tuple[list[Ticket], int]: ...

    async def update_if_status(
        self,
        ticket_id: int,
        expected_status: TicketStatus,
        values: dict[str, Any],
        *,
        require_unassigned: bool = False,
    ) -> bool: ...

    async def delete(
        self,
        ticket_id: int,
        expected_status: TicketStatus | None = None,
    ) -> bool: ...

    async def list_events(self, ticket_id: int) -> list[TicketEvent]: ...
