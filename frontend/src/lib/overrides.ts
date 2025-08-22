// src/lib/overrides.ts
type Entry = { title?: string; archived?: boolean };
type MapT = Record<number, Entry>;
const KEY = 'acb_overrides';

function read(): MapT {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function write(m:MapT){ try{ localStorage.setItem(KEY, JSON.stringify(m)); }catch{} }

export function getTitle(id:number){ return (read()[id]?.title) ?? null; }
export function setTitle(id:number, title:string){
  const m = read(); m[id] = { ...(m[id]||{}), title: title.trim() || undefined }; write(m);
}
export function isArchived(id:number){ return !!read()[id]?.archived; }
export function toggleArchive(id:number, val?:boolean){
  const m = read(); const cur = !!m[id]?.archived; const next = (typeof val === 'boolean') ? val : !cur;
  m[id] = { ...(m[id]||{}), archived: next || undefined }; write(m);
}
