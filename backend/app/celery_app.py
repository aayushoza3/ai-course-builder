import os
from urllib.parse import urlparse, urlunparse

from celery import Celery


def _force_db0(url: str | None) -> str | None:
    """
    Some hosted Redis (e.g., Upstash) only allow DB 0 and reject SELECT.
    Coerce any redis/rediss URL to use '/0'.
    """
    if not url:
        return url
    u = urlparse(url)
    if u.scheme in {"redis", "rediss"}:
        # Always force DB 0; keep everything else identical
        u = u._replace(path="/0")
        return urlunparse(u)
    return url


# Prefer CELERY_* if set; fall back to REDIS_URL; finally local default
_raw_broker = os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL") or "redis://localhost:6379/0"
_raw_backend = os.getenv("CELERY_RESULT_BACKEND") or _raw_broker

broker_url = _force_db0(_raw_broker)
result_backend = _force_db0(_raw_backend)

app = Celery("app", broker=broker_url, backend=result_backend)

app.conf.update(
    broker_connection_retry_on_startup=True,
    task_ignore_result=False,
    result_extended=True,
    broker_transport_options={"visibility_timeout": 3600},
    result_backend_transport_options={"retry_on_timeout": True},
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# What the rest of the code imports
celery_app = app
