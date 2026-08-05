from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BillOfLading, ExportAccount, ImportAccount, Invoice, LedgerEntry, MediaFile, Truck
from backend.services.crud import serialize_record

router = APIRouter(tags=["reports"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    debit = db.execute(select(func.coalesce(func.sum(LedgerEntry.debit), 0))).scalar_one()
    credit = db.execute(select(func.coalesce(func.sum(LedgerEntry.credit), 0))).scalar_one()
    return {
        "success": True,
        "data": {
            "invoices": db.query(Invoice).count(),
            "bill_of_lading": db.query(BillOfLading).count(),
            "import_accounts": db.query(ImportAccount).count(),
            "export_accounts": db.query(ExportAccount).count(),
            "ledger_entries": db.query(LedgerEntry).count(),
            "trucks": db.query(Truck).count(),
            "media_files": db.query(MediaFile).count(),
            "total_debit": round((debit or 0) / 100, 2),
            "total_credit": round((credit or 0) / 100, 2),
            "balance": round(((debit or 0) - (credit or 0)) / 100, 2),
        },
        "source": "python-fastapi",
    }


@router.get("/monthly")
def monthly(db: Session = Depends(get_db)):
    return {
        "success": True,
        "data": {
            "summary": summary(db)["data"],
            "invoices": [serialize_record(row) for row in db.query(Invoice).order_by(Invoice.created_at.desc()).limit(100).all()],
            "ledger_entries": [serialize_record(row) for row in db.query(LedgerEntry).order_by(LedgerEntry.created_at.desc()).limit(100).all()],
        },
        "source": "python-fastapi",
    }


@router.get("/customer")
def customer_report(q: str = "", db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(Invoice.customer_name.ilike(f"%{q}%")).limit(200).all() if q else db.query(Invoice).limit(200).all()
    return {"success": True, "data": [serialize_record(row) for row in invoices], "source": "python-fastapi"}


@router.get("/shipper")
def shipper_report(q: str = "", db: Session = Depends(get_db)):
    bol_rows = db.query(BillOfLading).filter(BillOfLading.shipper_name.ilike(f"%{q}%")).limit(200).all() if q else db.query(BillOfLading).limit(200).all()
    return {"success": True, "data": [serialize_record(row) for row in bol_rows], "source": "python-fastapi"}


@router.get("/container")
def container_report(q: str = "", db: Session = Depends(get_db)):
    trucks = db.query(Truck).filter(Truck.container_number.ilike(f"%{q}%")).limit(200).all() if q else db.query(Truck).limit(200).all()
    return {"success": True, "data": [serialize_record(row) for row in trucks], "source": "python-fastapi"}


@router.get("/detention-demurrage")
def detention_demurrage_report(db: Session = Depends(get_db)):
    rows = db.query(LedgerEntry).filter(
        (LedgerEntry.invoice_no.ilike("%detention%")) | (LedgerEntry.invoice_no.ilike("%demurrage%"))
    ).limit(200).all()
    return {"success": True, "data": [serialize_record(row) for row in rows], "source": "python-fastapi"}
