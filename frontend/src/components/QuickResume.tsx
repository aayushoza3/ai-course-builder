// src/components/QuickResume.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLast } from '@/lib/last';

type LastState = {
  courseId: number;
  courseTitle: string;
  lessonId?: number;
  lessonTitle?: string;
  at?: number;
};

export default function QuickResume() {
  const [last, setLast] = useState<LastState | null>(null);

  useEffect(() => {
    setLast(getLast() as LastState | null);
    const id = setInterval(() => setLast(getLast() as LastState | null), 1500);
    return () => clearInterval(id);
  }, []);

  if (!last) return null;

  return (
    <Link
      href={`/course/${last.courseId}`}
      className="fab"
      style={{ left: 18, bottom: 18 }}
      title={`Resume: ${last.courseTitle}${last.lessonTitle ? ` • ${last.lessonTitle}` : ''}`}
    >
      ↻ Resume
    </Link>
  );
}
