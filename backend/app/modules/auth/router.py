from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.dependencies import AuthServiceDep
from app.modules.auth.schemas import Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", responses={401: {"description": "Incorrect email or password."}})
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()], service: AuthServiceDep
) -> Token:
    """Login no padrão OAuth2 password flow: o campo `username` recebe o e-mail."""
    access_token = await service.login(form.username, form.password)
    return Token(access_token=access_token)
