// frontend/src/lib/favs.ts
// SSR-safe favorites + hook

import { useEffect, useState } from 'react';

const KEY = 'acb_favs';

function canUseLS() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}
function read(): number[] {
  if (!canUseLS()) return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as number[]; }
  catch { return []; }
}
function write(ids: number[]) {
  if (!canUseLS()) return;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch {}
}

export function isFav(id: number): boolean {
  return read().includes(id);
}

/** Returns [setOfFavs, toggle(id) -> nowFav?] */
export function useFavs(): [Set<number>, (id: number) => boolean] {
  const [set, setSet] = useState<Set<number>>(new Set());

  useEffect(() => { setSet(new Set(read())); }, []);

  const toggle = (id: number) => {
    const arr = read();
    const i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.push(id);
    write(arr);
    setSet(new Set(arr));
    return arr.includes(id);
  };

  return [set, toggle];
}
