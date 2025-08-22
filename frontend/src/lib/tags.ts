// src/lib/tags.ts
// Tag utilities with global aggregation, per-course lists, and bulk helpers.

export type TagMap = Record<number, string[]>;
const KEY = 'acb_tags';

function canUseLS() { return typeof window !== 'undefined' && typeof localStorage !== 'undefined'; }

function read(): TagMap {
  if (!canUseLS()) return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as TagMap; }
  catch { return {}; }
}
function write(map: TagMap){
  if (!canUseLS()) return;
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

export function getTags(id: number): string[] {
  const m = read();
  return m[id] ?? [];
}

export function setTags(id: number, tags: string[]) {
  const m = read();
  // normalize: trim, dedupe, drop empties
  m[id] = Array.from(new Set(tags.map(t => t.trim()).filter(Boolean)));
  write(m);
}

export function addTag(id: number, tag: string) {
  setTags(id, [...getTags(id), tag]);
}

export function removeTag(id: number, tag: string) {
  setTags(id, getTags(id).filter(t => t !== tag));
}

export function hasTag(id: number, tag: string): boolean {
  return getTags(id).includes(tag);
}

/** Get all unique tags. If `ids` is provided, restrict to those courses. */
export function allTags(ids?: number[]): string[] {
  const m = read();
  const bag = new Set<string>();

  if (Array.isArray(ids) && ids.length) {
    ids.forEach(id => (m[id] ?? []).forEach(t => bag.add(t)));
  } else {
    Object.values(m).forEach(list => (list ?? []).forEach(t => bag.add(t)));
  }
  return Array.from(bag).sort((a,b)=>a.localeCompare(b));
}

/** Bulk add/remove a single tag across many course ids. */
export function setTagsForMany(ids: number[], tag: string, add = true) {
  const t = tag.trim();
  if (!t || !ids?.length) return;
  const m = read();

  ids.forEach(id => {
    const list = m[id] || [];
    if (add) {
      if (!list.includes(t)) list.push(t);
      m[id] = list;
    } else {
      m[id] = list.filter(x => x !== t);
    }
  });

  write(m);
}
