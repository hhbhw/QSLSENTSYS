from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.admin_user import AdminUser


def ensure_legacy_schema(db: Session) -> None:
    bind = db.get_bind()
    if bind is None or bind.dialect.name != "sqlite":
        return

    columns = {row[1] for row in db.execute(text("PRAGMA table_info(admin_users)")).all()}
    altered = False
    if "password_changed" not in columns:
        db.execute(text("ALTER TABLE admin_users ADD COLUMN password_changed BOOLEAN NOT NULL DEFAULT 0"))
        altered = True
    if "created_at" not in columns:
        db.execute(text("ALTER TABLE admin_users ADD COLUMN created_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"))
        altered = True
    if "updated_at" not in columns:
        db.execute(text("ALTER TABLE admin_users ADD COLUMN updated_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'"))
        altered = True
    if altered:
        db.commit()


def ensure_admin_user(db: Session) -> None:
    ensure_legacy_schema(db)

    existing = db.query(AdminUser).filter(AdminUser.username == settings.admin_username).first()
    if existing:
        return

    admin = AdminUser(
        username=settings.admin_username,
        hashed_password=get_password_hash(settings.admin_password),
        password_changed=False,
    )
    db.add(admin)
    db.commit()
