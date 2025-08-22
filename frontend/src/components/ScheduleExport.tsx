// src/components/ScheduleExport.tsx
'use client';

import React, { useMemo, useState } from 'react';
import type { CourseDetail } from '@/lib/types';
import { toast } from '@/lib/toast';

function fmtICSDateLocal(d: Date) {
  // floating local time (no timezone) for broad compatibility
  const pad = (n: number, w=2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function buildICS(detail: CourseDetail, start: Date, minutesPerEvent: number, eventsPerDay: number) {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Course Builder//Schedule//EN',
  ];
  const modules = detail.modules.sort((a,b)=>a.order-b.order);
  let cursor = new Date(start);

  let perDayCount = 0;
  for (const m of modules) {
    if (perDayCount >= eventsPerDay) {
      // next day
      const next = new Date(cursor);
      next.setDate(next.getDate() + 1);
      next.setHours(start.getHours(), start.getMinutes(), 0, 0);
      cursor = next;
      perDayCount = 0;
    }

    const dtStart = new Date(cursor);
    const dtEnd = new Date(dtStart.getTime() + minutesPerEvent * 60_000);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${detail.id}-${m.id}-${dtStart.getTime()}@acb`,
      `DTSTAMP:${fmtICSDateLocal(new Date())}`,
      `DTSTART:${fmtICSDateLocal(dtStart)}`,
      `DTEND:${fmtICSDateLocal(dtEnd)}`,
      `SUMMARY:${detail.title} — Module ${m.order}: ${m.title}`,
      'END:VEVENT'
    );

    // advance start time for next slot same day
    cursor = new Date(dtEnd);
    perDayCount += 1;
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export default function ScheduleExport({ detail }: { detail: CourseDetail }) {
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0,10);
  });
  const [time, setTime] = useState<string>('18:00');
  const [minutes, setMinutes] = useState<number>(45);
  const [eventsPerDay, setEventsPerDay] = useState<number>(1);

  const totalModules = useMemo(()=> detail.modules.length, [detail]);

  const create = () => {
    try {
      const [h,m] = time.split(':').map(Number);
      const start = new Date(date + 'T00:00:00');
      start.setHours(isFinite(h)?h:18, isFinite(m)?m:0, 0, 0);

      const ics = buildICS(detail, start, minutes, eventsPerDay);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${detail.title.replace(/\s+/g,'_')}_study_schedule.ics`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 0);
      toast('Study schedule exported (.ics)', 'success');
      setOpen(false);
    } catch {
      toast('Export failed', 'error');
    }
  };

  return (
    <div style={{position:'relative'}}>
      <button className="btn" onClick={()=>setOpen(o=>!o)} aria-haspopup="menu" aria-expanded={open}>Plan study</button>
      {open && (
        <div className="card" style={{position:'absolute', right:0, top:'110%', zIndex:40, width:300}}>
          <div className="small text-muted" style={{marginBottom:8}}>Create calendar events for your modules</div>
          <div className="stack">
            <label className="small">Start date
              <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </label>
            <label className="small">Start time
              <input className="input" type="time" value={time} onChange={e=>setTime(e.target.value)} />
            </label>
            <label className="small">Minutes per module
              <input className="input" type="number" min={10} max={240} value={minutes} onChange={e=>setMinutes(Number(e.target.value)||45)} />
            </label>
            <label className="small">Modules per day
              <input className="input" type="number" min={1} max={5} value={eventsPerDay} onChange={e=>setEventsPerDay(Number(e.target.value)||1)} />
            </label>
            <div className="small text-muted">You have {totalModules} modules</div>
            <div className="row" style={{justifyContent:'flex-end', gap:8}}>
              <button className="btn ghost" onClick={()=>setOpen(false)}>Cancel</button>
              <button className="btn" onClick={create}>Export .ics</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
