# app/schemas.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Literal

from pydantic import BaseModel, Field, computed_field
from pydantic.config import ConfigDict

StatusLiteral = Literal["queued", "generating", "ready", "failed", "canceled"]

# ---------- Shared / Nested ----------

class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    url: str
    title: Optional[str] = None


class QuizOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lesson_id: int
    question: str
    options: List[str]
    answer: str


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_id: int
    title: str
    content_md: Optional[str] = None
    resources: List[ResourceOut] = []
    quizzes: List[QuizOut] = []


class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    summary: Optional[str] = None
    lessons: List[LessonOut] = []


# ---------- Course Schemas ----------

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None


class CourseBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: Optional[str] = None
    status: StatusLiteral
    created_at: datetime

    task_id: Optional[str] = Field(None, exclude=True)

    last_error: Optional[str] = Field(
        default=None,
        description="Error message from the last generation attempt, if any."
    )

    @computed_field(return_type=Optional[str])
    def job_id(self) -> Optional[str]:
        return self.task_id


class CourseOut(CourseBase):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 42,
                "title": "Full-Stack FastAPI Crash Course",
                "description": "From zero to basic CRUD + Celery",
                "status": "ready",
                "created_at": "2025-08-14T19:52:00Z",
                "job_id": "a7f4f7e1-2c8f-4c43-bb25-9a5f6d9a0b3e",
                "last_error": None,
                "modules": [
                    {
                        "id": 101,
                        "course_id": 42,
                        "title": "Introduction",
                        "summary": None,
                        "lessons": [
                            {
                                "id": 1001,
                                "module_id": 101,
                                "title": "Course Overview",
                                "content_md": "### What you’ll learn...\n- ...",
                                "resources": [
                                    {
                                        "id": 5001,
                                        "lesson_id": 1001,
                                        "url": "https://realpython.com/fastapi-tutorial/",
                                        "title": "Real Python – FastAPI Intro"
                                    }
                                ],
                                "quizzes": []
                            }
                        ]
                    }
                ]
            }
        },
    )

    id: int
    modules: List[ModuleOut] = []


class CourseListItem(CourseBase):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 42,
                "title": "Full-Stack FastAPI Crash Course",
                "description": "From zero to basic CRUD + Celery",
                "status": "queued",
                "created_at": "2025-08-14T19:52:00Z",
                "job_id": "a7f4f7e1-2c8f-4c43-bb25-9a5f6d9a0b3e",
                "last_error": None
            }
        },
    )

    id: int


class CourseStatus(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 42,
                "status": "generating",
                "job_id": "a7f4f7e1-2c8f-4c43-bb25-9a5f6d9a0b3e",
                "last_error": None
            }
        },
    )

    id: int
    status: StatusLiteral
    last_error: Optional[str] = None

    task_id: Optional[str] = Field(None, exclude=True)

    @computed_field(return_type=Optional[str])
    def job_id(self) -> Optional[str]:
        return self.task_id
