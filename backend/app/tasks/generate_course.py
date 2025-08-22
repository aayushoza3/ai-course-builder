# app/tasks/generate_course.py
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Tuple
from urllib.parse import parse_qsl, quote_plus, urlencode, urlparse, urlunparse

import requests
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.exc import IntegrityError

from app import models
from app.celery_app import celery_app
from app.database import make_background_sessionmaker

log = logging.getLogger(__name__)

# ---- LLM ---------------------------------------------------------------

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
llm = ChatOpenAI(model=MODEL_NAME, temperature=0.3)

# ---- Tiny web helpers --------------------------------------------------

HEADERS = {"User-Agent": ("Mozilla/5.0 (compatible; CourseBuilderBot/1.0; +https://example.local)")}


def _fetch(
    url: str,
    params: Dict[str, Any] | None = None,
    timeout: float = 8.0,
) -> requests.Response | None:
    try:
        resp = requests.get(url, params=params or {}, headers=HEADERS, timeout=timeout)
        if resp.status_code == 200:
            return resp
    except Exception as e:
        log.debug("fetch error %s -> %s", url, e)
    return None


# SERP link extraction
_LINK_RE = re.compile(r'href="(https?://[^"]+)"', re.I)

# obvious junk / trackers we never want to keep
_SKIP_HOSTS = {"s.yimg.com", "gstatic.com", "doubleclick.net", "t.co"}
_SKIP_URL_SUBSTR = (
    "google.com",
    "brave.com",
    "bing.com",
    "yahoo.com",
    "yandex.com",
    "duckduckgo.com",
    "webcache.googleusercontent.com",
    "/preferences?",
    "/setprefs?",
)


def _extract_links(html: str) -> List[str]:
    urls: List[str] = []
    for m in _LINK_RE.finditer(html):
        u = m.group(1)
        host = urlparse(u).netloc.replace("www.", "").lower()

        if any(s in u for s in _SKIP_URL_SUBSTR):
            continue
        if host in _SKIP_HOSTS:
            continue

        urls.append(u)

    # unique, preserve order
    seen, out = set(), []
    for u in urls:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def search_web(query: str, n: int = 4) -> List[Dict[str, str]]:
    """Very lightweight meta-search: wikipedia opensearch + 2 SERPs (regex)."""
    items: List[Dict[str, str]] = []

    # Wikipedia OpenSearch
    r = _fetch(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "opensearch",
            "profile": "fuzzy",
            "limit": 2,
            "search": query,
            "format": "json",
        },
    )
    if r is not None:
        try:
            data = r.json()
            for url in data[3]:
                items.append({"url": url, "title": url, "provider": "auto"})
        except Exception:
            pass

    # Brave + Yahoo (simple link scrape)
    for base in (
        f"https://search.brave.com/search?q={quote_plus(query)}&source=web",
        f"https://search.yahoo.com/search?p={quote_plus(query)}",
    ):
        rr = _fetch(base)
        if rr is None:
            continue
        for u in _extract_links(rr.text):
            items.append({"url": u, "title": u, "provider": "auto"})
            if len(items) >= n * 2:
                break

    return items[: max(n, 1)]


def search_yt(query: str, n: int = 2) -> List[Dict[str, str]]:
    """Super-simple YouTube search by scraping IDs."""
    url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
    r = _fetch(url)
    out: List[Dict[str, str]] = []
    if r is not None:
        ids = list(dict.fromkeys(re.findall(r"watch\?v=([\w\-]{6,})", r.text)))
        for vid in ids[:n]:
            out.append(
                {
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "title": f"YouTube Video {vid}",
                    "provider": "auto",
                }
            )
    return out


# ---- Resource normalization (de-dupe, clean titles/providers) ----------

_TRACKING_KEYS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "utm_reader",
    "gclid",
    "fbclid",
    "mc_cid",
    "mc_eid",
    "igshid",
    "si",
    "spm",
    "ved",
    "source",
    "ref",
}

_YT_HOSTS = {"youtube.com", "m.youtube.com", "youtu.be"}


def _canonicalize_url(raw: str) -> Tuple[str, str]:
    """
    Return (canonical_url, dedupe_key). Strips tracking params.
    For YouTube, collapses to just the video id as a dedupe key.
    """
    try:
        p = urlparse(raw)
        host = p.netloc.replace("www.", "").lower()

        # filter junk hosts early
        if host in _SKIP_HOSTS:
            return raw, raw

        # YouTube: keep only video id as dedupe key
        if host in _YT_HOSTS:
            vid = None
            if host == "youtu.be":
                vid = p.path.lstrip("/")
            else:
                q = dict(parse_qsl(p.query, keep_blank_values=True))
                vid = q.get("v") or None
            if vid:
                can = f"https://www.youtube.com/watch?v={vid}"
                return can, f"yt:{vid}"

        # drop tracking params
        q = [(k, v) for (k, v) in parse_qsl(p.query, keep_blank_values=True) if k not in _TRACKING_KEYS]
        p2 = p._replace(query=urlencode(q, doseq=True))
        canon = urlunparse(p2)
        return canon, canon
    except Exception:
        return raw, raw


