from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.dependencies import AuthServiceDep
from app.modules.auth.schemas import Token

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth"


def set_refresh_cookie(
    response: Response,
    token: str,
) -> None:
    settings = get_settings()

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="strict",
        path=REFRESH_COOKIE_PATH,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
    )


def delete_refresh_cookie(response: Response) -> None:
    settings = get_settings()

    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.refresh_cookie_secure,
        samesite="strict",
    )


def validate_csrf_header(request: Request) -> None:
    # Cabeçalho não enviável por formulários HTML simples.
    # Requer CORS restrito para ser uma proteção efetiva.
    if request.headers.get("X-CSRF-Protection") != "1":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing CSRF protection header.",
        )


@router.post(
    "/login",
    response_model=Token,
    responses={
        401: {"description": "Incorrect email or password."},
    },
)
async def login(
    response: Response,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: AuthServiceDep,
) -> Token:
    tokens = await service.login(
        form.username,
        form.password,
    )

    set_refresh_cookie(
        response,
        tokens.refresh_token,
    )

    return Token(access_token=tokens.access_token)


@router.post(
    "/refresh",
    response_model=Token,
    responses={
        401: {"description": "Invalid or expired refresh token."},
        403: {"description": "Missing CSRF protection header."},
    },
)
async def refresh(
    request: Request,
    response: Response,
    service: AuthServiceDep,
) -> Token:
    validate_csrf_header(request)

    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not refresh_token:
        raise AuthenticationError()

    tokens = await service.refresh(refresh_token)

    set_refresh_cookie(
        response,
        tokens.refresh_token,
    )

    return Token(access_token=tokens.access_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        403: {"description": "Missing CSRF protection header."},
    },
)
async def logout(
    request: Request,
    response: Response,
    service: AuthServiceDep,
) -> None:
    validate_csrf_header(request)

    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if refresh_token:
        await service.logout(refresh_token)

    delete_refresh_cookie(response)
