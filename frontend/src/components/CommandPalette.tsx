// src/components/CommandPalette.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

type Item = { id:string; label:string; hint?:string; run:()=>void };

export default function CommandPalette(){
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const path = usePathname();
  const { theme, setTheme, systemTheme } = useTheme();

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!typing) { setOpen(true); setQ(''); }
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, []);

  const isDark = (theme === 'system' ? systemTheme : theme) === 'dark';

  const items: Item[] = useMemo(()=>[
    { id:'builder', label:'New course (Builder)', hint:'n', run:()=>router.push('/') },
    { id:'courses', label:'My Courses', hint:'g m', run:()=>router.push('/courses') },
    { id:'toggle-theme', label: isDark ? 'Switch to light mode' : 'Switch to dark mode', run:()=>setTheme(isDark?'light':'dark') },
    ...(path?.startsWith('/course/') ? [
      { id:'export', label:'Export → Open menu', hint:'⇧E', run:()=>window.dispatchEvent(new CustomEvent('acb:export',{detail:{cmd:'open'}})) },
      { id:'export-dl', label:'Export → Download Markdown', hint:'⌘/Ctrl⇧E', run:()=>window.dispatchEvent(new CustomEvent('acb:export',{detail:{cmd:'download'}})) },
      { id:'print', label:'Print course', run:()=>window.print() },
    ] : []),
  ], [router, path, isDark, setTheme]);

  const list = useMemo(()=>{
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter(it => it.label.toLowerCase().includes(k));
  }, [q, items]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onClick={()=>setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className="card"
        style={{
          position:'fixed', zIndex:130, left:0, right:0, top:'12vh', margin:'0 auto',
          width:'min(720px, 92vw)'
        }}
      >
        <input
          autoFocus
          className="input"
          placeholder="Type a command…"
          value={q}
          onChange={e=>setQ(e.target.value)}
          onKeyDown={(e)=>{
            if (e.key === 'Enter' && list[0]) { list[0].run(); setOpen(false); }
          }}
        />
        <ul className="stack" style={{marginTop:10}}>
          {list.map(it=>(
            <li key={it.id}>
              <button className="btn" style={{width:'100%', justifyContent:'space-between'}} onClick={()=>{ it.run(); setOpen(false); }}>
                <span>{it.label}</span>
                {it.hint && <span className="kbd">{it.hint}</span>}
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="small text-muted">No results</li>}
        </ul>
      </div>
    </>
  );
}
