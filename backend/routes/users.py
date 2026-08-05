from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.services.auth import hash_password
from backend.services.crud import serialize_record

router = APIRouter(tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {"success": True, "data": [serialize_record(user) for user in users], "source": "python-fastapi"}


@router.post("")
def create_user(body: dict, db: Session = Depends(get_db)):
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "admin").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(
        username=username,
        display_name=str(body.get("display_name") or username),
        role=str(body.get("role") or "user"),
        password_hash=hash_password(password),
        is_active=1 if body.get("is_active", True) else 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": serialize_record(user), "source": "python-fastapi"}


@router.put("/{user_id}")
def update_user(user_id: str, body: dict, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    for key in ("display_name", "role"):
        if key in body:
            setattr(user, key, str(body.get(key) or ""))
    if "is_active" in body:
        user.is_active = 1 if body.get("is_active") else 0
    if body.get("password"):
        user.password_hash = hash_password(str(body["password"]))
    db.commit()
    db.refresh(user)
    return {"success": True, "data": serialize_record(user), "source": "python-fastapi"}


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"success": True, "data": {"id": user_id}, "source": "python-fastapi"}
