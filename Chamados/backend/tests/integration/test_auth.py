from httpx import AsyncClient

from app.core.security import create_access_token

USER = {"name": "Maria Silva", "email": "maria@example.com", "password": "s3cret-pass"}


async def register(client: AsyncClient, **overrides: str) -> dict:
    response = await client.post("/users", json={**USER, **overrides})
    assert response.status_code == 201, response.text
    return response.json()


async def login(client: AsyncClient, email: str, password: str) -> str:
    response = await client.post("/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


async def test_register_creates_user_with_default_role(client: AsyncClient) -> None:
    body = await register(client)

    assert body["email"] == "maria@example.com"
    assert body["role"] == "USER"
    assert "password" not in body
    assert "password_hash" not in body


async def test_register_rejects_role_sent_by_client(client: AsyncClient) -> None:
    response = await client.post("/users", json={**USER, "role": "ADMIN"})

    assert response.status_code == 422


async def test_register_rejects_duplicate_email_case_insensitively(client: AsyncClient) -> None:
    await register(client)

    response = await client.post("/users", json={**USER, "email": "MARIA@Example.com"})

    assert response.status_code == 409


async def test_register_validates_input(client: AsyncClient) -> None:
    short_password = await client.post("/users", json={**USER, "password": "123"})
    invalid_email = await client.post("/users", json={**USER, "email": "not-an-email"})
    blank_name = await client.post("/users", json={**USER, "name": "   "})

    assert short_password.status_code == 422
    assert invalid_email.status_code == 422
    assert blank_name.status_code == 422


async def test_login_returns_token_that_authenticates_me(client: AsyncClient) -> None:
    user = await register(client)
    token = await login(client, "Maria@Example.com", USER["password"])

    response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert response.json()["id"] == user["id"]


async def test_login_rejects_wrong_password_and_unknown_email(client: AsyncClient) -> None:
    await register(client)

    wrong_password = await client.post(
        "/auth/login", data={"username": USER["email"], "password": "wrong-pass"}
    )
    unknown_email = await client.post(
        "/auth/login", data={"username": "nobody@example.com", "password": "whatever"}
    )

    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


async def test_me_requires_valid_token(client: AsyncClient) -> None:
    missing = await client.get("/users/me")
    invalid = await client.get("/users/me", headers={"Authorization": "Bearer not-a-jwt"})
    unknown_user = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {create_access_token('999999')}"}
    )

    assert missing.status_code == 401
    assert invalid.status_code == 401
    assert unknown_user.status_code == 401
    assert invalid.headers["WWW-Authenticate"] == "Bearer"
