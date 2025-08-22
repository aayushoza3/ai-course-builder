// src/lib/favs.ts
const KEY = 'acb_favorites';

function load(): Set<number>{
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  }catch{ return new Set(); }
}
function save(s: Set<number>){
  localStorage.setItem(KEY, JSON.stringify([...s]));
}

export function useFavs(){
  if (typeof window === 'undefined') return [new Set<number>(), (_:number)=>false] as const;
  const s = load();
  const toggle = (id:number)=>{
    if (s.has(id)) s.delete(id); else s.add(id);
    save(s);
    return s.has(id);
  };
  return [s, toggle] as const;
}

export function isFav(id:number){ try{ return load().has(id); }catch{ return false; } }
