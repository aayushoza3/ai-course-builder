# app/tasks/__init__.py
from __future__ import annotations

# Re-export the task so "app.tasks.generate_course" resolves cleanly when imported.
from .generate_course import generate_course  # noqa: F401

__all__ = ("generate_course",)
