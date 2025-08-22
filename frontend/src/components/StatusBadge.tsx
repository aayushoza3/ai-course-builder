// src/components/StatusBadge.tsx
import type { CourseStatus } from '@/lib/types';
import clsx from 'clsx';

const colors: Record<CourseStatus, string> = {
  pending: 'bg-gray-200 text-gray-700 ring-gray-300 dark:bg-gray-900 dark:text-gray-300',
  generating: 'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-200',
  ready: 'bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200',
  failed: 'bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-900/40 dark:text-rose-200',
  canceled: 'bg-gray-100 text-gray-700 ring-gray-300 dark:bg-gray-800/60 dark:text-gray-300',
};

export default function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1', colors[status])}>
      {status}
    </span>
  );
}
