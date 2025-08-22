// src/lib/last.ts
export type LastView = { courseId:number; courseTitle:string; lessonId?:number; lessonTitle?:string; at:number };

const KEY = 'acb_last';

export function setLast(v: LastView){
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() })); } catch {}
}

export function getLast(): LastView | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LastView) : null;
  } catch { return null; }
}
