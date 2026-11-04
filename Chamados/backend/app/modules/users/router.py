from fastapi import APIRouter, status

from app.dependencies import CurrentUser, UserServiceDep
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Email is already registered."}},
)
async def register_user(data: UserCreate, service: UserServiceDep) -> User:
    return await service.register(data)


@router.get("/me", response_model=UserRead)
async def read_current_user(current_user: CurrentUser) -> User:
    return current_user
