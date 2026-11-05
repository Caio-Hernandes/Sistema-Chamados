import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository
from app.modules.users.service import UserService


async def test_ensure_admin_creates_admin_once(
    sessionmaker: async_sessionmaker[AsyncSession],
) -> None:
    async with sessionmaker() as session:
        created = await UserService(session=session, users=UserRepository(session)).ensure_admin(
            "Admin", "Admin@Example.com", "pass1234"
        )
    async with sessionmaker() as session:
        created_again = await UserService(
            session=session, users=UserRepository(session)
        ).ensure_admin("Other", "admin@example.com", "x")
        admins = (await session.scalars(select(User))).all()

    assert created is True
    assert created_again is False
    assert len(admins) == 1
    assert admins[0].role == UserRole.ADMIN
    assert admins[0].name == "Admin"


@pytest.mark.parametrize(
    "statement",
    [
        "INSERT INTO users (name, email, password_hash) VALUES ('X', 'UPPER@example.com', 'h')",
        "INSERT INTO users (name, email, password_hash, role) "
        "VALUES ('X', 'x@example.com', 'h', 'ROOT')",
    ],
    ids=["email-not-lowercase", "unknown-role"],
)
async def test_database_constraints_reject_invalid_users(
    sessionmaker: async_sessionmaker[AsyncSession], statement: str
) -> None:
    async with sessionmaker() as session:
        with pytest.raises(IntegrityError):
            await session.execute(text(statement))
