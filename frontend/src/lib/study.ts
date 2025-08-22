// src/lib/study.ts
const KEY = 'acb_study_log';

export type StudyPoint = number; // epoch ms

export function logStudy(at = Date.now()){
  if (typeof window === 'undefined') return;
  try{
    const arr: StudyPoint[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    arr.push(at);
    localStorage.setItem(KEY, JSON.stringify(arr));
  }catch{}
}

export function getLog(): StudyPoint[]{
  if (typeof window === 'undefined') return [];
  try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch{ return []; }
}

export function daysAgo(ts:number){
  const day = 24*60*60*1000;
  const d0 = new Date(); d0.setHours(0,0,0,0);
  return Math.floor((d0.getTime()-ts)/day);
}

export function streak(): number {
  const log = getLog().sort((a,b)=>b-a);
  if (log.length === 0) return 0;
  let s = 0;
  const day = 24*60*60*1000;
  let cur = new Date(); cur.setHours(0,0,0,0);
  let cursor = cur.getTime(); // today start
  let idx = 0;

  while (true){
    const has = log.slice(idx).some(t => t >= cursor && t < cursor+day);
    if (!has) break;
    s++;
    cursor -= day;
  }
  return s;
}

export function heatmap(n=84): number[] {
  const log = getLog();
  const day = 24*60*60*1000;
  const d0 = new Date(); d0.setHours(0,0,0,0);
  const buckets = Array.from({length:n}, (_,i)=>0);
  for (const t of log){
    const diff = Math.floor((d0.getTime() - (new Date(t).setHours(0,0,0,0))) / day);
    if (diff >= 0 && diff < n) buckets[diff] += 1;
  }
  return buckets; // index 0 => today
}
