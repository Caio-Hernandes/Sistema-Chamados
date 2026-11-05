import asyncio
from collections.abc import AsyncIterator, Iterator

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import ENV_FILES
from app.db.base import Base
from app.db.session import create_engine
from app.dependencies import get_session
from app.main import app


class TestSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILES, extra="ignore")

    test_database_url: str


test_settings = TestSettings()


async def create_test_database(database_url: str) -> None:
    url = make_url(database_url)
    server = create_engine(url.set(database="postgres").render_as_string(hide_password=False))
    async with server.execution_options(isolation_level="AUTOCOMMIT").connect() as connection:
        exists = await connection.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": url.database}
        )
        if not exists:
            name = connection.dialect.identifier_preparer.quote(url.database)
            await connection.execute(text(f"CREATE DATABASE {name}"))
    await server.dispose()


@pytest.fixture(scope="session", autouse=True)
def apply_migrations() -> Iterator[None]:
    asyncio.run(create_test_database(test_settings.test_database_url))
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", test_settings.test_database_url.replace("%", "%%"))
    command.upgrade(config, "head")
    yield


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    engine = create_engine(test_settings.test_database_url)
    yield engine
    # Cada teste começa com as tabelas vazias.
    tables = ", ".join(table.name for table in Base.metadata.sorted_tables)
    async with engine.begin() as connection:
        await connection.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    await engine.dispose()


@pytest.fixture
def sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


def override_session(sessionmaker: async_sessionmaker[AsyncSession]) -> None:
    async def _get_session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as session:
            yield session

    app.dependency_overrides[get_session] = _get_session


@pytest.fixture
async def client(sessionmaker: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncClient]:
    override_session(sessionmaker)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as client:
        yield client
    app.dependency_overrides.clear()
