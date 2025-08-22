// frontend/src/lib/notes.ts
// SSR-safe per-lesson notes

type NoteMap = Record<number, Record<number, string>>; // courseId -> (lessonId -> note)
const KEY = 'acb_notes';

function canUseLS() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}
function read(): NoteMap {
  if (!canUseLS()) return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as NoteMap; }
  catch { return {}; }
}
function write(map: NoteMap) {
  if (!canUseLS()) return;
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export function getNote(courseId: number, lessonId: number): string {
  const m = read();
  return m[courseId]?.[lessonId] ?? '';
}

export function setNote(courseId: number, lessonId: number, text: string) {
  const m = read();
  m[courseId] = m[courseId] || {};
  m[courseId][lessonId] = text;
  write(m);
}
