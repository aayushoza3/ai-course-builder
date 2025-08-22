// frontend/src/lib/progress.ts
// SSR-safe progress tracking (lesson completion + % helpers)

import type { CourseDetail, Module } from '@/lib/types';

type DoneMap = Record<number, Record<number, boolean>>; // courseId -> (lessonId -> done)
const KEY = 'acb_done';

function canUseLS() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function read(): DoneMap {
  if (!canUseLS()) return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as DoneMap; }
  catch { return {}; }
}

function write(map: DoneMap) {
  if (!canUseLS()) return;
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

/** Return true if a lesson is marked done. */
export function lessonDone(courseId: number, lessonId: number): boolean {
  const m = read();
  return !!m[courseId]?.[lessonId];
}

/** Mark a lesson done/undone and notify subscribers. */
export function setDone(courseId: number, lessonId: number, val: boolean) {
  const m = read();
  m[courseId] = m[courseId] || {};
  m[courseId][lessonId] = val;
  write(m);
  notify();
}

/** % complete for a single module. */
export function percentForModule(courseId: number, mod: Module): number {
  const m = read();
  const lessons = mod.lessons ?? [];
  if (!lessons.length) return 0;
  const done = lessons.filter(l => !!m[courseId]?.[l.id]).length;
  return Math.round((done / lessons.length) * 100);
}

/** % complete for a whole course. */
export function percentForCourse(detail: CourseDetail): number {
  const m = read();
  const mods = detail.modules ?? [];
  let total = 0, done = 0;
  for (const mod of mods) {
    for (const l of (mod.lessons ?? [])) {
      total++;
      if (m[detail.id]?.[l.id]) done++;
    }
  }
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

/* ---------------- live subscriptions (client only) ---------------- */

type FN = () => void;
const listeners = new Set<FN>();
let storageBound = false;

function bindStorageOnce() {
  if (storageBound || !canUseLS()) return;
  storageBound = true;
  // cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) notify();
  });
}

function notify() {
  for (const fn of Array.from(listeners)) {
    try { fn(); } catch {}
  }
}

export function subscribeProgress(fn: FN): () => void {
  listeners.add(fn);
  bindStorageOnce();
  return () => { listeners.delete(fn); };
}
