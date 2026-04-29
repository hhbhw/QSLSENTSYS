from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QslRecord(Base):
    __tablename__ = "qsl_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    callsign: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    card_type: Mapped[str] = mapped_column(String(128), nullable=False)
    is_written: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    send: Mapped[str] = mapped_column(String(128), nullable=False, default='', server_default='')
    extra_attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
