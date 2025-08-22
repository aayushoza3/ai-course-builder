// src/components/QuickResume.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLast } from '@/lib/last';

type Last = ReturnType<typeof getLast> extends infer T ? T : any;

export default function QuickResume(){
  const [last, setLast] = useState<Last | null>(null);

  useEffect(()=>{
    setLast(getLast());
    const id = setInterval(()=> setLast(getLast()), 1500);
    return ()=> clearInterval(id);
  }, []);

  if (!last) return null;

  return (
    <Link
      href={`/course/${last.courseId}`}
      className="fab"
      style={{ left: 18, bottom: 18 }}
      title={`Resume: ${last.courseTitle}${last.lessonTitle ? ' • ' + last.lessonTitle : ''}`}
    >
      ↻ Resume
    </Link>
  );
}
