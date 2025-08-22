import datetime as dt

import sqlalchemy as sa
from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(sa.String(160), nullable=False)

    description: Mapped[str | None] = mapped_column(
        sa.String(500),
        nullable=True,
        server_default="",  # empty-string default
    )

    # Celery task tracking (stored column)
    task_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True, index=True)

    # generation status: queued -> generating -> ready | failed
    status: Mapped[str] = mapped_column(
        sa.String(32),
        nullable=False,
        server_default="queued",
        index=True,
    )

    # optional last error message for failures
    last_error: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        server_default=sa.func.now()  # let Postgres fill the timestamp
    )

    modules = relationship(
        "Module",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="Module.order",  # always return modules ordered
    )

    # ---- Compatibility alias: job_id <-> task_id ------------------------
    @property
    def job_id(self) -> str | None:
        return self.task_id

    @job_id.setter
    def job_id(self, value: str | None) -> None:
        self.task_id = value


class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(sa.ForeignKey("courses.id"))
    title: Mapped[str]
    order: Mapped[int]

    course = relationship("Course", back_populates="modules")
    lessons = relationship(
        "Lesson",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Lesson.id",
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_md: Mapped[str] = mapped_column(Text)

    module: Mapped["Module"] = relationship(back_populates="lessons")
    resources: Mapped[list["Resource"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")
    quizzes: Mapped[list["Quiz"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"),
        index=True,
    )
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    title: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(100))

    lesson: Mapped["Lesson"] = relationship(back_populates="resources")

    __table_args__ = (sa.UniqueConstraint("lesson_id", "url", name="uq_resource_lesson_url"),)


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_multiple_choice: Mapped[bool] = mapped_column(Boolean, default=False)

    lesson: Mapped["Lesson"] = relationship(back_populates="quizzes")
