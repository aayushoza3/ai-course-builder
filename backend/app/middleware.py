# app/middleware.py
from __future__ import annotations

import contextvars
import logging
import time
import uuid

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
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
        self.err_log = logging.getLogger("app.error")

    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = rid  # available to handlers
        token = request_id_ctx.set(rid)
        start = time.perf_counter()

        response: Response | None = None
        try:
            response = await call_next(request)
        except Exception:
            # Log the original exception with stack trace and return a proper 500
            self.err_log.exception("Unhandled error (request_id=%s)", rid)
            response = JSONResponse(
                {"detail": "Internal Server Error", "request_id": rid},
                status_code=500,
            )
        finally:
            dur_ms = int((time.perf_counter() - start) * 1000)
            if response is None:
                response = Response(status_code=500)
            # Add the ID to the response for clients to correlate
            try:
                response.headers["X-Request-ID"] = rid
            except Exception:
                pass
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
