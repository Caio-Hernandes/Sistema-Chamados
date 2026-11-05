"""Refresh token: cookies, persistence, rotation, replay and PostgreSQL concurrency."""

import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.core.security import hash_refresh_token
from app.modules.auth.models import RefreshToken
from app.modules.auth.repository import RefreshTokenRepository
from app.modules.auth.service import AuthService, AuthTokens
from app.modules.users.repository import UserRepository

USER = {"name": "Maria Silva", "email": "maria@example.com", "password": "s3cret-pass"}
CSRF_HEADERS = {"X-CSRF-Protection": "1"}
Sessionmaker = async_sessionmaker[AsyncSession]


async def register(client: AsyncClient) -> int:
    response = await client.post("/users", json=USER)
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def login(client: AsyncClient) -> tuple[str, str]:
    response = await client.post(
        "/auth/login",
        data={"username": USER["email"], "password": USER["password"]},
    )
    assert response.status_code == 200, response.text
    refresh_token = client.cookies.get("refresh_token")
    assert refresh_token is not None
    return response.json()["access_token"], refresh_token


def use_refresh_cookie(client: AsyncClient, token: str) -> None:
    """Simula o navegador apresentando um token específico (inclusive um antigo)."""
    client.cookies.clear()
    client.cookies.set("refresh_token", token, path="/auth")


async def get_records(sessionmaker: Sessionmaker) -> list[RefreshToken]:
    async with sessionmaker() as session:
        return list(
            (await session.scalars(select(RefreshToken).order_by(RefreshToken.created_at))).all()
        )


