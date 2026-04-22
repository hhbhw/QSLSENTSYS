from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, records, users
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.services.bootstrap import ensure_admin_user


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_admin_user(db)
    finally:
        db.close()


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(records.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
