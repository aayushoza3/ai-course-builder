# backend/tests/test_smoke.py
import os
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


def _client():
    # httpx>=0.27: use ASGITransport instead of AsyncClient(app=...)
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.anyio
async def test_healthz():
    async with _client() as ac:
        r = await ac.get("/health")
        assert r.status_code == 200


@pytest.mark.anyio
async def test_mutations_require_api_key_and_succeed_with_key(monkeypatch):
    # Force API key on for this test run
    monkeypatch.setenv("API_KEY", "ci-test-key")

    async with _client() as ac:
        # No key -> should be unauthorized/forbidden
        r = await ac.post("/courses", json={"title": "smoke", "description": "string"})
        assert r.status_code in (401, 403)

        # With key -> should succeed
        r = await ac.post(
            "/courses",
            json={"title": "smoke ok", "description": "string"},
            headers={"X-API-Key": "ci-test-key"},
        )
        assert r.status_code == 201


@pytest.mark.anyio
async def test_list_courses_pagination_headers_present(monkeypatch):
    monkeypatch.setenv("API_KEY", "ci-test-key")

    async with _client() as ac:
        # Ensure at least one item exists
        await ac.post(
            "/courses",
            json={"title": "headers", "description": "s"},
            headers={"X-API-Key": "ci-test-key"},
        )
        r = await ac.get("/courses")

    assert r.status_code == 200
    for h in ("X-Total-Count", "X-Limit", "X-Offset"):
        assert h in r.headers
