from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class QslRecordBase(BaseModel):
    callsign: str = Field(min_length=2, max_length=32)
    card_type: str = Field(min_length=1, max_length=128)
    is_written: bool = False
    is_sent: bool = False
    extra_attributes: dict[str, str] = Field(default_factory=dict)

    @field_validator("callsign")
    @classmethod
    def normalize_callsign(cls, value: str) -> str:
        return value.strip().upper()


class QslRecordCreate(QslRecordBase):
    pass


class QslRecordUpdate(BaseModel):
    card_type: str | None = Field(default=None, min_length=1, max_length=128)
    is_written: bool | None = None
    is_sent: bool | None = None
    extra_attributes: dict[str, str] | None = None


class QslRecordResponse(QslRecordBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicQslRecordResponse(BaseModel):
    callsign: str
    is_written: bool
    is_sent: bool

    model_config = {"from_attributes": True}
