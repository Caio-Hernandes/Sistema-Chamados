from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.dependencies import CurrentUser, TicketServiceDep
from app.modules.tickets.models import Ticket, TicketAction, TicketEvent
from app.modules.tickets.schemas import (
    TicketCreate,
    TicketEventRead,
    TicketFilters,
    TicketPage,
    TicketRead,
    TicketUpdate,
)

router = APIRouter(prefix="/tickets", tags=["tickets"])

ERRORS = {
    403: {"description": "Not allowed for this user."},
    404: {"description": "Ticket not found."},
    409: {"description": "Not allowed in the ticket's current status."},
}


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
async def create_ticket(data: TicketCreate, user: CurrentUser, service: TicketServiceDep) -> Ticket:
    return await service.create(user, data)


@router.get("", response_model=TicketPage)
async def list_tickets(
    filters: Annotated[TicketFilters, Query()], user: CurrentUser, service: TicketServiceDep
) -> TicketPage:
    """USER recebe apenas os próprios chamados; ADMIN recebe todos."""
    tickets, total = await service.search(user, filters)
    return TicketPage.model_validate(
        {"items": tickets, "total": total, "limit": filters.limit, "offset": filters.offset}
    )


@router.get("/{ticket_id}", response_model=TicketRead, responses=ERRORS)
async def get_ticket(ticket_id: int, user: CurrentUser, service: TicketServiceDep) -> Ticket:
    return await service.get(user, ticket_id)


@router.patch("/{ticket_id}", response_model=TicketRead, responses=ERRORS)
async def update_ticket(
    ticket_id: int, data: TicketUpdate, user: CurrentUser, service: TicketServiceDep
) -> Ticket:
    """Somente o criador, enquanto o chamado está OPEN."""
    return await service.update(user, ticket_id, data)


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT, responses=ERRORS)
async def delete_ticket(ticket_id: int, user: CurrentUser, service: TicketServiceDep) -> Response:
    """O criador enquanto OPEN; ADMIN em qualquer status."""
    await service.delete(user, ticket_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{ticket_id}/assign", response_model=TicketRead, responses=ERRORS)
async def assign_ticket(ticket_id: int, user: CurrentUser, service: TicketServiceDep) -> Ticket:
    """ADMIN assume um chamado OPEN: OPEN → IN_PROGRESS."""
    return await service.perform(user, ticket_id, TicketAction.ASSIGN)


@router.post("/{ticket_id}/resolve", response_model=TicketRead, responses=ERRORS)
async def resolve_ticket(ticket_id: int, user: CurrentUser, service: TicketServiceDep) -> Ticket:
    """O ADMIN responsável resolve: IN_PROGRESS → RESOLVED."""
    return await service.perform(user, ticket_id, TicketAction.RESOLVE)


@router.post("/{ticket_id}/close", response_model=TicketRead, responses=ERRORS)
async def close_ticket(ticket_id: int, user: CurrentUser, service: TicketServiceDep) -> Ticket:
    """O criador ou um ADMIN encerra: RESOLVED → CLOSED."""
    return await service.perform(user, ticket_id, TicketAction.CLOSE)


@router.post("/{ticket_id}/reopen", response_model=TicketRead, responses=ERRORS)
async def reopen_ticket(ticket_id: int, user: CurrentUser, service: TicketServiceDep) -> Ticket:
    """O criador reabre: RESOLVED → IN_PROGRESS, com o mesmo responsável."""
    return await service.perform(user, ticket_id, TicketAction.REOPEN)


@router.get("/{ticket_id}/history", response_model=list[TicketEventRead], responses=ERRORS)
async def ticket_history(
    ticket_id: int, user: CurrentUser, service: TicketServiceDep
) -> list[TicketEvent]:
    return await service.history(user, ticket_id)
