from typing import Protocol

from app.modules.users.models import User


class UserRepositoryProtocol(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    def add(self, user: User) -> None: ...
