from __future__ import annotations

from typing import Any, Type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.crud import delete_record, get_record, list_records, serialize_record, upsert_payload_record


def build_crud_router(model: Type[Any], tag: str) -> APIRouter:
    router = APIRouter(tags=[tag])

    @router.get("")
    def list_items(q: str | None = Query(default=None), limit: int = Query(default=200), db: Session = Depends(get_db)):
        return {"success": True, "data": list_records(db, model, q=q, limit=limit), "source": "python-fastapi"}

    @router.get("/{record_id}")
    def get_item(record_id: str, db: Session = Depends(get_db)):
        record = get_record(db, model, record_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Record not found")
        return {"success": True, "data": serialize_record(record), "source": "python-fastapi"}

    @router.post("")
    def create_item(body: dict[str, Any], db: Session = Depends(get_db)):
        payload = body.get("payload") if isinstance(body.get("payload"), dict) else body
        record_id = body.get("id") if isinstance(body.get("id"), str) else payload.get("id")
        record = upsert_payload_record(db, model, payload, record_id=record_id)
        return {"success": True, "data": serialize_record(record), "source": "python-fastapi"}

    @router.put("/{record_id}")
    def update_item(record_id: str, body: dict[str, Any], db: Session = Depends(get_db)):
        payload = body.get("payload") if isinstance(body.get("payload"), dict) else body
        record = upsert_payload_record(db, model, payload, record_id=record_id)
        return {"success": True, "data": serialize_record(record), "source": "python-fastapi"}

    @router.delete("/{record_id}")
    def remove_item(record_id: str, db: Session = Depends(get_db)):
        if not delete_record(db, model, record_id):
            raise HTTPException(status_code=404, detail="Record not found")
        return {"success": True, "data": {"id": record_id}, "source": "python-fastapi"}

    return router
