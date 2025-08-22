import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env that sits in backend/
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

DATABASE_URL = os.getenv("DATABASE_URL")

# FastAPI app engine/session (shared by the API only)
engine = create_async_engine(DATABASE_URL, echo=True, pool_pre_ping=True)
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
    # NullPool ensures no connection is reused across loops/processes
    bg_engine = create_async_engine(url, pool_pre_ping=True, poolclass=NullPool, future=True)
    BGSession = async_sessionmaker(bg_engine, expire_on_commit=False, class_=AsyncSession)
    return bg_engine, BGSession
