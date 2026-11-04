from datetime import datetime
from enum import StrEnum
from typing import Annotated, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.modules.tickets.models import TicketAction, TicketCategory, TicketStatus

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)
]


class TicketCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    description: Description
    category: TicketCategory


class TicketUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title | None = None
    description: Description | None = None
    category: TicketCategory | None = None

    @model_validator(mode="after")
    def check_fields(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")
        null_fields = [name for name in self.model_fields_set if getattr(self, name) is None]
        if null_fields:
            raise ValueError(f"Fields cannot be null: {', '.join(sorted(null_fields))}.")
        return self


class TicketSortField(StrEnum):
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"
    TITLE = "title"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


class TicketFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: TicketStatus | None = None
    category: TicketCategory | None = None
    assigned_to_id: int | None = None
    created_by_id: int | None = None
    sort_by: TicketSortField = TicketSortField.CREATED_AT
    order: SortOrder = SortOrder.DESC
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: TicketCategory
    status: TicketStatus
    created_by_id: int
    assigned_to_id: int | None
    created_at: datetime
    updated_at: datetime


class TicketPage(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    items: list[TicketRead]
    total: int
    limit: int
    offset: int


class TicketEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: TicketAction
    from_status: TicketStatus
    to_status: TicketStatus
    actor_id: int
    created_at: datetime
