from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
    hash_password,
    verify_password,
)


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    password_hash = hash_password("s3cret-pass")

    assert password_hash != "s3cret-pass"
    assert password_hash.startswith("$argon2id$")
    assert verify_password("s3cret-pass", password_hash)
    assert not verify_password("wrong-pass", password_hash)


def test_access_token_round_trip_returns_subject() -> None:
    token = create_access_token("42")

    assert decode_access_token(token) == "42"


def test_expired_token_is_rejected() -> None:
    token = create_access_token("42", expires_delta=timedelta(seconds=-1))

    with pytest.raises(AuthenticationError):
        decode_access_token(token)


def test_token_signed_with_another_key_is_rejected() -> None:
    now = datetime.now(UTC)
    payload = {"sub": "42", "iat": now, "exp": now + timedelta(minutes=5)}
    token = jwt.encode(payload, "another-secret-key-with-at-least-32-chars", algorithm="HS256")

    with pytest.raises(AuthenticationError):
        decode_access_token(token)


def test_token_without_subject_is_rejected() -> None:
    settings = get_settings()
    now = datetime.now(UTC)
    token = jwt.encode(
        {"iat": now, "exp": now + timedelta(minutes=5)},
        settings.jwt_secret_key.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )

    with pytest.raises(AuthenticationError):
        decode_access_token(token)


def test_refresh_token_is_random_and_hash_is_deterministic() -> None:
    first = generate_refresh_token()
    second = generate_refresh_token()

    assert first != second
    assert len(first) >= 64
    assert len(hash_refresh_token(first)) == 64
    assert hash_refresh_token(first) == hash_refresh_token(first)
    assert hash_refresh_token(first) != hash_refresh_token(second)
    assert first != hash_refresh_token(first)
