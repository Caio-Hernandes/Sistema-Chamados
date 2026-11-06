from app.core.config import get_settings
from app.db.session import SessionLocal
from app.modules.users.repository import UserRepository
from app.modules.users.service import UserService


async def create_first_admin() -> None:
    """Cria o admin definido em FIRST_ADMIN_* se ele ainda não existir."""
    settings = get_settings()

    if not (settings.first_admin_email and settings.first_admin_password):
        return

    async with SessionLocal() as session:
        repository = UserRepository(session)

        service = UserService(
            session=session,
            users=repository,
        )

        await service.ensure_admin(
            settings.first_admin_name,
            settings.first_admin_email,
            settings.first_admin_password.get_secret_value(),
        )