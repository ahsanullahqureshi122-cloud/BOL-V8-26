from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import LedgerEntry
from backend.routes.generic import build_crud_router
from backend.services.crud import serialize_record

router = build_crud_router(LedgerEntry, "ledger-entries")


@router.get("/account/{account_id}/entries")
def list_account_entries(
    account_id: str,
    account_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    statement = select(LedgerEntry).where(LedgerEntry.account_id == account_id).order_by(LedgerEntry.created_at)
    if account_type:
        statement = statement.where(LedgerEntry.account_type == account_type)
    rows = db.execute(statement).scalars().all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}
