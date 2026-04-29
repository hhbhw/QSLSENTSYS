"""
One-time migration: move extra_attributes["SEND"] -> send field.

Run from backend/ directory:
    python migrate_send_field.py

Safe to run multiple times (skips records that are already migrated).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.qsl_record import QslRecord
from sqlalchemy import select


def migrate():
    db = SessionLocal()
    try:
        records = db.execute(select(QslRecord)).scalars().all()
        migrated = 0
        for record in records:
            extra = dict(record.extra_attributes or {})
            # Find SEND key case-insensitively
            send_key = next((k for k in extra if k.upper() == "SEND"), None)
            if send_key is None:
                continue
            send_val = extra[send_key]
            # Only overwrite if the fixed send field is still empty
            if not record.send and send_val:
                record.send = send_val
            # Remove the key from extra_attributes regardless
            extra.pop(send_key)
            record.extra_attributes = extra
            migrated += 1

        db.commit()
        print(f"Done. Migrated {migrated} record(s).")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
