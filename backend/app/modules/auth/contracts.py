from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.modules.auth.models import RefreshToken
from app.modules.users.models import User


class AuthUserRepositoryProtocol(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    async def get_by_id(self, user_id: int) -> User | None: ...


class RefreshTokenRepositoryProtocol(Protocol):
    async def get_by_hash_for_update(
        self,
        token_hash: str,
    ) -> RefreshToken | None: ...

    def add(self, token: RefreshToken) -> None: ...

    async def revoke_family(
        self,
        family_id: UUID,
        revoked_at: datetime,
    ) -> None: ...
