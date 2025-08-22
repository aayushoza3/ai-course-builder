// frontend/src/lib/last.ts
// SSR-safe "last viewed" breadcrumb

const KEY = 'acb_last';

function canUseLS() { return typeof window !== 'undefined' && typeof localStorage !== 'undefined'; }

export function setLast(payload: unknown) {
  if (!canUseLS()) return;
  try { localStorage.setItem(KEY, JSON.stringify(payload)); } catch {}
}

export function getLast<T = unknown>(): T | null {
  if (!canUseLS()) return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}
