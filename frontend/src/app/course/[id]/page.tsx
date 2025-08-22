// src/app/course/[id]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourse } from '@/lib/api';
import type { CourseDetail, Lesson, Module } from '@/lib/types';
import ResourceCard from '@/components/ResourceCard';
import { lessonDone, percentForCourse, percentForModule, setDone, subscribeProgress } from '@/lib/progress';
import ContentRenderer from '@/components/ContentRenderer';
import ProgressRing from '@/components/ProgressRing';
import { getNote, setNote } from '@/lib/notes';
import { confettiBurst } from '@/lib/confetti';
import { toast } from '@/lib/toast';
import { setLast } from '@/lib/last';
import ExportMenu from '@/components/ExportMenu';
import FocusTimer from '@/components/FocusTimer';
import StudyStreak from '@/components/StudyStreak';
import { logStudy } from '@/lib/study';
import CourseInsights from '@/components/CourseInsights';
import ScheduleExport from '@/components/ScheduleExport';

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState('');
  const fired = useRef<{overall?:boolean; modules:Set<number>}>({ modules: new Set() });

  // course-level notes modal
  const [courseNotesOpen, setCourseNotesOpen] = useState(false);
  const [courseNote, setCourseNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = await getCourse(id);
      if (!cancelled) {
        setDetail(d);
        const initial: Record<number, boolean> = {};
        d.modules.forEach((m, i)=> initial[m.id] = i === 0);
        const raw = localStorage.getItem(`acb_open_${id}`);
        if (raw) { try{ Object.assign(initial, JSON.parse(raw)); }catch{} }
        setOpenMap(initial);
        // load course-level note (use lessonId 0 sentinel)
        try { setCourseNote(getNote(id, 0)); } catch {}
      }
    })();
    const off = subscribeProgress(async () => {
      const d = await getCourse(id);
      setDetail(d);
    });
    return () => { cancelled = true; off(); };
  }, [id]);

  useEffect(()=>{ if (detail) setLast({ courseId: detail.id, courseTitle: detail.title, at: Date.now() } as any); }, [detail]);

  const overall = useMemo(() => detail ? percentForCourse(detail) : 0, [detail]);

  useEffect(()=>{
    if (!detail) return;
    if (overall >= 100 && !fired.current.overall){
      fired.current.overall = true;
      confettiBurst(60);
      toast('Course complete! 🎉', 'success', 3000);
    }
  }, [overall, detail]);

  const toggleOpen = (mid:number) => {
    setOpenMap(prev=>{
      const next = { ...prev, [mid]: !prev[mid] };
      localStorage.setItem(`acb_open_${id}`, JSON.stringify(next));
      return next;
    });
  };

  const expandAll = (val:boolean) => {
    if (!detail) return;
    const next: Record<number, boolean> = {};
    detail.modules.forEach(m=> next[m.id] = val);
    setOpenMap(next);
    localStorage.setItem(`acb_open_${id}`, JSON.stringify(next));
  };

  const matches = (t: string) => t.toLowerCase().includes(query.trim().toLowerCase());

  if (!detail) return <div className="small text-muted">Loading…</div>;

  return (
    <div className="stack stack-lg" style={{maxWidth:980, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'space-between'}}>
        <h1 className="h1" style={{textTransform:'capitalize'}}>{detail.title}</h1>
        <div className="row" style={{gap:8}}>
          <button className="btn" onClick={()=>setCourseNotesOpen(true)}>✎ Notes</button>
          <button className="btn ghost" onClick={async ()=>{ await navigator.clipboard.writeText(window.location.href); toast('Link copied', 'success'); }}>Share</button>
          <button className="btn ghost" onClick={()=>window.print()}>Print</button>
          <ScheduleExport detail={detail} />
          <ExportMenu detail={detail} />
          <a className="btn ghost" onClick={() => router.push('/courses')}>Back to My Courses</a>
        </div>
      </div>

      {/* course-level notes modal */}
      {courseNotesOpen && (
        <>
          <div className="overlay" onClick={()=>setCourseNotesOpen(false)} />
          <div className="modal" style={{maxWidth:720, inset:'10% 0 10% 0'}}>
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div className="h2">Course Notes</div>
              <button className="btn ghost" onClick={()=>setCourseNotesOpen(false)}>Close</button>
            </div>
            <textarea
              className="textarea"
              rows={18}
              value={courseNote}
              onChange={e=>setCourseNote(e.target.value)}
              onBlur={(e)=>{ try{ setNote(detail.id, 0, e.target.value); }catch{} }}
              placeholder="High-level takeaways, questions, links…"
            />
            <div className="small text-muted">Saved automatically on blur.</div>
          </div>
        </>
      )}

      <div className="grid-tiles">
        {/* overall progress */}
        <div className="card">
          <div className="row" style={{justifyContent:'space-between'}}>
            <div className="row" style={{gap:10}}>
              <ProgressRing size={46} value={overall} showLabel />
              <div className="h2" style={{display:'flex', alignItems:'center'}}>Overall progress</div>
            </div>
            <div style={{minWidth:260}}>
              <div className="progress"><div className="bar" style={{ width: `${overall}%` }} /></div>
              <div className="small text-muted" style={{marginTop:6}}>{overall}% complete</div>
            </div>
          </div>
        </div>

        {/* study streak */}
        <StudyStreak />

        {/* insights */}
        <CourseInsights detail={detail} />
      </div>

      {/* find-in-course */}
      <div className="card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div className="row" style={{gap:8}}>
            <input
              className="input"
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Find lessons… (filters across modules)"
              style={{width:320}}
            />
            <button className="btn ghost" onClick={()=>setQuery('')}>Clear</button>
          </div>
          <div className="row" style={{gap:8}}>
            <button className="btn ghost" onClick={()=>expandAll(true)}>Expand all</button>
            <button className="btn ghost" onClick={()=>expandAll(false)}>Collapse all</button>
          </div>
        </div>
      </div>

      <ol className="stack">
        {detail.modules.sort((a,b)=>a.order-b.order).map((m, idx) => {
          const modulePct = percentForModule(detail.id, m);

          if (modulePct >= 100 && !fired.current.modules.has(m.id)) {
            fired.current.modules.add(m.id);
            setTimeout(()=>{ confettiBurst(36); toast(`Module ${idx+1} complete! 🎉`, 'success'); }, 0);
          }

          const open = !!openMap[m.id];

          // filter lessons by query
          const visibleLessons = query.trim()
            ? m.lessons.filter(l => matches(l.title) || matches(l.content_md || ''))
            : m.lessons;

          // if query active and no lessons match, hide the whole module row
          if (query.trim() && visibleLessons.length === 0) return null;

          return (
            <li key={m.id} className="card">
              <div className="row" style={{justifyContent:'space-between', marginBottom:12}}>
                <button className="btn" onClick={()=>toggleOpen(m.id)} aria-expanded={open} aria-controls={`m-${m.id}`}>
                  {open ? '▾' : '▸'} {idx+1}. {m.title}
                </button>
                <div style={{minWidth:220}}>
                  <div className="progress"><div className="bar" style={{ width: `${modulePct}%` }} /></div>
                  <div className="small text-muted" style={{textAlign:'right', marginTop:6}}>{modulePct}%</div>
                </div>
              </div>

              {open && (
                <div id={`m-${m.id}`}>
                  {/* Changed from grid to vertical, full-width lessons */}
                  <ul className="stack">
                    {visibleLessons.map((l) => {
                      const done = lessonDone(detail.id, l.id);
                      const note = getNote(detail.id, l.id);
                      return (
                        <li
                          key={l.id}
                          className="lesson"
                          style={{
                            width:'100%',
                            display:'flex',
                            flexDirection:'column',
                            gap:12
                          }}
                          onMouseEnter={()=>setLast({courseId:detail.id, courseTitle:detail.title, lessonId:l.id, lessonTitle:l.title, at:Date.now()}) as any}
                        >
                          {/* header row of the lesson card */}
                          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                            <label className="row" style={{gap:10}}>
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={(e) => {
                                  setDone(detail.id, l.id, e.target.checked);
                                  if (e.target.checked) logStudy();
                                }}
                                style={{width:18, height:18}}
                              />
                              <h3 style={{fontSize:16, fontWeight:700}}>{l.title}</h3>
                            </label>
                            {done && <span className="badge">Done</span>}
                          </div>

                          {/* content row */}
                          {l.content_md && (
                            <div style={{overflow:'hidden', wordWrap:'break-word'}}>
                              <ContentRenderer markdown={l.content_md} />
                            </div>
                          )}

                          {/* notes row */}
                          <div>
                            <div className="small text-muted" style={{marginBottom:6}}>Your notes</div>
                            <textarea
                              defaultValue={note}
                              onBlur={(e)=>{ setNote(detail.id, l.id, e.target.value); }}
                              placeholder="Write a quick note for this lesson…"
                              className="textarea"
                              rows={3}
                            />
                          </div>

                          {/* resources row */}
                          {!!l.resources?.length && (
                            <div>
                              <div className="small text-muted" style={{marginBottom:8}}>Resources</div>
                              <div className="grid-tiles" style={{gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))'}}>
                                {l.resources.map((r) => (
                                  <ResourceCard key={r.id} url={r.url} title={r.title} provider={r.provider} />
                                ))}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Floating focus timer */}
      <FocusTimer />
    </div>
  );
}

function bulkMark(courseId:number, m: Module, val:boolean){
  m.lessons.forEach((l: Lesson) => setDone(courseId, l.id, val));
  if (val) { 
    import('@/lib/toast').then(({toast})=> toast('Marked all lessons done', 'success'));
  } else {
    import('@/lib/toast').then(({toast})=> toast('Module reset', 'info'));
  }
}
