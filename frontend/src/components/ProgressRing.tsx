// src/components/ProgressRing.tsx
'use client';
import React from 'react';

export default function ProgressRing({
  size = 44,
  value = 0,
  thickness = 6,
  showLabel = true,
  indeterminate = false,
}: {
  size?: number;
  value?: number;          // 0..100
  thickness?: number;
  showLabel?: boolean;
  indeterminate?: boolean; // spinning state
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = c * (1 - clamped / 100);

  return (
    <div className={`ring${indeterminate ? ' spin' : ''}`} style={{ ['--size' as any]: `${size}px`, ['--thick' as any]: `${thickness}px` }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--ring)" />
            <stop offset="100%" stopColor="var(--ring-2)" />
          </linearGradient>
        </defs>
        <circle className="track" cx={size/2} cy={size/2} r={r} strokeWidth={thickness} fill="none" />
        <circle
          className="meter"
          cx={size/2}
          cy={size/2}
          r={r}
          strokeWidth={thickness}
          strokeDasharray={`${c}px`}
          strokeDashoffset={indeterminate ? c * 0.75 : `${dash}px`}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showLabel && !indeterminate && <span className="label">{clamped}%</span>}
      {showLabel && indeterminate && <span className="label">…</span>}
    </div>
  );
}
