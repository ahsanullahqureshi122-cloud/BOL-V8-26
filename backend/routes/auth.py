from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User
from backend.services.auth import create_access_token, get_or_create_default_admin, hash_password, verify_password
from backend.services.crud import serialize_record

router = APIRouter(tags=["auth"])


@router.post("/login")
async def login(body: dict, db: AsyncSession = Depends(get_db)):
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    await get_or_create_default_admin(db)
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.id, {"username": user.username, "role": user.role})
    return {
        "success": True,
        "data": {"access_token": token, "token_type": "bearer", "user": serialize_record(user)},
        "source": "python-fastapi",
    }


@router.post("/logout")
async def logout():
    return {"success": True, "data": {"message": "Logged out"}, "source": "python-fastapi"}


@router.get("/me")
async def me(db: AsyncSession = Depends(get_db)):
    user = await get_or_create_default_admin(db)
    return {"success": True, "data": serialize_record(user), "source": "python-fastapi"}


@router.post("/change-password")
async def change_password(body: dict, db: AsyncSession = Depends(get_db)):
    username = str(body.get("username") or "admin").strip()
    current_password = str(body.get("current_password") or "")
    new_password = str(body.get("new_password") or "")
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    user.password_hash = hash_password(new_password)
    await db.commit()
    return {"success": True, "data": {"username": username}, "source": "python-fastapi"}
