import os
import ssl
from pathlib import Path
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

import certifi
from dotenv import load_dotenv

# Load .env that sits in backend/
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool


def _normalize_db_url(url: str) -> str:
    """Remove libpq-only params and ensure asyncpg-friendly query string."""
    if not url:
        return url
    u = urlparse(url)
    qs = dict(parse_qsl(u.query))
    qs.pop("channel_binding", None)
    qs.pop("sslmode", None)

    host = (u.hostname or "").lower()
    needs_ssl = host.endswith(".neon.tech") or qs.get("ssl", "").lower() in {"true", "1", "require"}
    if needs_ssl:
        qs["ssl"] = "true"
    else:
        qs.pop("ssl", None)

    return urlunparse(u._replace(query=urlencode(qs)))


def _should_use_ssl(url: str) -> bool:
    if not url:
        return False
    u = urlparse(url)
    host = (u.hostname or "").lower()
    qs = dict(parse_qsl(u.query))
    if qs.get("ssl", "").lower() in {"true", "1", "require"}:
        return True
    if host.endswith(".neon.tech"):
        return True
    return False


def _ssl_context() -> ssl.SSLContext:
    """SSL context using certifi's CA bundle (fixes macOS trust issues)."""
    ctx = ssl.create_default_context(cafile=certifi.where())
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    return ctx


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

CLEAN_DATABASE_URL = _normalize_db_url(DATABASE_URL)
CONNECT_ARGS = {"ssl": _ssl_context()} if _should_use_ssl(CLEAN_DATABASE_URL) else {}

# FastAPI app engine/session (shared by the API only)
engine = create_async_engine(
    CLEAN_DATABASE_URL,
    echo=True,
    pool_pre_ping=True,
    connect_args=CONNECT_ARGS,
)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    """Shared metadata for all models."""
    pass


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session


def make_background_sessionmaker():
    """
    Build a fresh async engine+sessionmaker for background tasks (e.g., Celery).
    Creating/disposing it inside the task's event loop avoids
    'Future attached to a different loop' errors.
    """
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")

    clean = _normalize_db_url(url)
    connect_args = {"ssl": _ssl_context()} if _should_use_ssl(clean) else {}

    # NullPool ensures no connection is reused across loops/processes
    bg_engine = create_async_engine(
        clean,
        pool_pre_ping=True,
        poolclass=NullPool,
        connect_args=connect_args,
        future=True,
    )
    BGSession = async_sessionmaker(bg_engine, expire_on_commit=False, class_=AsyncSession)
    return bg_engine, BGSession
