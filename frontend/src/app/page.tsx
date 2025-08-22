// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createCourse, getStatus, getCourse, regenerateCourse } from '@/lib/api';
import type { CourseDetail, CourseStatus } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';
import { getLast } from '@/lib/last';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import BackTop from '@/components/BackTop';

type LastState = {
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  lessonTitle?: string;
  at?: number;
};

const TEMPLATES = [
  { title: 'Resume tips for internships', desc: 'Craft a focused, ATS-friendly resume.' },
  { title: 'Intro to C/C++', desc: 'Pointers, memory, build tools, debugging.' },
  { title: 'Public speaking basics', desc: 'Structure, delivery, storytelling, practice routine.' },
];

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<number | null>(null);
  const [status, setStatus] = useState<CourseStatus>('pending');
  const [jobId, setJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Cast the untyped localStorage payload to a concrete shape
  const last = getLast() as LastState | null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDetail(null);
    try {
      const res = await createCourse(title.trim(), description.trim());
      setCourseId(res.id);
      setStatus((res.status as CourseStatus) ?? 'generating');
      setJobId(res.job_id ?? null);
      setPolling(true);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Create failed');
    }
  }

  // status poller
  useEffect(() => {
    if (!polling || !courseId) return;
    let stop = false;
    const tick = async () => {
      try {
        const s = await getStatus(courseId);
        setStatus(s.status as CourseStatus);
        if (s.status === 'ready') {
          const d = await getCourse(courseId);
          setDetail(d);
          setPolling(false);
          return;
        }
        if (!stop) setTimeout(tick, 1200);
      } catch (e) {
        const err = e as { message?: string };
        if (!stop) {
          setError(err?.message ?? 'Polling failed');
          setTimeout(tick, 2500);
        }
      }
    };
    tick();
    return () => { stop = true; };
  }, [polling, courseId]);

  return (
    <div className="stack stack-lg" style={{ maxWidth: 720, margin: '0 auto' }}>
      <header className="stack">
        <h1 className="h1">AI Course Builder</h1>
        <p className="text-muted">Describe what you want to learn. We’ll make the course.</p>
      </header>

      {last ? (
        <div className="card row" style={{ justifyContent: 'space-between' }}>
          <div className="stack">
            <div className="h2">Continue learning</div>
            <div className="small text-muted">
              {last.courseTitle}{last.lessonTitle ? ` — ${last.lessonTitle}` : ''}
            </div>
          </div>
          <Link href={`/course/${last.courseId}`} className="btn">Resume</Link>
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="card stack">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="intro to c++"
          className="input"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What should this course cover?"
          rows={6}
          className="textarea"
        />
        <div className="row">
          <button className="btn primary" type="submit">Create course</button>
          <Link className="btn ghost" href="/courses">My Courses</Link>
        </div>
      </form>

      {/* quick templates */}
      <section className="stack">
        <div className="small text-muted">Or start from a template</div>
        <ul className="grid-tiles">
          {TEMPLATES.map((t, i) => (
            <li key={i} className="card row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="h2">{t.title}</div>
                <div className="small text-muted">{t.desc}</div>
              </div>
              <button
                className="btn"
                onClick={() => {
                  setTitle(t.title);
                  setDescription(t.desc);
                  const el = document.querySelector('form') as HTMLFormElement | null;
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Use
              </button>
            </li>
          ))}
        </ul>
      </section>

      {courseId && (
        <section className="stack">
          <div className="row small">
            <div>Course ID: <span style={{ fontWeight: 600 }}>{courseId}</span></div>
            <StatusBadge status={status} />
            {status === 'generating' && <div className="acb-spinner" />}
            {jobId && <span className="text-muted">job {jobId}</span>}
          </div>

          {status === 'ready' && (
            <div className="row">
              <Link href={`/course/${courseId}`} className="btn">Open detail page</Link>
              <button
                className="btn ghost"
                onClick={async () => {
                  await regenerateCourse(courseId, { clear: true, force: true });
                  setStatus('generating');
                  setDetail(null);
                  setPolling(true);
                }}
              >
                Regenerate
              </button>
            </div>
          )}
        </section>
      )}

      {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}

      <KeyboardShortcuts />
      <BackTop />
      <a className="fab" href="/">＋ New</a>
    </div>
  );
}
