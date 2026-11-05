from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import RefreshToken


class RefreshTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_hash_for_update(
        self,
        token_hash: str,
    ) -> RefreshToken | None:
        stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()

        return await self.session.scalar(stmt)

    def add(self, token: RefreshToken) -> None:
        self.session.add(token)

    async def revoke_family(
        self,
        family_id: UUID,
        revoked_at: datetime,
    ) -> None:
        stmt = (
            update(RefreshToken)
            .where(
                RefreshToken.family_id == family_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
        )

        await self.session.execute(stmt)
