// src/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import AccentPicker from './AccentPicker';
import { getLast } from '@/lib/last';

const SB_W = 280; // keep in sync with CSS width

function useSidebarState() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(o => !o);
    window.addEventListener('acb:sidebar-toggle', handler);
    return () => window.removeEventListener('acb:sidebar-toggle', handler);
  }, []);
  // close on Escape
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
  localStorage.setItem('acb_density', mode);
}

export default function Sidebar(){
  const { open, setOpen } = useSidebarState();
  const last = useMemo(()=> getLast(), []);
  const [density, setDensity] = useState<'cozy'|'compact'>(() => (localStorage.getItem('acb_density') as any) || 'cozy');

  useEffect(()=> applyDensity(density), [density]);

  return (
    <>
      {/* overlay for mobile/desktop — shifted so it doesn't cover the sidebar */}
      {open && (
        <div
          className="overlay"
          onClick={()=>setOpen(false)}
          // keep the blur for the main content, but leave the sidebar area uncovered
          style={{ left: SB_W }}
        />
      )}

      <aside
        id="acb-sidebar"
        className={`sidebar ${open ? 'open':''}`}
        // ensure the sidebar is ABOVE the overlay layer
        style={{ zIndex: 120, width: SB_W }}
      >
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
              onChange={(e)=> setDensity(e.target.value as any)}
            >
              <option value="cozy">Cozy density</option>
              <option value="compact">Compact density</option>
            </select>
          </div>
        </div>

        <div className="sidebar-sec">
          <div className="side-title">Shortcuts</div>
          <ul className="small">
            <li><span className="kbd">/</span> Focus search</li>
            <li><span className="kbd">n</span> New course</li>
            <li><span className="kbd">g</span> then <span className="kbd">m</span> My Courses</li>
            <li><span className="kbd">Shift</span>+<span className="kbd">E</span> Export (course)</li>
            <li><span className="kbd">?</span> Toggle help</li>
          </ul>
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