def _dedupe_resources(items: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen: set[str] = set()
    out: List[Dict[str, str]] = []
    for it in items:
        u = (it.get("url") or "").strip()
        if not u:
            continue
        canon, key = _canonicalize_url(u)
        if key in seen:
            continue
        seen.add(key)
        # store canonicalized URL
        it = {**it, "url": canon}
        out.append(it)
    return out


def _clean_title(title: str | None) -> str:
    t = re.sub(r"\s+", " ", (title or "")).strip()
    t = re.sub(
        r"^\s*(W3Schools|GeeksforGeeks|DataCamp|Real Python)\s*[-|:]\s*",
        "",
        t,
        flags=re.I,
    )
    if re.match(r"^https?://", t, flags=re.I):
        try:
            p = urlparse(t)
            seg = [s for s in p.path.split("/") if s][-1] if p.path else p.netloc
            t = seg or p.netloc
        except Exception:
            pass
    return (t or "Reference")[:255]


def _infer_provider(url: str, provider: str | None) -> str:
    if provider and provider != "auto":
        return provider[:100]
    host = urlparse(url).netloc.replace("www.", "").lower()
    if host in _YT_HOSTS:
        return "youtube"
    return (host or "web")[:100]


def _normalize_resources(raw: List[Dict[str, str]]) -> List[Dict[str, str]]:
    # canonicalize/dedupe first
    canon = _dedupe_resources(raw)

    # map + clean
    norm: List[Dict[str, str]] = []
    for r in canon:
        url = (r.get("url") or "").strip()
        if not url:
            continue
        host = urlparse(url).netloc.replace("www.", "").lower()
        if host in _SKIP_HOSTS:
            continue

        title = _clean_title(r.get("title"))
        provider = _infer_provider(url, r.get("provider"))

        norm.append({"url": url, "title": title, "provider": provider})

    # unique again after cleaning
    return _dedupe_resources(norm)


# ---- Lesson content generation ----------------------------------------


def gen_lesson_md(course_title: str, lesson_title: str) -> str:
    """
    Concise, practical Markdown notes per lesson.

    Includes a tiny code block ONLY if the topic is clearly programming/software.
    For non-programming topics it must contain NO CODE.
    """
    sys = SystemMessage(
        content=(
            "You write concise, accurate course notes in Markdown. Keep it practical. "
            "NEVER include code unless the topic is explicitly about software/programming."
        )
    )
    usr = HumanMessage(
        content=(
            f"Create brief Markdown notes for the lesson **{lesson_title}** "
            f"in the course **{course_title}**.\n"
            "- 6–10 bullet points or short sub-sections\n"
            "- If and only if this lesson is about programming/software, include ONE tiny code "
            "block; otherwise include NO code\n"
            "- End with a short 'Tips' or 'Next steps' line"
        )
    )
    try:
        md = llm.invoke([sys, usr]).content
        return (md or "").strip()[:4000]
    except Exception as e:
        log.warning("gen_lesson_md failed for %s / %s: %s", course_title, lesson_title, e)
        return ""


# ---- Outline generation ------------------------------------------------


def _build_outline(title: str) -> List[Dict[str, Any]]:
    """Ask the LLM for a JSON outline."""
    sys = SystemMessage(content="You create clean JSON outlines for courses.")
    usr = HumanMessage(
        content=(
            f"Create a 4-module outline for a course titled '{title}'. "
            "Each module should have 3 lessons. Return ONLY JSON with this schema:\n"
            '{ "modules": [ { "title": str, "lessons": [str, str, str] }, ... ] }\n'
            "No markdown, no commentary."
        )
    )
    try:
        raw = llm.invoke([sys, usr]).content
        data = json.loads(raw)
        modules = data.get("modules", [])
        cleaned = []
        for m in modules:
            mtitle = str(m.get("title", "")).strip()
            lessons = [str(x).strip() for x in (m.get("lessons") or []) if str(x).strip()]
            if mtitle and lessons:
                cleaned.append({"title": mtitle, "lessons": lessons})
        if cleaned:
            return cleaned
    except Exception as e:
        log.warning("outline parse failed, falling back: %s", e)

    return [
        {
            "title": "Introduction",
            "lessons": [
                "Course Overview",
                "Key Concepts",
                "Environment Setup",
            ],
        },
        {
            "title": "Core Skills",
            "lessons": [
                "Basics",
                "Working with Data",
                "Common Patterns",
            ],
        },
        {
            "title": "Applied Topics",
            "lessons": [
                "Case Study 1",
                "Case Study 2",
                "Best Practices",
            ],
        },
        {
            "title": "Wrap Up",
            "lessons": [
                "Project",
                "Next Steps",
                "Resources",
            ],
        },
    ]


# ---- Cancellation helpers ---------------------------------------------


async def _ensure_not_canceled(db, course_id: int) -> None:
    """Raise CancelledError if the course was canceled."""
    course = await db.get(models.Course, course_id)
    if not course:
        return
    if getattr(course, "status", None) == "canceled":
        raise asyncio.CancelledError()


# ---- Persistence -------------------------------------------------------


async def _insert_resource(
    db,
    *,
    lesson_id: int,
    url: str,
    title: str,
    provider: str,
) -> None:
    """
    Insert a resource, avoiding duplicates on (lesson_id, url).

    Prefers PostgreSQL ON CONFLICT DO NOTHING for speed; falls back to a
    SAVEPOINT with flush-catching IntegrityError for other dialects.
    """
    try:
        # Fast path for Postgres
        from sqlalchemy.dialects.postgresql import insert as pg_insert  # type: ignore

        stmt = (
            pg_insert(models.Resource.__table__)
            .values(lesson_id=lesson_id, url=url, title=title, provider=provider)
            .on_conflict_do_nothing(index_elements=["lesson_id", "url"])
        )
        await db.execute(stmt)
    except Exception:
        # Portable fallback using a nested transaction (SAVEPOINT)
        try:
            async with db.begin_nested():
                db.add(
                    models.Resource(
                        lesson_id=lesson_id,
                        url=url,
                        title=title,
                        provider=provider,
                    )
                )
                await db.flush()
        except IntegrityError:
            # Duplicate -> ignore
            pass


async def _persist(Session, course_id: int, title: str) -> None:
    """Create modules/lessons/resources for the course."""
    outline = _build_outline(title)

    async with Session() as db:
        # Attach to course and mark generating (idempotent)
        course = await db.get(models.Course, course_id)
        if not course:
            log.error("Course %s not found", course_id)
            return

        # If already canceled before we start, bail out
        await _ensure_not_canceled(db, course_id)

        # Keep idempotent: set generating here as well in case router didn't
        if hasattr(course, "status"):
            course.status = "generating"
        await db.commit()
        await db.refresh(course)

        order = 1
        for mod in outline:
            # Check cancellation at each module boundary
            await _ensure_not_canceled(db, course_id)

            module = models.Module(course_id=course_id, title=mod["title"], order=order)
            db.add(module)
            await db.flush()  # get module.id
            order += 1

            for ltitle in mod["lessons"]:
                # Check cancellation at each lesson boundary
                await _ensure_not_canceled(db, course_id)

                content_md = gen_lesson_md(title, ltitle)
                lesson = models.Lesson(
                    module_id=module.id,
                    title=ltitle,
                    content_md=content_md,
                )
                db.add(lesson)
                await db.flush()

                q = f"{ltitle} {title}"
                raw_links = search_web(q, n=6) + search_yt(q, n=3)
                links = _normalize_resources(raw_links)

                # Persist all cleaned links, duplicate-proof
                for r in links:
                    await _insert_resource(
                        db,
                        lesson_id=lesson.id,
                        url=r["url"],
                        title=r["title"],
                        provider=r["provider"],
                    )

        # Only mark ready if not canceled
        await _ensure_not_canceled(db, course_id)
        if hasattr(course, "status"):
            course.status = "ready"
        await db.commit()


# ---- Minimal status helpers -------------------------------------------


async def _mark_started(Session, course_id: int, task_id: str) -> None:
    """Set status=generating, clear last_error, and store Celery task id."""
    async with Session() as db:
        course = await db.get(models.Course, course_id)
        if not course:
            return
        # If canceled before worker picked up, don't override
        if getattr(course, "status", None) == "canceled":
            return
        if hasattr(course, "status"):
            course.status = "generating"
        if hasattr(course, "last_error"):
            course.last_error = None
        if hasattr(course, "task_id"):
            course.task_id = task_id
        await db.commit()


async def _mark_failed(Session, course_id: int, err: Exception) -> None:
    """Set status=failed and persist a truncated error string."""
    async with Session() as db:
        course = await db.get(models.Course, course_id)
        if not course:
            return
        # Do not override canceled
        if getattr(course, "status", None) == "canceled":
            return
        if hasattr(course, "status"):
            course.status = "failed"
        if hasattr(course, "last_error"):
            course.last_error = str(err)[:500]
        await db.commit()


# ---- Celery task -------------------------------------------------------


@celery_app.task(name="app.tasks.generate_course.generate_course", bind=True)
def generate_course(self, title: str, course_id: int) -> None:
    """
    Celery entrypoint. Creates a task-local async engine/sessionmaker bound to this
    process+event loop to avoid cross-loop issues with asyncpg/SQLAlchemy.
    """
    bg_engine, Session = make_background_sessionmaker()
    try:
        asyncio.run(_mark_started(Session, course_id, task_id=self.request.id))
        asyncio.run(_persist(Session, course_id, title))
    except asyncio.CancelledError:
        # Cooperative cancel: leave status as 'canceled' set by the API; do not mark failed.
        log.info("generate_course canceled for course_id=%s", course_id)
        return
    except Exception as e:
        log.exception("generate_course failed: %s", e)
        try:
            asyncio.run(_mark_failed(Session, course_id, e))
        except Exception:
            pass
        raise
    finally:
        try:
            asyncio.run(bg_engine.dispose())
        except Exception:
            pass
