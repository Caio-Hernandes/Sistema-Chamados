from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

from app.core.config import get_settings


def create_engine(database_url: str, echo: bool = False) -> AsyncEngine:
    return create_async_engine(database_url, echo=echo, pool_pre_ping=True)


settings = get_settings()
engine = create_engine(settings.database_url, echo=settings.sql_echo)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
