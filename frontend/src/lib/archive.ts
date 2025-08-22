// src/lib/archive.ts
// Lightweight client-side archive store
export type ArchiveState = Set<number>;

const KEY = 'acb_archived';

export function loadArchived(): ArchiveState {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || '[]') as number[];
    return new Set<number>(arr);
  } catch {
    return new Set<number>();
  }
}

export function isArchived(id: number): boolean {
  return loadArchived().has(id);
}

export function toggleArchive(id: number): boolean {
  const s = loadArchived();
  const had = s.has(id);
  if (had) s.delete(id); else s.add(id);
  localStorage.setItem(KEY, JSON.stringify([...s]));
  return !had; // returns current archived state
}

export function setArchived(ids: number[], archived: boolean) {
  const s = loadArchived();
  ids.forEach(id => archived ? s.add(id) : s.delete(id));
  localStorage.setItem(KEY, JSON.stringify([...s]));
}
