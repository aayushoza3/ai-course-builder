// src/components/CourseInsights.tsx
'use client';

import React, { useMemo } from 'react';
import type { CourseDetail } from '@/lib/types';
import { lessonDone } from '@/lib/progress';

function words(str: string) {
  return (str || '').trim().split(/\s+/).filter(Boolean).length;
}

export default function CourseInsights({ detail }: { detail: CourseDetail }) {
  const stats = useMemo(() => {
    const totalLessons = detail.modules.reduce((n, m) => n + m.lessons.length, 0);
    const completedLessons = detail.modules.reduce(
      (n, m) => n + m.lessons.filter(l => lessonDone(detail.id, l.id)).length,
      0
    );

    // Estimate reading time using 220 wpm; fallback 6 min per lesson if empty
    let totalWords = 0;
    let counted = 0;
    for (const m of detail.modules) {
      for (const l of m.lessons) {
        const w = words(l.content_md || '');
        if (w > 0) { totalWords += w; counted++; }
      }
    }
    const minutesFromWords = totalWords / 220;
    const fallbackMinutes = (detail.modules.reduce((n,m) => n+m.lessons.length, 0) - counted) * 6;
    const estTotalMin = Math.ceil(minutesFromWords + fallbackMinutes);

    const estRemainingMin = Math.ceil(estTotalMin * (1 - completedLessons / Math.max(1, totalLessons)));

    return { totalLessons, completedLessons, estTotalMin, estRemainingMin };
  }, [detail]);

  return (
    <div className="card" aria-label="Course insights">
      <div className="h2" style={{marginBottom:8}}>Insights</div>
      <div className="row" style={{gap:10, flexWrap:'wrap'}}>
        <div className="badge">Lessons: {stats.completedLessons}/{stats.totalLessons}</div>
        <div className="badge">Est. time: ~{stats.estTotalMin} min</div>
        <div className="badge">Remaining: ~{stats.estRemainingMin} min</div>
      </div>
      {detail.description && <p className="small text-muted" style={{marginTop:8}}>{detail.description}</p>}
    </div>
  );
}
