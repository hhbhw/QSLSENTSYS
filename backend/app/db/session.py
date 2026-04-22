from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from pathlib import Path
from collections.abc import Generator

from app.core.config import settings


def _normalize_database_url(raw_url: str) -> str:
    if raw_url.startswith("sqlite:///./"):
        db_name = raw_url.removeprefix("sqlite:///./")
        backend_root = Path(__file__).resolve().parents[2]
        db_path = (backend_root / db_name).resolve()
        return f"sqlite:///{db_path.as_posix()}"
    return raw_url


database_url = _normalize_database_url(settings.database_url)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
