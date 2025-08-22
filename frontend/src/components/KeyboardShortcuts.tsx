// src/components/KeyboardShortcuts.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function KeyboardShortcuts(){
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();

  useEffect(()=>{
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      // Focus search
      if (!typing && e.key === '/') {
        e.preventDefault();
        const el = document.getElementById('course-search') as HTMLInputElement | null;
        el?.focus();
      }

      // New course
      if (!typing && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        router.push('/');
      }

      // g m / g b navigation
      if (!typing && e.key.toLowerCase() === 'g') {
        const once = (ev: KeyboardEvent) => {
          const k = ev.key.toLowerCase();
          if (k === 'm') router.push('/courses');
          if (k === 'b') router.push('/');
          window.removeEventListener('keydown', once);
        };
        window.addEventListener('keydown', once);
      }

      // Shift+E -> open Export (on course page)
      // Cmd/Ctrl+Shift+E -> immediate download
      if (!typing && e.shiftKey && e.key.toLowerCase() === 'e' && path?.startsWith('/course/')) {
        e.preventDefault();
        const cmd = (e.metaKey || e.ctrlKey) ? 'download' : 'open';
        window.dispatchEvent(new CustomEvent('acb:export', { detail: { cmd } }));
      }

      if (!typing && e.key === '?') setOpen(o=>!o);
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [router, path]);

  return (
    <div style={{position:'fixed', left:12, bottom:12, zIndex:50}}>
      <button className="btn ghost" onClick={()=>setOpen(o=>!o)} title="Keyboard shortcuts">?</button>
      {open && (
        <div className="card" style={{position:'fixed', left:12, bottom:56, zIndex:60, maxWidth:320}}>
          <div className="h2" style={{marginBottom:8}}>Keyboard shortcuts</div>
          <ul className="small">
            <li><span className="kbd">/</span> Focus search</li>
            <li><span className="kbd">n</span> New course</li>
            <li><span className="kbd">g</span> then <span className="kbd">m</span> My Courses</li>
            <li><span className="kbd">g</span> then <span className="kbd">b</span> Builder</li>
            <li><span className="kbd">Shift</span>+<span className="kbd">E</span> Open export (course page)</li>
            <li><span className="kbd">Cmd/Ctrl</span>+<span className="kbd">Shift</span>+<span className="kbd">E</span> Download Markdown</li>
            <li><span className="kbd">?</span> Toggle this help</li>
          </ul>
        </div>
      )}
    </div>
  );
}
