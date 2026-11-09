from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers
from app.db.session import engine
from app.modules.auth.router import router as auth_router
from app.modules.health.router import router as health_router
from app.modules.tickets.router import router as tickets_router
from app.modules.users.bootstrap import create_first_admin
from app.modules.users.router import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    await create_first_admin()
    yield
    await engine.dispose() # engine é o objeto de conexão com o db do SQLAlchemy, dispose libera o pool


app = FastAPI(title=get_settings().app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-CSRF-Protection",
    ],
)

register_exception_handlers(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(tickets_router)
