# app/middleware.py
from __future__ import annotations

import time
import uuid
import logging
import contextvars
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# context var to inject request_id into all log lines
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get("-")
        return True

class RequestLogMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.log = logging.getLogger("app.access")

    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        token = request_id_ctx.set(rid)
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
        finally:
            dur_ms = int((time.perf_counter() - start) * 1000)
            # Add the ID to the response for clients to correlate
            response.headers["X-Request-ID"] = rid
            # Structured access log
            self.log.info(
                "%s %s -> %s %dms",
                request.method,
                request.url.path,
                getattr(response, "status_code", 0),
                dur_ms,
            )
            request_id_ctx.reset(token)
        return response
