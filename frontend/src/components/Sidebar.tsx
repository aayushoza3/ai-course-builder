// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import AccentPicker from './AccentPicker';
import { getLast } from '@/lib/last';

type LastState = {
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  lessonTitle?: string;
  at?: number;
};

const SB_W = 280; // keep in sync with CSS width

function useSidebarState() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(o => !o);
    window.addEventListener('acb:sidebar-toggle', handler);
    return () => window.removeEventListener('acb:sidebar-toggle', handler);
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return { open, setOpen };
}

function applyDensity(mode:'cozy'|'compact'){
  const b = document.body;
  if (mode === 'compact') b.classList.add('density-compact'); else b.classList.remove('density-compact');
  try { localStorage.setItem('acb_density', mode); } catch {}
}

export default function Sidebar(){
  const { open, setOpen } = useSidebarState();

  // localStorage-only; safe on client
  const last = useMemo(() => getLast() as LastState | null, []);

  const [density, setDensity] = useState<'cozy'|'compact'>(() => {
    try {
      const v = typeof window !== 'undefined' ? localStorage.getItem('acb_density') : null;
      return (v === 'compact' || v === 'cozy') ? v : 'cozy';
    } catch { return 'cozy'; }
  });

  useEffect(()=> applyDensity(density), [density]);

  return (
    <>
      {open && (
        <div className="overlay" onClick={()=>setOpen(false)} style={{ left: SB_W }} />
      )}

      <aside id="acb-sidebar" className={`sidebar ${open ? 'open':''}`} style={{ zIndex: 120, width: SB_W }}>
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-badge">A</span> <span>AI Course Builder</span>
          </div>
          <button className="icon-btn" aria-label="Close sidebar" onClick={()=>setOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-sec">
          <Link href="/" className="side-link">🏗️ Builder</Link>
          <Link href="/courses" className="side-link">📚 My Courses</Link>
        </nav>

        <div className="sidebar-sec">
          <div className="side-title">Appearance</div>
          <div className="row" style={{gap:8}}>
            <ThemeToggle />
            <AccentPicker />
          </div>
          <div className="row" style={{marginTop:8}}>
            <select
              className="input select"
              value={density}
              onChange={(e)=> setDensity(e.target.value === 'compact' ? 'compact' : 'cozy')}
            >
              <option value="cozy">Cozy density</option>
              <option value="compact">Compact density</option>
            </select>
          </div>
        </div>

        <div className="sidebar-sec">
          <div className="side-title">Continue learning</div>
          {last ? (
            <Link href={`/course/${last.courseId}`} className="card side-continue">
              <div style={{fontWeight:700, marginBottom:4}}>{last.courseTitle}</div>
              {last.lessonTitle && <div className="small text-muted">{last.lessonTitle}</div>}
            </Link>
          ) : (
            <div className="small text-muted">You’ll see your last course here.</div>
          )}
        </div>

        <footer className="sidebar-sec">
          <div className="small text-muted">v1 · Made with ❤️</div>
        </footer>
      </aside>
    </>
  );
}
