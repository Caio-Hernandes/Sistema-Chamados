"""Ponto de entrada do Alembic: conecta no banco e aplica as migrações."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

import app.modules.tickets.models  # noqa: F401  (registra as tabelas no metadata)
import app.modules.users.models  # noqa: F401
from app.core.config import get_settings
from app.db.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


def run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()


async def main() -> None:
    # Os testes informam a URL do banco de teste; fora deles vale DATABASE_URL.
    url = config.get_main_option("sqlalchemy.url") or get_settings().database_url
    engine = create_async_engine(url, poolclass=pool.NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(run_migrations)
    await engine.dispose()


asyncio.run(main())
