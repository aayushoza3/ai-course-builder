# app/main.py
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.logging_config import setup_logging
from app.middleware import RequestIdFilter, RequestLogMiddleware
from app.routers import courses, system

# ---- logging ----
setup_logging(os.getenv("LOG_LEVEL"))

# ensure all loggers include request_id
for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "app", "app.access"):
    logging.getLogger(name).addFilter(RequestIdFilter())

app = FastAPI(title="AI Course Builder API", version="0.1.0")

# ---- middleware ----
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLogMiddleware)

# ---- routers ----
app.include_router(courses.router)
app.include_router(system.router)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"ok": True, "service": "ai-course-builder-api"}
