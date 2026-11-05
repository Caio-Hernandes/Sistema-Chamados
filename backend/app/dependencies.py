from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal

from app.modules.auth.repository import RefreshTokenRepository
from app.modules.auth.service import AuthService

from app.modules.tickets.repository import TicketRepository
from app.modules.tickets.service import TicketService

from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.service import UserService


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_auth_service(session: SessionDep) -> AuthService:
    return AuthService(
        session=session,
        users=UserRepository(session),
        refresh_tokens=RefreshTokenRepository(session),
    )


def get_user_service(session: SessionDep) -> UserService:
    return UserService(
        session=session,
        users=UserRepository(session),
    )


def get_ticket_service(session: SessionDep) -> TicketService:
    return TicketService(
        session=session,
        tickets=TicketRepository(session),
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]

UserServiceDep = Annotated[UserService, Depends(get_user_service)]

TicketServiceDep = Annotated[TicketService, Depends(get_ticket_service)]


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    service: AuthServiceDep,
) -> User:
    return await service.get_user_from_token(token)


CurrentUser = Annotated[User, Depends(get_current_user)]