async def test_login_creates_hashed_refresh_token_and_http_only_cookie(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    user_id = await register(client)
    response = await client.post(
        "/auth/login", data={"username": USER["email"], "password": USER["password"]}
    )

    assert response.status_code == 200, response.text
    assert response.json()["token_type"] == "bearer"
    assert "refresh_token" not in response.json()

    raw = client.cookies.get("refresh_token")
    assert raw is not None
    cookie_header = response.headers["set-cookie"].lower()
    assert "httponly" in cookie_header
    assert "samesite=strict" in cookie_header
    assert "path=/auth" in cookie_header
    if get_settings().refresh_cookie_secure:
        assert "; secure" in cookie_header
    else:
        assert "; secure" not in cookie_header

    records = await get_records(sessionmaker)
    assert len(records) == 1
    assert records[0].user_id == user_id
    assert records[0].token_hash == hash_refresh_token(raw)
    assert records[0].token_hash != raw
    assert records[0].consumed_at is None
    assert records[0].revoked_at is None
    assert records[0].expires_at > datetime.now(UTC)


async def test_refresh_rotates_cookie_and_preserves_family(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    user_id = await register(client)
    _, original = await login(client)

    response = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert response.status_code == 200, response.text
    new = client.cookies.get("refresh_token")
    assert new is not None and new != original

    me = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {response.json()['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["id"] == user_id

    records = await get_records(sessionmaker)
    assert len(records) == 2
    by_hash = {record.token_hash: record for record in records}
    previous = by_hash[hash_refresh_token(original)]
    current = by_hash[hash_refresh_token(new)]
    assert previous.consumed_at is not None
    assert current.consumed_at is None
    assert previous.family_id == current.family_id
    assert previous.revoked_at is None
    assert current.revoked_at is None


async def test_refresh_without_cookie_is_unauthorized(client: AsyncClient) -> None:
    response = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert response.status_code == 401


async def test_refresh_requires_csrf_header(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    _, original = await login(client)
    response = await client.post("/auth/refresh")
    assert response.status_code == 403
    records = await get_records(sessionmaker)
    assert len(records) == 1
    assert records[0].token_hash == hash_refresh_token(original)
    assert records[0].consumed_at is None


async def test_refresh_rejects_unknown_token(client: AsyncClient) -> None:
    use_refresh_cookie(client, "invalid-token")
    response = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert response.status_code == 401


async def test_refresh_rejects_expired_token(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    await login(client)
    async with sessionmaker() as session:
        record = (await session.scalars(select(RefreshToken))).one()
        record.expires_at = datetime.now(UTC) - timedelta(seconds=1)
        await session.commit()

    response = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert response.status_code == 401
    assert len(await get_records(sessionmaker)) == 1


async def test_refresh_rejects_revoked_token(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    await login(client)
    async with sessionmaker() as session:
        record = (await session.scalars(select(RefreshToken))).one()
        record.revoked_at = datetime.now(UTC)
        await session.commit()

    response = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert response.status_code == 401
    assert len(await get_records(sessionmaker)) == 1


async def test_logout_revokes_family_and_clears_cookie(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    _, original = await login(client)
    refreshed = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert refreshed.status_code == 200
    rotated = client.cookies.get("refresh_token")
    assert rotated is not None

    logout = await client.post("/auth/logout", headers=CSRF_HEADERS)
    assert logout.status_code == 204
    assert client.cookies.get("refresh_token") is None
    assert "refresh_token=" in logout.headers.get("set-cookie", "")

    records = await get_records(sessionmaker)
    assert len(records) == 2
    assert all(record.revoked_at is not None for record in records)

    for old_token in (original, rotated):
        use_refresh_cookie(client, old_token)
        denied = await client.post("/auth/refresh", headers=CSRF_HEADERS)
        assert denied.status_code == 401


async def test_logout_without_cookie_is_idempotent(client: AsyncClient) -> None:
    response = await client.post("/auth/logout", headers=CSRF_HEADERS)
    assert response.status_code == 204


async def test_logout_requires_csrf_header(client: AsyncClient, sessionmaker: Sessionmaker) -> None:
    await register(client)
    await login(client)
    response = await client.post("/auth/logout")
    assert response.status_code == 403
    assert (await get_records(sessionmaker))[0].revoked_at is None


async def test_replay_outside_grace_period_revokes_entire_family(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    _, original = await login(client)
    response = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert response.status_code == 200
    rotated = client.cookies.get("refresh_token")
    assert rotated is not None

    async with sessionmaker() as session:
        old = (
            await session.scalars(
                select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(original))
            )
        ).one()
        old.consumed_at = datetime.now(UTC) - timedelta(seconds=10)
        await session.commit()

    use_refresh_cookie(client, original)
    replay = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert replay.status_code == 401
    records = await get_records(sessionmaker)
    assert len(records) == 2
    assert all(record.revoked_at is not None for record in records)

    use_refresh_cookie(client, rotated)
    rejected = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert rejected.status_code == 401


async def test_replay_within_grace_is_rejected_without_revoking_family(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    _, original = await login(client)
    first = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert first.status_code == 200
    rotated = client.cookies.get("refresh_token")
    assert rotated is not None

    use_refresh_cookie(client, original)
    replay = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert replay.status_code == 401
    assert all(record.revoked_at is None for record in await get_records(sessionmaker))

    use_refresh_cookie(client, rotated)
    next_refresh = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert next_refresh.status_code == 200


async def test_logout_one_session_does_not_revoke_another(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    await register(client)
    _, first = await login(client)
    _, second = await login(client)
    assert first != second

    use_refresh_cookie(client, first)
    logout = await client.post("/auth/logout", headers=CSRF_HEADERS)
    assert logout.status_code == 204

    records = await get_records(sessionmaker)
    by_hash = {record.token_hash: record for record in records}
    assert by_hash[hash_refresh_token(first)].revoked_at is not None
    assert by_hash[hash_refresh_token(second)].revoked_at is None

    use_refresh_cookie(client, second)
    refresh = await client.post("/auth/refresh", headers=CSRF_HEADERS)
    assert refresh.status_code == 200


async def test_concurrent_refresh_allows_only_one_winner(
    client: AsyncClient, sessionmaker: Sessionmaker
) -> None:
    """Usa duas conexões PostgreSQL reais, não duas chamadas na mesma sessão."""
    await register(client)
    _, original = await login(client)

    async def attempt() -> AuthTokens:
        async with sessionmaker() as session:
            service = AuthService(
                session=session,
                users=UserRepository(session),
                refresh_tokens=RefreshTokenRepository(session),
            )
            return await service.refresh(original)

    results = await asyncio.gather(attempt(), attempt(), return_exceptions=True)
    winners = [result for result in results if isinstance(result, AuthTokens)]
    losers = [result for result in results if isinstance(result, AuthenticationError)]
    assert len(winners) == 1, results
    assert len(losers) == 1, results

    records = await get_records(sessionmaker)
    assert len(records) == 2
    assert sum(record.consumed_at is None for record in records) == 1
    assert all(record.revoked_at is None for record in records)
