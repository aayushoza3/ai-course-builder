// src/lib/study.ts
// SSR-safe study log utilities (timestamps in ms). Keeps the same public API.

export const KEY = 'acb_study_log';

export type StudyPoint = number; // epoch ms
const DAY_MS = 24 * 60 * 60 * 1000;

function canUseLS() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function read(): StudyPoint[] {
  if (!canUseLS()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StudyPoint[]) : [];
  } catch {
    return [];
  }
}

function write(arr: StudyPoint[]) {
  if (!canUseLS()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {}
}

/** Log a study "touch" at the given time (defaults to now). */
export function logStudy(at: number = Date.now()) {
  const arr = read();
  arr.push(at);
  write(arr);
}

/** Return the raw timestamp log (ms since epoch). */
export function getLog(): StudyPoint[] {
  return read();
}

/** Days ago from today (local midnight). */
export function daysAgo(ts: number) {
  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  return Math.floor((d0.getTime() - ts) / DAY_MS);
}

/** Current streak in days (consecutive days with at least one touch), counting today. */
export function streak(): number {
  const log = read();
  if (log.length === 0) return 0;

  // Build a set of day-start timestamps (local) that have at least one touch.
  const daySet = new Set<number>();
  for (const t of log) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    daySet.add(d.getTime());
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  let s = 0;

  // Count backwards until a day is missing.
  while (daySet.has(cursor)) {
    s++;
    cursor -= DAY_MS;
  }
  return s;
}

/**
 * Heatmap bucket counts for the last `n` days.
 * Index 0 => today, 1 => yesterday, etc.
 */
export function heatmap(n = 84): number[] {
  const buckets = Array.from({ length: n }, () => 0);
  if (n <= 0) return buckets;

  const d0 = new Date();
  d0.setHours(0, 0, 0, 0);
  const startOfToday = d0.getTime();

  for (const t of read()) {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((startOfToday - d.getTime()) / DAY_MS);
    if (diff >= 0 && diff < n) buckets[diff] += 1;
  }
  return buckets;
}
