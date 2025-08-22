// src/lib/api.ts
import type { CourseDetail } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
const API_KEY  = process.env.NEXT_PUBLIC_API_KEY  ?? 'dev-key';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
  }
  return res.json() as Promise<T>;
}

export async function createCourse(title: string, description: string) {
  return api<{ id: number; status: string; job_id: string | null }>('/courses', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });
}

export async function regenerateCourse(id: number, opts?: { clear?: boolean; force?: boolean }) {
  const u = new URL(`${API_BASE}/courses/${id}/regenerate`);
  if (opts?.clear) u.searchParams.set('clear', 'true');
  if (opts?.force) u.searchParams.set('force', 'true');
  const res = await fetch(u.toString(), {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
  });
  if (!res.ok) throw new Error(`Regenerate failed: ${res.status}`);
  return res.json() as Promise<{ id: number; status: string; job_id: string | null }>;
}

export async function getStatus(id: number) {
  return api<{ id: number; status: string; job_id: string | null }>(`/courses/${id}/status`);
}

export async function getCourse(id: number) {
  return api<CourseDetail>(`/courses/${id}`);
}

export async function cancelCourse(id: number) {
  return api<void>(`/courses/${id}/cancel`, { method: 'POST' });
}

export async function listCourses() {
  return api<Array<{ id: number; title: string; description?: string | null; status: string }>>(
    '/courses'
  );
}
