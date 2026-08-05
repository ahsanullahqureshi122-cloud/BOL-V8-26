from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.services.auth import create_access_token, get_or_create_default_admin, hash_password, verify_password
from backend.services.crud import serialize_record

router = APIRouter(tags=["auth"])


@router.post("/login")
def login(body: dict, db: Session = Depends(get_db)):
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    get_or_create_default_admin(db)
    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.id, {"username": user.username, "role": user.role})
    return {
        "success": True,
        "data": {"access_token": token, "token_type": "bearer", "user": serialize_record(user)},
        "source": "python-fastapi",
    }


@router.post("/logout")
def logout():
    return {"success": True, "data": {"message": "Logged out"}, "source": "python-fastapi"}


@router.get("/me")
def me(db: Session = Depends(get_db)):
    user = get_or_create_default_admin(db)
    return {"success": True, "data": serialize_record(user), "source": "python-fastapi"}


@router.post("/change-password")
def change_password(body: dict, db: Session = Depends(get_db)):
    username = str(body.get("username") or "admin").strip()
    current_password = str(body.get("current_password") or "")
    new_password = str(body.get("new_password") or "")
    user = db.query(User).filter(User.username == username).first()
    if user is None or not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    user.password_hash = hash_password(new_password)
    db.commit()
    return {"success": True, "data": {"username": username}, "source": "python-fastapi"}
