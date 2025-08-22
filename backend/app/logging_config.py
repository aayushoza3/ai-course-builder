# app/logging_config.py
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict

DEFAULT_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
        }
        # Optional extras if present
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        if hasattr(record, "extra"):
            try:
                payload.update(record.extra)  # type: ignore[arg-type]
            except Exception:
                pass
        return json.dumps(payload, ensure_ascii=False)

def setup_logging(level: str | None = None) -> None:
    lvl = getattr(logging, (level or DEFAULT_LEVEL), logging.INFO)

    root = logging.getLogger()
    # Avoid duplicate handlers if reloaded (e.g., in dev)
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())

    root.setLevel(lvl)
    root.addHandler(handler)

    # Make common loggers inherit the same handler/level
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "app", "app.access"):
        lg = logging.getLogger(name)
        lg.setLevel(lvl)
        lg.propagate = True
