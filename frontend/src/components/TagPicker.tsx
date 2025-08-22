// src/components/TagPicker.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { addTag, getTags, removeTag, setTags } from '@/lib/tags';

export default function TagPicker({ courseId }: { courseId:number }){
  const [tags, set] = useState<string[]>([]);
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState('');

  useEffect(()=>{ set(getTags(courseId)); }, [courseId]);

  const commit = () => {
    const t = value.trim();
    if (!t) return;
    addTag(courseId, t);
    setValue('');
    set(getTags(courseId));
  };

  const del = (t:string) => {
    removeTag(courseId, t);
    set(getTags(courseId));
  };

  return (
    <div className="row" style={{gap:6, flexWrap:'wrap'}}>
      {tags.map(t=>(
        <span key={t} className="tag" style={{display:'inline-flex', alignItems:'center', gap:6}}>
          {t}
          <button className="icon-btn" onClick={()=>del(t)} aria-label={`Remove ${t}`} title="Remove" style={{width:20, height:20}}>×</button>
        </span>
      ))}
      {!edit ? (
        <button className="btn ghost" onClick={()=>setEdit(true)}>+ tag</button>
      ) : (
        <div className="row" style={{gap:6}}>
          <input className="input" style={{width:160}} value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=> (e.key==='Enter') && commit()} placeholder="Add tag" />
          <button className="btn" onClick={commit}>Add</button>
          <button className="btn ghost" onClick={()=>{ setValue(''); setEdit(false); }}>Done</button>
        </div>
      )}
    </div>
  );
}
