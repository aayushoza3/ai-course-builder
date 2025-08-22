"""
Alembic environment script (async version) – AI Course Builder
"""
from logging.config import fileConfig
import asyncio
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# ---- Alembic & SQLAlchemy imports ----
from alembic import context           # <-- this line was missing
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy import pool

from app.database import Base, DATABASE_URL
import app.models 

# ---- Alembic config ----
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
config.set_main_option("sqlalchemy.url", DATABASE_URL)

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
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

# ---- Entrypoint ----
if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_async_migrations())
