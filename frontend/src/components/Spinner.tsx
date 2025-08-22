// src/components/Spinner.tsx
'use client';

export default function Spinner({ size = 18 }: { size?: number }) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]"
      style={{ width: size, height: size }}
      role="status"
      aria-label="loading"
    />
  );
}
