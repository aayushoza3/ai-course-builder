# app/security.py
from __future__ import annotations

import os
from typing import Optional
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials

# Expose security schemes in OpenAPI so Swagger "Authorize" works
api_key_header = APIKeyHeader(
    name="X-API-Key",
    auto_error=False,
    description="Static API key for write operations",
)

# Also accept Authorization: Bearer <token>
http_bearer = HTTPBearer(auto_error=False)

async def require_api_key(
    api_key: Optional[str] = Security(api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(http_bearer),
):
    """
    Enforce a static API key when env var API_KEY is set.
    Accepts either:
      - X-API-Key: <token>
      - Authorization: Bearer <token>
    If API_KEY is empty/unset, auth is disabled (dev mode).
    """
    expected = os.getenv("API_KEY", "").strip()
    if not expected:
        return True  # auth off in dev

    token = api_key or (bearer.credentials if bearer else None)
    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
    return True
