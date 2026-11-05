from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
import hashlib
import secrets

# Argon2id com os parâmetros recomendados pela pwdlib.
password_hasher = PasswordHash.recommended()

# Usado quando o e-mail não existe, para que o tempo de resposta do login não
# revele quais e-mails estão cadastrados.
DUMMY_PASSWORD_HASH = password_hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_delta = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "iat": now, "exp": now + expires_delta}
    return jwt.encode(
        payload, settings.jwt_secret_key.get_secret_value(), algorithm=settings.jwt_algorithm
    )


def decode_access_token(token: str) -> str:
    """Valida assinatura, expiração e claims obrigatórias; retorna o `sub`."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError() from exc
    return payload["sub"]


def generate_refresh_token() -> str:
    """Gera um token criptograficamente aleatório."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """Calcula o SHA-256 do refresh token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
