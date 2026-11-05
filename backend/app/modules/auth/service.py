import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    decode_access_token,
    verify_password,
)
from app.modules.users.models import User
from app.modules.users.repository import UserRepository


class InvalidCredentialsError(AuthenticationError):
    default_message = "Incorrect email or password."


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)

    async def login(self, email: str, password: str) -> str:
        user = await self.users.get_by_email(email.lower())
        # Verifica contra um hash fictício quando o e-mail não existe, para o tempo
        # de resposta ser parecido nos dois casos.
        password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
        password_ok = await asyncio.to_thread(verify_password, password, password_hash)
        if user is None or not password_ok:
            raise InvalidCredentialsError()
        return create_access_token(str(user.id))

    async def get_user_from_token(self, token: str) -> User:
        subject = decode_access_token(token)
        if not subject.isdigit():
            raise AuthenticationError()
        user = await self.users.get_by_id(int(subject))
        if user is None:
            raise AuthenticationError()
        return user
