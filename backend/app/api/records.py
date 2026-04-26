import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_edit_permission, require_view_permission
from app.db.session import get_db
from app.models.admin_user import AdminUser
from app.models.qsl_record import QslRecord
from app.schemas.qsl_record import PublicQslRecordResponse, QslRecordCreate, QslRecordResponse, QslRecordUpdate


router = APIRouter(prefix="/records", tags=["records"])


def _load_records(
    db: Session,
    *,
    callsign: str | None = None,
    extra_query: str | None = None,
    is_written: bool | None = None,
    is_sent: bool | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    exact_callsign: bool = False,
) -> tuple[list[QslRecord], int]:
    filters = []
    normalized_extra = extra_query.strip().upper() if extra_query else None

    if callsign:
        normalized = callsign.strip().upper()
        if exact_callsign:
            filters.append(func.upper(func.trim(QslRecord.callsign)) == normalized)
        else:
            filters.append(func.upper(func.trim(QslRecord.callsign)).contains(normalized))

    if is_written is not None:
        filters.append(QslRecord.is_written == is_written)

    if is_sent is not None:
        filters.append(QslRecord.is_sent == is_sent)

    where_clause = and_(*filters) if filters else True

    order_col = getattr(QslRecord, sort_by)
    order_spec = order_col.asc() if sort_order == "asc" else order_col.desc()

    records = db.execute(select(QslRecord).where(where_clause).order_by(order_spec)).scalars().all()

    if normalized_extra:
        records = [
            record
            for record in records
            if normalized_extra in json.dumps(record.extra_attributes or {}, ensure_ascii=False).upper()
        ]

    total = len(records)
    start = (page - 1) * page_size
    return records[start:start + page_size], total


@router.post("", response_model=QslRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: QslRecordCreate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_edit_permission),
) -> QslRecord:
    existing = db.execute(select(QslRecord).where(QslRecord.callsign == payload.callsign)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Callsign already exists")

    record = QslRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=dict)
def search_records(
    callsign: str | None = Query(default=None),
    extra_query: str | None = Query(default=None),
    is_written: bool | None = Query(default=None),
    is_sent: bool | None = Query(default=None),
    sort_by: str = Query(default="created_at", regex="^(callsign|created_at|updated_at)$"),
    sort_order: str = Query(default="desc", regex="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_view_permission),
) -> dict:
    records, total = _load_records(
        db,
        callsign=callsign,
        extra_query=extra_query,
        is_written=is_written,
        is_sent=is_sent,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    
    return {
        "data": [QslRecordResponse.model_validate(r) for r in records],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }


@router.get("/public", response_model=dict)
def public_lookup_records(
    callsign: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    if not callsign or not callsign.strip():
        return {
            "data": [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": 0,
                "total_pages": 0,
            },
        }

    records, total = _load_records(
        db,
        callsign=callsign,
        sort_by="updated_at",
        sort_order="desc",
        page=page,
        page_size=page_size,
        exact_callsign=False,
    )

    return {
        "data": [PublicQslRecordResponse.model_validate(r) for r in records],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_edit_permission),
) -> None:
    record = db.get(QslRecord, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    db.delete(record)
    db.commit()


@router.patch("/{record_id}", response_model=QslRecordResponse)
def update_record(
    record_id: int,
    payload: QslRecordUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_edit_permission),
) -> QslRecord:
    record = db.get(QslRecord, record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, key, value)

    db.add(record)
    db.commit()
    db.refresh(record)
    return record
