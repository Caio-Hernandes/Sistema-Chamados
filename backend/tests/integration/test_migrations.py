from alembic import command
from alembic.config import Config

from tests.conftest import test_settings


def test_migrations_downgrade_to_base_and_upgrade_back() -> None:
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", test_settings.test_database_url.replace("%", "%%"))

    command.downgrade(config, "base")
    command.upgrade(config, "head")
