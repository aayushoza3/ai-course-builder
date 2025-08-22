// src/app/courses/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { listCourses, getCourse, regenerateCourse } from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import ProgressRing from '@/components/ProgressRing';
import type { Course } from '@/lib/types';
import { percentForCourse, subscribeProgress } from '@/lib/progress';
import { useFavs, isFav } from '@/lib/favs';
import { toast } from '@/lib/toast';
import BulkBar from '@/components/BulkBar';
import { loadArchived, isArchived, toggleArchive } from '@/lib/archive';
import { addTag, allTags, getTags, hasTag } from '@/lib/tags';

function normalizeCourses(input: unknown): Course[] {
  if (Array.isArray(input)) return input as Course[];
  if (input && typeof input === 'object') {
    const anyInput = input as any;
    if (Array.isArray(anyInput.items)) return anyInput.items as Course[];
    if (Array.isArray(anyInput.courses)) return anyInput.courses as Course[];
    if (Array.isArray(anyInput.data)) return anyInput.data as Course[];
  }
  return [];
}

type SortKey = 'title-asc'|'title-desc'|'status';
type TabKey = 'all'|'progress'|'complete'|'generating';

function applyDensity(mode:'cozy'|'compact'){
  const b = document.body;
  if (mode === 'compact') b.classList.add('density-compact'); else b.classList.remove('density-compact');
  localStorage.setItem('acb_density', mode);
}

