import asyncio

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.core.security import hash_password
from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import UserCreate


class EmailAlreadyRegisteredError(ConflictError):
    default_message = "Email is already registered."


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def register(self, data: UserCreate) -> User:
        """Cadastro público: sempre cria um USER, independentemente do que o cliente envie."""
        return await self._create(data.name, data.email, data.password, UserRole.USER)

    async def ensure_admin(self, name: str, email: str, password: str) -> bool:
        """Cria o admin inicial se o e-mail ainda não existir.

        Idempotente pela chave `email`: se já houver usuário com esse e-mail, nada muda
        (o papel e a senha existentes são mantidos). Retorna True se criou o usuário.
        """
        try:
            await self._create(name, email.lower(), password, UserRole.ADMIN)
        except EmailAlreadyRegisteredError:
            return False
        return True

    async def _create(self, name: str, email: str, password: str, role: UserRole) -> User:
        if await self.users.get_by_email(email) is not None:
            raise EmailAlreadyRegisteredError()

        # Argon2 é CPU-bound; roda fora do event loop.
        password_hash = await asyncio.to_thread(hash_password, password)
        user = User(name=name, email=email, password_hash=password_hash, role=role)
        self.users.add(user)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            # Dois cadastros simultâneos com o mesmo e-mail: a constraint UNIQUE decide.
            await self.session.rollback()
            raise EmailAlreadyRegisteredError() from exc
        await self.session.refresh(user)
        return user
