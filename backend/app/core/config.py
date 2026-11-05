from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# O .env fica na raiz do repositório (junto do compose.yaml); comandos locais rodam
# de dentro de backend/. Um .env em backend/, se existir, tem precedência.
ENV_FILES = ("../.env", ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILES, extra="ignore")

    app_name: str = "Chamados API"
    database_url: str
    sql_echo: bool = False

    jwt_secret_key: SecretStr = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=30, gt=0)

    # Admin criado na inicialização, caso ainda não exista um usuário com este e-mail.
    first_admin_name: str = "Administrator"
    first_admin_email: str | None = None
    first_admin_password: SecretStr | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
