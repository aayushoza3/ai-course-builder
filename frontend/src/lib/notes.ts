// src/lib/notes.ts
const K = 'acb_notes'; // map: { "<courseId>:<lessonId>": "text" }

type MapT = Record<string,string>;

function read(): MapT{
  try{
    const raw = localStorage.getItem(K);
    if (!raw) return {};
    return JSON.parse(raw) as MapT;
  } catch { return {}; }
}
function write(m: MapT){ localStorage.setItem(K, JSON.stringify(m)); }

export function getNote(courseId:number, lessonId:number){
  const m = read();
  return m[`${courseId}:${lessonId}`] ?? '';
}
export function setNote(courseId:number, lessonId:number, text:string){
  const m = read();
  if (text.trim()) m[`${courseId}:${lessonId}`] = text;
  else delete m[`${courseId}:${lessonId}`];
  write(m);
}
