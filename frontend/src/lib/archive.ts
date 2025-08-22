// src/lib/archive.ts
// SSR-safe archive store (localStorage guarded)

export type ArchiveState = Set<number>;
const KEY = 'acb_archived';

function canUseLS() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readArr(): number[] {
  if (!canUseLS()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as number[];
  } catch {
    return [];
  }
}

function writeArr(ids: number[]) {
  if (!canUseLS()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
}

export function loadArchived(): ArchiveState {
  return new Set<number>(readArr());
}

export function isArchived(id: number): boolean {
  return loadArchived().has(id);
}

export function toggleArchive(id: number): boolean {
  const set = loadArchived();
  if (set.has(id)) set.delete(id); else set.add(id);
  writeArr([...set]);
  return set.has(id);
}

export function setArchived(ids: number[], archived: boolean) {
  const set = loadArchived();
  ids.forEach(id => archived ? set.add(id) : set.delete(id));
  writeArr([...set]);
}
