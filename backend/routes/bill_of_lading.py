from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BillOfLading
from backend.routes.generic import build_crud_router

router = build_crud_router(BillOfLading, "bill-of-lading")


@router.get("/tools/next-number")
def next_bol_number(db: Session = Depends(get_db)):
    year = datetime.now().year
    count = db.query(BillOfLading).count() + 1
    return {"success": True, "bolNumber": f"BOL-{year}-NSA{count:03d}", "source": "python-fastapi"}
