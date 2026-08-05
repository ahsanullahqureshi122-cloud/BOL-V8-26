from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import CompanySettings
from backend.services.crud import serialize_record, upsert_payload_record

router = APIRouter(tags=["account-ledgers"])

ACCOUNT_LEDGERS_KEY = "account-ledgers"


@router.get("")
def get_account_ledger_database(db: Session = Depends(get_db)):
    row = db.execute(select(CompanySettings).where(CompanySettings.key == ACCOUNT_LEDGERS_KEY)).scalar_one_or_none()
    data = row.payload if row else {"accounts": [], "ledgerEntries": {}, "ledgerProfiles": {}}
    return {"success": True, "data": data, "source": "python-fastapi"}


@router.post("")
def save_account_ledger_database(body: dict, db: Session = Depends(get_db)):
    payload = {
        "accounts": body.get("accounts") if isinstance(body.get("accounts"), list) else [],
        "ledgerEntries": body.get("ledgerEntries") if isinstance(body.get("ledgerEntries"), dict) else {},
        "ledgerProfiles": body.get("ledgerProfiles") if isinstance(body.get("ledgerProfiles"), dict) else {},
    }
    row = db.execute(select(CompanySettings).where(CompanySettings.key == ACCOUNT_LEDGERS_KEY)).scalar_one_or_none()
    record = upsert_payload_record(db, CompanySettings, {"key": ACCOUNT_LEDGERS_KEY, **payload}, record_id=row.id if row else None)
    record.key = ACCOUNT_LEDGERS_KEY
    record.payload = payload
    db.commit()
    db.refresh(record)
    return {"success": True, "data": payload, "record": serialize_record(record), "source": "python-fastapi"}
