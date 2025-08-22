# backend/tests/test_smoke.py
from httpx import Client, ASGITransport
import pytest

from app.main import app


def _client() -> Client:
    # httpx>=0.27: use ASGITransport with the ASGI app; sync client so no anyio backend needed
    transport = ASGITransport(app=app)
    return Client(transport=transport, base_url="http://test")


def test_healthz():
    with _client() as c:
        r = c.get("/health")
        assert r.status_code == 200


def test_mutations_require_api_key_and_succeed_with_key(monkeypatch):
    # Enforce API key for this test run
    monkeypatch.setenv("API_KEY", "ci-test-key")

    with _client() as c:
        # No key -> should be unauthorized/forbidden
        r = c.post("/courses", json={"title": "smoke", "description": "string"})
        assert r.status_code in (401, 403)

        # With key -> should succeed (just enqueues a Celery task)
        r = c.post(
            "/courses",
            json={"title": "smoke ok", "description": "string"},
            headers={"X-API-Key": "ci-test-key"},
        )
        assert r.status_code == 201


def test_list_courses_pagination_headers_present(monkeypatch):
    monkeypatch.setenv("API_KEY", "ci-test-key")

    with _client() as c:
        # ensure at least one item exists
        c.post(
            "/courses",
            json={"title": "headers", "description": "s"},
            headers={"X-API-Key": "ci-test-key"},
        )
        r = c.get("/courses")

    assert r.status_code == 200
    for h in ("X-Total-Count", "X-Limit", "X-Offset"):
        assert h in r.headers
