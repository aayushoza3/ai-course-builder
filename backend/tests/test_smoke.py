# backend/tests/test_smoke.py
import os
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.anyio
async def test_healthz():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/system/healthz")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

@pytest.mark.anyio
async def test_mutations_require_api_key_and_succeed_with_key(monkeypatch):
    # Enforce API key for this test run
    monkeypatch.setenv("API_KEY", "ci-test-key")

    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Missing key -> 401
        r = await ac.post("/courses", json={"title": "Auth Test"})
        assert r.status_code == 401

        # With key -> 201
        r2 = await ac.post(
            "/courses",
            headers={"X-API-Key": "ci-test-key"},
            json={"title": "Auth Test"},
        )
        assert r2.status_code == 201
        course_id = r2.json()["id"]

        # Clean up (delete) -> 204
        rd = await ac.delete(f"/courses/{course_id}", headers={"X-API-Key": "ci-test-key"})
        assert rd.status_code == 204

@pytest.mark.anyio
async def test_list_courses_pagination_headers_present():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/courses?limit=1")
        assert r.status_code == 200
        # Headers always present (even when empty)
        assert "X-Total-Count" in r.headers
        assert "X-Limit" in r.headers
        assert "X-Offset" in r.headers
