# app/routers/courses.py
from __future__ import annotations

import io
import re
import zipfile
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, Security
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import sqlalchemy as sa

from app.database import get_session
from app import models, schemas
from app.security import require_api_key

router = APIRouter(prefix="/courses", tags=["Courses"])

def _eager(query):
    return query.options(
        selectinload(models.Course.modules)
        .selectinload(models.Module.lessons)
        .selectinload(models.Lesson.resources),
        selectinload(models.Course.modules)
        .selectinload(models.Module.lessons)
        .selectinload(models.Lesson.quizzes),
    )

# -------- export helpers --------

_slug_re = re.compile(r"[^a-z0-9]+")
def _slugify(s: str, fallback: str = "course") -> str:
    slug = _slug_re.sub("-", (s or "").lower()).strip("-")
    return slug or fallback

def _course_to_markdown(course: models.Course) -> str:
    created = getattr(course, "created_at", None)
    created_s = created.isoformat() if isinstance(created, datetime) else ""
    job_id = getattr(course, "task_id", None)
    status = getattr(course, "status", "")
    desc = getattr(course, "description", "") or ""

    lines: list[str] = []
    lines.append(f"# {course.title}")
    if desc:
        lines.append("")
        lines.append(desc)

    lines.append("")
    lines.append("----")
    lines.append("")
    lines.append("**Metadata**")
    lines.append("")
    if status:
        lines.append(f"- Status: `{status}`")
    if job_id:
        lines.append(f"- Job ID: `{job_id}`")
    if created_s:
        lines.append(f"- Created: `{created_s}`")

    # sort modules by `order` if present; else by id
    modules = list(course.modules or [])
    modules.sort(key=lambda m: (getattr(m, "order", 10**9), getattr(m, "id", 0)))

    for mi, mod in enumerate(modules, start=1):
        lines.append("")
        lines.append(f"## Module {mi}: {mod.title}")
        if getattr(mod, "summary", None):
            lines.append("")
            lines.append(mod.summary or "")

        lessons = list(mod.lessons or [])
        lessons.sort(key=lambda lesson: getattr(lesson, "id", 0))

        for li, lesson in enumerate(lessons, start=1):
            lines.append("")
            lines.append(f"### Lesson {mi}.{li}: {lesson.title}")
            if (lesson.content_md or "").strip():
                lines.append("")
                lines.append(lesson.content_md.strip())
            else:
                lines.append("")
                lines.append("_No content available yet._")

            # resources
            res = list(lesson.resources or [])
            res.sort(key=lambda r: getattr(r, "id", 0))
            if res:
                lines.append("")
                lines.append("**Resources**")
                for r in res:
                    title = r.title or r.url
                    lines.append(f"- [{title}]({r.url})")

            # quizzes
            qs = list(lesson.quizzes or [])
            qs.sort(key=lambda q: getattr(q, "id", 0))
            if qs:
                lines.append("")
                lines.append("**Quiz**")
                for qi, q in enumerate(qs, start=1):
                    lines.append(f"- Q{qi}. {q.question}")
                    opts = list(q.options or [])
                    for oi, opt in enumerate(opts, start=1):
                        lines.append(f"  - {oi}. {opt}")
                    # Keep answer visible; could be hidden in details if desired
                    if getattr(q, "answer", None):
                        lines.append(f"  - **Answer:** {q.answer}")

    lines.append("")
    return "\n".join(lines).strip() + "\n"

def _course_to_zip_bytes(course: models.Course) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # top-level README
        zf.writestr("README.md", _course_to_markdown(course))

        # per-lesson files under Module <n>/
        modules = list(course.modules or [])
        modules.sort(key=lambda m: (getattr(m, "order", 10**9), getattr(m, "id", 0)))

        for mi, mod in enumerate(modules, start=1):
            lessons = list(mod.lessons or [])
            lessons.sort(key=lambda lesson: getattr(lesson, "id", 0))

            for li, lesson in enumerate(lessons, start=1):
                parts: list[str] = []
                parts.append(f"# {lesson.title}\n")
                if (lesson.content_md or "").strip():
                    parts.append(lesson.content_md.strip())
                    parts.append("")
                # resources
                res = list(lesson.resources or [])
                res.sort(key=lambda r: getattr(r, "id", 0))
                if res:
                    parts.append("**Resources**")
                    for r in res:
                        title = r.title or r.url
                        parts.append(f"- [{title}]({r.url})")
                    parts.append("")
                # quizzes
                qs = list(lesson.quizzes or [])
                qs.sort(key=lambda q: getattr(q, "id", 0))
                if qs:
                    parts.append("**Quiz**")
                    for qi, q in enumerate(qs, start=1):
                        parts.append(f"- Q{qi}. {q.question}")
                        opts = list(q.options or [])
                        for oi, opt in enumerate(opts, start=1):
                            parts.append(f"  - {oi}. {opt}")
                        if getattr(q, "answer", None):
                            parts.append(f"  - **Answer:** {q.answer}")
                    parts.append("")

                lesson_md = "\n".join(parts).strip() + "\n"
                module_dir = f"Module {mi} - {_slugify(mod.title, f'module-{mi}')}"
                lesson_name = f"Lesson {mi}.{li} - {_slugify(lesson.title, f'lesson-{mi}-{li}')}.md"
                zf.writestr(f"{module_dir}/{lesson_name}", lesson_md)

    buf.seek(0)
    return buf.getvalue()

