from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.session import create_engine
from app.main import app
from tests.conftest import override_session


async def test_health_reports_database_ok(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


async def test_health_returns_503_when_database_is_unreachable() -> None:
    unreachable = create_engine("postgresql+asyncpg://nobody:nothing@127.0.0.1:1/none")
    override_session(async_sessionmaker(unreachable))
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/health")
    finally:
        app.dependency_overrides.clear()
        await unreachable.dispose()

    assert response.status_code == 503
    assert response.json()["database"] == "unreachable"
