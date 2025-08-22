// src/lib/progress.ts
import type { CourseDetail, Module } from './types';

const KEY = 'acb:progress:v1';

type ProgressMap = {
  [courseId: string]: {
    done: number[]; // lesson ids
  };
};

function read(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map: ProgressMap) {
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent('acb-progress'));
}

export function getDone(courseId: number): number[] {
  const m = read();
  return m[String(courseId)]?.done ?? [];
}

export function setDone(courseId: number, lessonId: number, value: boolean) {
  const m = read();
  const k = String(courseId);
  const cur = new Set(m[k]?.done ?? []);
  if (value) cur.add(lessonId);
  else cur.delete(lessonId);
  m[k] = { done: Array.from(cur) };
  write(m);
}

export function lessonDone(courseId: number, lessonId: number) {
  return getDone(courseId).includes(lessonId);
}

export function percentForCourse(detail: CourseDetail) {
  const total = detail.modules.flatMap(m => m.lessons).length || 1;
  const done = getDone(detail.id).length;
  return Math.round((done / total) * 100);
}

export function percentForModule(courseId: number, mod: Module) {
  const done = getDone(courseId);
  const total = mod.lessons.length || 1;
  const matched = mod.lessons.filter(l => done.includes(l.id)).length;
  return Math.round((matched / total) * 100);
}

export function subscribeProgress(cb: () => void) {
  const handler = () => cb();
  window.addEventListener('acb-progress', handler);
  return () => window.removeEventListener('acb-progress', handler);
}
