from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.database import get_db
from backend.models import LedgerEntry
from backend.routes.generic import build_crud_router
from backend.schemas.core import LedgerEntryCreate, LedgerEntryUpdate
from backend.services.crud import serialize_record

router = build_crud_router(
    LedgerEntry,
    "ledger-entries",
    create_schema=LedgerEntryCreate,
    update_schema=LedgerEntryUpdate
)


@router.get("/account/{account_id}/entries")
async def list_account_entries(
    account_id: str,
    account_type: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(LedgerEntry).where(LedgerEntry.account_id == account_id)
    if account_type:
        stmt = stmt.where(LedgerEntry.account_type == account_type)
    
    result = await db.execute(stmt)
    records = result.scalars().all()
    
    return {"success": True, "data": [serialize_record(r) for r in records], "source": "python-fastapi"}
