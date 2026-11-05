from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.users.models import UserRole
from app.modules.users.service import UserService

PASSWORD = "s3cret-pass"


@dataclass
class ApiUser:
    id: int
    headers: dict[str, str]


MakeUser = Callable[..., Awaitable[ApiUser]]


@pytest.fixture
def make_user(client: AsyncClient, sessionmaker: async_sessionmaker[AsyncSession]) -> MakeUser:
    """Cria um usuário (USER pelo cadastro público, ADMIN pelo service) e faz login."""

    async def _make_user(email: str, role: UserRole = UserRole.USER) -> ApiUser:
        if role == UserRole.ADMIN:
            async with sessionmaker() as session:
                await UserService(session).ensure_admin("Admin", email, PASSWORD)
        else:
            response = await client.post(
                "/users", json={"name": "User", "email": email, "password": PASSWORD}
            )
            assert response.status_code == 201, response.text

        response = await client.post("/auth/login", data={"username": email, "password": PASSWORD})
        assert response.status_code == 200, response.text
        headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        me = await client.get("/users/me", headers=headers)
        return ApiUser(id=me.json()["id"], headers=headers)

    return _make_user
