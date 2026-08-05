from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"
EXPORTS_DIR = BASE_DIR / "exports"
REPORTS_DIR = BASE_DIR / "reports"
BACKUPS_DIR = BASE_DIR / "backups"

UPLOAD_IMAGE_DIR = UPLOADS_DIR / "images"
UPLOAD_VIDEO_DIR = UPLOADS_DIR / "videos"
UPLOAD_AUDIO_DIR = UPLOADS_DIR / "audio"
UPLOAD_PDF_DIR = UPLOADS_DIR / "pdf"
UPLOAD_EXCEL_DIR = UPLOADS_DIR / "excel"
UPLOAD_LOGO_DIR = UPLOADS_DIR / "logo"
UPLOAD_OTHER_DIR = UPLOADS_DIR / "other"

for directory in (
    DATA_DIR,
    UPLOADS_DIR,
    EXPORTS_DIR,
    REPORTS_DIR,
    BACKUPS_DIR,
    UPLOAD_IMAGE_DIR,
    UPLOAD_VIDEO_DIR,
    UPLOAD_AUDIO_DIR,
    UPLOAD_PDF_DIR,
    UPLOAD_EXCEL_DIR,
    UPLOAD_LOGO_DIR,
    UPLOAD_OTHER_DIR,
):
    directory.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'app.db'}")
SECRET_KEY = os.getenv("SECRET_KEY", "local-development-secret-change-before-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

FRONTEND_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
