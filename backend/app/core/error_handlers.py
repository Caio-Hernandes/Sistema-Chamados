from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    DomainError,
    NotFoundError,
    PermissionDeniedError,
)

DOMAIN_ERROR_STATUS: dict[type[DomainError], int] = {
    AuthenticationError: status.HTTP_401_UNAUTHORIZED,
    PermissionDeniedError: status.HTTP_403_FORBIDDEN,
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ConflictError: status.HTTP_409_CONFLICT,
}


def status_code_for(exc: DomainError) -> int:
    for error_type, status_code in DOMAIN_ERROR_STATUS.items():
        if isinstance(exc, error_type):
            return status_code
    return status.HTTP_400_BAD_REQUEST


async def handle_domain_error(_: Request, exc: DomainError) -> JSONResponse:
    headers = None
    if isinstance(exc, AuthenticationError):
        headers = {"WWW-Authenticate": "Bearer"}
    return JSONResponse(
        status_code=status_code_for(exc), content={"detail": exc.message}, headers=headers
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, handle_domain_error)
