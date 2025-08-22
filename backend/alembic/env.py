"""
Alembic environment script (async version) – AI Course Builder
"""
import asyncio
import ssl
from logging.config import fileConfig
from pathlib import Path
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

import certifi
from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from dotenv import load_dotenv

from app.database import Base, DATABASE_URL
import app.models  # noqa: F401

# Load .env that sits in backend/ (do this after all imports to satisfy Ruff E402)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


# ---- helpers ----
def _normalize_db_url(url: str) -> str:
    """Remove libpq-only params and ensure asyncpg-friendly query string."""
    if not url:
        return url
    u = urlparse(url)
    qs = dict(parse_qsl(u.query))

    # Strip params asyncpg doesn't understand
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


# ---- Alembic config ----
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

_clean_url = _normalize_db_url(DATABASE_URL)
config.set_main_option("sqlalchemy.url", _clean_url)


# ---- Offline mode ----
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ---- Online (async) mode ----
def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connect_args = {"ssl": _ssl_context()} if _should_use_ssl(_clean_url) else {}
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


# ---- Entrypoint ----
if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_async_migrations())
