import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.modules.auth.contracts import (
    AuthUserRepositoryProtocol,
    RefreshTokenRepositoryProtocol,
)
from app.modules.auth.models import RefreshToken
from app.modules.users.models import User


class InvalidCredentialsError(AuthenticationError):
    default_message = "Incorrect email or password."


@dataclass(frozen=True)
class AuthTokens:
    access_token: str
    refresh_token: str


class AuthService:
    # Evita revogar a sessão por duas requisições legítimas
    # que tentaram renovar o mesmo token quase simultaneamente.
    REPLAY_GRACE_SECONDS = 3

    def __init__(
        self,
        session: AsyncSession,
        users: AuthUserRepositoryProtocol,
        refresh_tokens: RefreshTokenRepositoryProtocol,
    ) -> None:
        self.session = session
        self.users = users
        self.refresh_tokens = refresh_tokens

    async def login(
        self,
        email: str,
        password: str,
    ) -> AuthTokens:
        user = await self.users.get_by_email(email.lower())

        password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH

        password_ok = await asyncio.to_thread(
            verify_password,
            password,
            password_hash,
        )

        if user is None or not password_ok:
            raise InvalidCredentialsError()

        now = datetime.now(UTC)
        settings = get_settings()

        refresh_token = generate_refresh_token()

        token_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            family_id=uuid4(),
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        )

        access_token = create_access_token(str(user.id))

        self.refresh_tokens.add(token_record)

        await self.session.commit()

        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def refresh(
        self,
        refresh_token: str,
    ) -> AuthTokens:
        token_hash = hash_refresh_token(refresh_token)

        record = await self.refresh_tokens.get_by_hash_for_update(token_hash)

        if record is None:
            raise AuthenticationError()

        now = datetime.now(UTC)

        # Token já utilizado anteriormente.
        if record.consumed_at is not None:
            elapsed = now - record.consumed_at

            if elapsed > timedelta(seconds=self.REPLAY_GRACE_SECONDS):
                # Possível reutilização indevida:
                # revoga todos os tokens da mesma sessão.
                await self.refresh_tokens.revoke_family(
                    record.family_id,
                    now,
                )

                await self.session.commit()

            raise AuthenticationError()

        # Token revogado ou expirado.
        if record.revoked_at is not None or record.expires_at <= now:
            raise AuthenticationError()

        user = await self.users.get_by_id(record.user_id)

        if user is None:
            raise AuthenticationError()

        settings = get_settings()

        new_refresh_token = generate_refresh_token()

        new_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(new_refresh_token),
            family_id=record.family_id,
            expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        )

        # O token antigo deixa de ser utilizável.
        record.consumed_at = now

        self.refresh_tokens.add(new_record)

        access_token = create_access_token(str(user.id))

        # A marcação do token antigo e a criação do novo
        # acontecem na mesma transação.
        await self.session.commit()

        return AuthTokens(
            access_token=access_token,
            refresh_token=new_refresh_token,
        )

    async def logout(
        self,
        refresh_token: str,
    ) -> None:
        token_hash = hash_refresh_token(refresh_token)

        record = await self.refresh_tokens.get_by_hash_for_update(token_hash)

        if record is None:
            return

        await self.refresh_tokens.revoke_family(
            record.family_id,
            datetime.now(UTC),
        )

        await self.session.commit()

    async def get_user_from_token(
        self,
        token: str,
    ) -> User:
        subject = decode_access_token(token)

        if not subject.isdigit():
            raise AuthenticationError()

        user = await self.users.get_by_id(int(subject))

        if user is None:
            raise AuthenticationError()

        return user