export default function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [percent, setPercent] = useState<Record<number, number>>({}); // id -> %
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('status');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [favs, toggleFav] = useFavs();
  const [tab, setTab] = useState<TabKey>('all');
  const [density, setDensity] = useState<'cozy'|'compact'>(() => (localStorage.getItem('acb_density') as any) || 'cozy');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [allTagOptions, setAllTagOptions] = useState<string[]>([]);

  useEffect(()=> applyDensity(density), [density]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await listCourses();
        const records: Course[] = normalizeCourses(res);
        if (!mounted) return;

        setItems(records);

        const pairs = await Promise.all(
          records
            .filter((c) => c.status === 'ready')
            .map(async (c) => {
              const detail = await getCourse(c.id);
              return [c.id, percentForCourse(detail)] as const;
            })
        );

        if (mounted) setPercent(Object.fromEntries(pairs));
        setAllTagOptions(allTags());
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? 'Failed to load');
      }
    }

    load();
    const off = subscribeProgress(load);
    return () => { mounted = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(()=>{
    let total = items.length, generating = 0, complete = 0, progress = 0, archived = 0;
    const archivedSet = loadArchived();
    for (const c of items){
      if (archivedSet.has(c.id)) { archived++; continue; }
      const s = String((c as any).status);
      if (s === 'generating' || s === 'queued' || s === 'pending') generating++;
      else {
        const p = percent[c.id] ?? 0;
        if (p >= 100) complete++; else progress++;
      }
    }
    return { total, generating, complete, progress, archived };
  }, [items, percent]);

  const filtered = useMemo(() => {
    const archivedSet = loadArchived();
    const k = q.trim().toLowerCase();
    let base = items;

    if (!showArchived) base = base.filter(c => !archivedSet.has(c.id));
    if (onlyFavs) base = base.filter(c => favs.has(c.id));
    if (tagFilter) base = base.filter(c => hasTag(c.id, tagFilter));
    if (k) base = base.filter(c =>
      c.title.toLowerCase().includes(k) || (c.description ?? '').toLowerCase().includes(k)
    );

    base = base.filter(c => {
      const s = String((c as any).status);
      const p = percent[c.id] ?? 0;
      if (tab === 'generating') return s === 'generating' || s === 'queued' || s === 'pending';
      if (tab === 'complete') return p >= 100;
      if (tab === 'progress') return s === 'ready' && p > 0 && p < 100;
      return true;
    });

    switch (sort) {
      case 'title-asc':  base = [...base].sort((a,b)=>a.title.localeCompare(b.title)); break;
      case 'title-desc': base = [...base].sort((a,b)=>b.title.localeCompare(a.title)); break;
      case 'status':     base = [...base].sort((a,b)=>String(a.status).localeCompare(String(b.status))); break;
    }
    return base;
  }, [items, q, sort, onlyFavs, favs, tab, percent, showArchived, tagFilter]);

  const selectedIds = [...selected];

  function toggleSelected(id:number){
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function addTagTo(id:number){
    const t = prompt('Add tag:');
    if (!t) return;
    addTag(id, t);
    setAllTagOptions(allTags());
    toast(`Added “${t}”`, 'success');
  }

  return (
    <main className="stack stack-lg">
      <div className="row" style={{justifyContent:'space-between'}}>
        <h1 className="h1">My Courses</h1>
        <a className="btn ghost" href="/">Back to Builder</a>
      </div>

      {/* stats & controls */}
      <div className="card row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div className="row" style={{gap:14, flexWrap:'wrap'}}>
          <div className="badge">Total {stats.total}</div>
          <div className="badge">In progress {stats.progress}</div>
          <div className="badge">Complete {stats.complete}</div>
          <div className="badge">Generating {stats.generating}</div>
          <div className="badge">Archived {stats.archived}</div>
        </div>
        <div className="row" style={{gap:8, flexWrap:'wrap'}}>
          <label className="row" style={{gap:6}}>
            <input type="checkbox" checked={onlyFavs} onChange={e=>setOnlyFavs(e.target.checked)} />
            <span className="small">Favorites</span>
          </label>
          <label className="row" style={{gap:6}}>
            <input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)} />
            <span className="small">Show archived</span>
          </label>
          <select value={sort} onChange={e=>setSort(e.target.value as SortKey)} className="input select" style={{width:190}}>
            <option value="status">Sort by status</option>
            <option value="title-asc">Title A→Z</option>
            <option value="title-desc">Title Z→A</option>
          </select>
          <select value={density} onChange={e=>setDensity(e.target.value as any)} className="input select" style={{width:150}}>
            <option value="cozy">Cozy</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </div>

      {/* Tabs + tag chips + search */}
      <div className="row" style={{justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
        <div className="row" style={{gap:8}}>
          {(['all','progress','complete','generating'] as TabKey[]).map(t=>(
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
          {!!allTagOptions.length && (
            <>
              <span className="small text-muted" style={{marginLeft:8}}>Filter by tag:</span>
              <button className={`tag ${!tagFilter ? 'active' : ''}`} onClick={()=>setTagFilter(null)}># all</button>
              {allTagOptions.map(t=>(
                <button key={t} className={`tag ${tagFilter===t?'active':''}`} onClick={()=>setTagFilter(t)}>#{t}</button>
              ))}
            </>
          )}
        </div>
        <input id="course-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search courses…" className="input" style={{maxWidth:360}} />
      </div>

      {err && <p className="text-muted" style={{ color: 'var(--danger)' }}>{err}</p>}

      {filtered.length === 0 ? (
        <div className="small text-muted">No courses match your filters.</div>
      ) : (
        <ul className="grid-tiles">
          {filtered.map((c) => {
            const p = percent[c.id] ?? 0;
            const s = String((c as any).status);
            const generating = s === 'generating' || s === 'queued' || s === 'pending';
            const fav = isFav(c.id);
            const archived = isArchived(c.id);
            const tags = getTags(c.id);

            return (
              <li
                key={c.id}
                className="card"
                style={{
                  display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:180,
                  outline: selected.has(c.id) ? '2px solid color-mix(in oklab, var(--ring) 40%, transparent)' : 'none'
                }}
              >
                {/* header */}
                <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
                  <div className="row" style={{gap:8, alignItems:'center'}}>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={()=>toggleSelected(c.id)}
                      title="Select"
                    />
                    <div className="h2">{c.title}</div>
                    {archived && <span className="badge">archived</span>}
                  </div>
                  <div className="row" style={{gap:6}}>
                    <button
                      className={`star ${fav ? 'active' : ''}`}
                      onClick={()=>{ toggleFav(c.id); toast(fav ? 'Removed from favorites' : 'Added to favorites', 'info'); }}
                      title={fav ? 'Remove favorite' : 'Add favorite'}
                      aria-label="Toggle favorite"
                    >
                      <span className="icon">{fav ? '★' : '☆'}</span>
                    </button>
                    <button className="btn" onClick={()=>{
                      const now = toggleArchive(c.id);
                      toast(now ? 'Archived' : 'Unarchived', 'info');
                    }}>{archived ? 'Unarchive' : 'Archive'}</button>
                    <button className="btn" onClick={()=>addTagTo(c.id)}>+ Tag</button>
                    <button className="btn ghost" onClick={async ()=>{
                      if (!confirm('Regenerate this course? This may overwrite sections.')) return;
                      try { await regenerateCourse(c.id, { clear: true, force: true }); toast('Regenerating…','info'); }
                      catch(e:any){ toast(e?.message ?? 'Failed to regenerate','error'); }
                    }}>…</button>
                  </div>
                </div>

                {c.description && <p className="small text-muted" style={{marginTop:6}}>{c.description}</p>}

                {!!tags.length && (
                  <div className="row" style={{gap:6, flexWrap:'wrap'}}>
                    {tags.map(t=> <span key={t} className="tag">#{t}</span>)}
                  </div>
                )}

                <div className="row" style={{justifyContent:'space-between', marginTop:16}}>
                  {generating ? (
                    <ProgressRing size={40} indeterminate showLabel />
                  ) : (
                    <ProgressRing size={40} value={p} showLabel />
                  )}
                  <div className="row">
                    <StatusBadge status={c.status} />
                    <Link className="btn" href={`/course/${c.id}`}>Open</Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!!selectedIds.length && (
        <BulkBar ids={selectedIds} onClose={()=>setSelected(new Set())} />
      )}

      <a className="fab" href="/">＋ New</a>
    </main>
  );
}
