# app/routers/system.py
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.celery_app import celery_app

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/healthz", summary="Liveness check")
async def healthz():
    # Simple "process is up" signal
    return {"status": "ok"}

@router.get("/readyz", summary="Readiness check (DB + Celery workers)")
async def readyz(db: AsyncSession = Depends(get_session)):
    # DB check
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Celery worker check (pings through your broker)
    try:
        replies = celery_app.control.ping(timeout=1.0) or []
        workers_ok = bool(replies)
    except Exception:
        workers_ok = False

    all_ok = db_ok and workers_ok
    code = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=code,
        content={
            "database": db_ok,
            "celery_workers": workers_ok,
            "status": "ok" if all_ok else "unavailable",
        },
    )
