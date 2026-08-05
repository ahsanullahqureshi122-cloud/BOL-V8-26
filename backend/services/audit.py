from __future__ import annotations

from sqlalchemy.orm import Session

from backend.models import AuditLog


def audit(db: Session, action: str, entity_type: str = "", entity_id: str = "", user_id: str = "", payload: dict | None = None) -> AuditLog:
    row = AuditLog(action=action, entity_type=entity_type, entity_id=entity_id, user_id=user_id, payload=payload or {})
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
