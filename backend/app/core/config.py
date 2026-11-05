from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILES = ("../.env", ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILES,
        extra="ignore",
    )

    refresh_token_expire_days: int = Field(default=7, gt=0)
    refresh_cookie_secure: bool = Field(default=True)

    app_name: str = "Chamados API"
    database_url: str
    sql_echo: bool = False

    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_algorithm: str = "HS256"

    access_token_expire_minutes: int = Field(default=30, gt=0)

    refresh_token_expire_days: int = Field(default=7, gt=0)

    first_admin_name: str = "Administrator"
    first_admin_email: str | None = None
    first_admin_password: SecretStr | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