# -------- routes --------

@router.post("", response_model=schemas.CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: schemas.CourseCreate,
    db: AsyncSession = Depends(get_session),
    _auth: bool = Security(require_api_key),
):
    # Create without passing status (model may not accept it in __init__)
    values = payload.model_dump(exclude_unset=True)
    values.setdefault("description", "")
    course = models.Course(**values)
    db.add(course)
    await db.commit()
    # Only need id right now; created_at is server default
    await db.refresh(course, attribute_names=["id"])

    # Kick off async generation
    from app.tasks.generate_course import generate_course
    async_res = generate_course.delay(payload.title, course.id)

    # Track Celery task internally; expose as job_id via schema
    if hasattr(course, "task_id"):
        course.task_id = async_res.id
    if hasattr(course, "status"):
        course.status = "generating"
    if hasattr(course, "last_error"):
        course.last_error = None
    await db.commit()

    # Re-fetch eagerly to avoid lazy loads during response serialization
    result = await db.execute(
        _eager(select(models.Course).where(models.Course.id == course.id))
    )
    course = result.scalar_one()
    return course

@router.get(
    "",
    response_model=list[schemas.CourseListItem],
    response_model_exclude_none=True,
)
async def list_courses(
    response: Response,
    db: AsyncSession = Depends(get_session),
    statuses: list[schemas.StatusLiteral] | None = Query(
        default=None,
        description="Filter by status. Repeatable, e.g. ?statuses=ready&statuses=failed",
    ),
    search: str | None = Query(
        default=None,
        min_length=1,
        description="Case-insensitive search in title/description",
    ),
    limit: int = Query(50, ge=1, le=200, description="Page size (max 200)"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    # Build WHERE conditions
    conds: list = []
    if statuses:
        conds.append(models.Course.status.in_(statuses))
    if search:
        pattern = f"%{search.strip()}%"
        conds.append(
            sa.or_(
                models.Course.title.ilike(pattern),
                sa.func.coalesce(models.Course.description, "").ilike(pattern),
            )
        )

    # Total count
    total = await db.scalar(
        select(sa.func.count()).select_from(models.Course).where(*conds)
    )

    # Page query
    stmt = (
        select(models.Course)
        .where(*conds)
        .order_by(models.Course.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    items = result.scalars().unique().all()

    # Pagination headers
    response.headers["X-Total-Count"] = str(total or 0)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)

    return items

@router.get("/{course_id}", response_model=schemas.CourseOut)
async def get_course(course_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        _eager(select(models.Course).where(models.Course.id == course_id))
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

# Status endpoint (exposes job_id via schema; DB keeps task_id)
@router.get(
    "/{course_id}/status",
    response_model=schemas.CourseStatus,
    response_model_exclude_none=True,
)
async def get_course_status(course_id: int, db: AsyncSession = Depends(get_session)):
    course = await db.get(models.Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course  # schemas.CourseStatus computes job_id from task_id

# Regenerate outline (optionally clearing old modules)
@router.post(
    "/{course_id}/regenerate",
    response_model=schemas.CourseStatus,
    response_model_exclude_none=True,
    status_code=202,
)
async def regenerate_course(
    course_id: int,
    clear: bool = Query(False, description="Remove existing modules before regenerating"),
    force: bool = Query(False, description="If true, cancel any running job and start a new one"),
    db: AsyncSession = Depends(get_session),
    _auth: bool = Security(require_api_key),
):
    course = await db.get(models.Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    in_progress = getattr(course, "status", None) in ("queued", "generating")
    if in_progress and not force:
        # Conflict – already running
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Generation already in progress",
                "status": getattr(course, "status", None),
                "job_id": getattr(course, "task_id", None),
            },
        )

    # If forcing, revoke existing job
    if force and in_progress:
        job_id = getattr(course, "task_id", None)
        if job_id:
            from app.celery_app import celery_app
            try:
                celery_app.control.revoke(job_id, terminate=True)
            except Exception:
                pass

    if clear:
        # Cascade deletes lessons/resources/quizzes via relationships config
        await db.execute(sa.delete(models.Module).where(models.Module.course_id == course.id))
        if hasattr(course, "last_error"):
            course.last_error = None

    if hasattr(course, "status"):
        course.status = "queued"
    await db.commit()

    from app.tasks.generate_course import generate_course
    async_res = generate_course.delay(course.title, course.id)

    if hasattr(course, "status"):
        course.status = "generating"
    if hasattr(course, "task_id"):
        course.task_id = async_res.id
    await db.commit()
    await db.refresh(course)

    return course  # schemas.CourseStatus adds job_id + last_error

# Lookup a course by job_id (maps to DB task_id)
@router.get(
    "/by-job/{job_id}",
    response_model=schemas.CourseStatus,
    response_model_exclude_none=True,
)
async def get_course_by_job_id(job_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(models.Course).where(models.Course.task_id == job_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course with given job_id not found")
    return course  # schemas.CourseStatus exposes job_id + last_error

# ---- Cancel endpoints --------------------------------------------------

@router.post(
    "/{course_id}/cancel",
    response_model=schemas.CourseStatus,
    response_model_exclude_none=True,
)
async def cancel_course_job(
    course_id: int,
    db: AsyncSession = Depends(get_session),
    _auth: bool = Security(require_api_key),
):
    course = await db.get(models.Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    job_id = getattr(course, "task_id", None)
    if job_id:
        from app.celery_app import celery_app
        try:
            celery_app.control.revoke(job_id, terminate=True)
        except Exception:
            pass

    if hasattr(course, "status"):
        course.status = "canceled"
    if hasattr(course, "last_error"):
        course.last_error = "canceled by user"
    await db.commit()
    await db.refresh(course)
    return course

@router.post(
    "/by-job/{job_id}/cancel",
    response_model=schemas.CourseStatus,
    response_model_exclude_none=True,
)
async def cancel_by_job_id(
    job_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: bool = Security(require_api_key),
):
    result = await db.execute(select(models.Course).where(models.Course.task_id == job_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course with given job_id not found")

    from app.celery_app import celery_app
    try:
        celery_app.control.revoke(job_id, terminate=True)
    except Exception:
        pass

    if hasattr(course, "status"):
        course.status = "canceled"
    if hasattr(course, "last_error"):
        course.last_error = "canceled by user"
    await db.commit()
    await db.refresh(course)
    return course

# ---- Delete endpoints --------------------------------------------------

@router.delete(
    "/{course_id}",
    status_code=204,
)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_session),
    _auth: bool = Security(require_api_key),
):
    course = await db.get(models.Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # best-effort revoke if running
    job_id = getattr(course, "task_id", None)
    if job_id and getattr(course, "status", None) in ("queued", "generating"):
        from app.celery_app import celery_app
        try:
            celery_app.control.revoke(job_id, terminate=True)
        except Exception:
            pass

    await db.delete(course)  # relies on cascade for modules/lessons/resources
    await db.commit()
    return Response(status_code=204)

@router.delete(
    "/by-job/{job_id}",
    status_code=204,
)
async def delete_course_by_job(
    job_id: str,
    db: AsyncSession = Depends(get_session),
    _auth: bool = Security(require_api_key),
):
    result = await db.execute(select(models.Course).where(models.Course.task_id == job_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course with given job_id not found")

    if getattr(course, "status", None) in ("queued", "generating"):
        from app.celery_app import celery_app
        try:
            celery_app.control.revoke(job_id, terminate=True)
        except Exception:
            pass

    await db.delete(course)
    await db.commit()
    return Response(status_code=204)

# ---- Export endpoint ---------------------------------------------------

@router.get(
    "/{course_id}/export",
    summary="Download the course as Markdown or a ZIP of lesson files",
)
async def export_course(
    course_id: int,
    fmt: Literal["md", "zip"] = Query("md", description="Export format: md or zip"),
    filename: Optional[str] = Query(None, description="Base filename without extension"),
    db: AsyncSession = Depends(get_session),
):
    # Load full course with relations
    result = await db.execute(_eager(select(models.Course).where(models.Course.id == course_id)))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    base = filename or _slugify(course.title, f"course-{course.id}")

    if fmt == "md":
        md = _course_to_markdown(course)
        headers = {"Content-Disposition": f'attachment; filename="{base}.md"'}
        return Response(content=md, media_type="text/markdown; charset=utf-8", headers=headers)

    # zip
    data = _course_to_zip_bytes(course)
    headers = {"Content-Disposition": f'attachment; filename="{base}.zip"'}
    return StreamingResponse(io.BytesIO(data), media_type="application/zip", headers=headers)
