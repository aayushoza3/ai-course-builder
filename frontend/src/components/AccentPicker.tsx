// src/components/AccentPicker.tsx
'use client';

import { useEffect, useState } from 'react';

type ThemePreset = { ring:string; ring2:string; accent:string; name:string };

const PRESETS: ThemePreset[] = [
  { name:'Indigo',   ring:'#4f46e5', ring2:'#10b981', accent:'#7c3aed' },
  { name:'Sky',      ring:'#0ea5e9', ring2:'#22c55e', accent:'#38bdf8' },
  { name:'Rose',     ring:'#f43f5e', ring2:'#10b981', accent:'#fb7185' },
  { name:'Amber',    ring:'#f59e0b', ring2:'#84cc16', accent:'#fbbf24' },
  { name:'Violet',   ring:'#8b5cf6', ring2:'#06b6d4', accent:'#a78bfa' },
];

const KEY = 'acb_accent';

export default function AccentPicker(){
  const [val, setVal] = useState<ThemePreset>(() => {
    try{ return JSON.parse(localStorage.getItem(KEY) || 'null') ?? PRESETS[0]; }catch{ return PRESETS[0]; }
  });

  useEffect(()=>{
    const root = document.documentElement;
    root.style.setProperty('--ring', val.ring);
    root.style.setProperty('--ring-2', val.ring2);
    root.style.setProperty('--accent', val.accent);
    try{ localStorage.setItem(KEY, JSON.stringify(val)); }catch{}
  }, [val]);

  return (
    <div className="row" style={{gap:6}}>
      {PRESETS.map(p=>(
        <button
          key={p.name}
          className="icon-btn"
          onClick={()=>setVal(p)}
          title={p.name}
          style={{
            width:26, height:26, borderRadius:8,
            background: `linear-gradient(90deg, ${p.ring}, ${p.ring2})`,
            borderColor:'transparent'
          }}
          aria-pressed={val.name===p.name}
        />
      ))}
    </div>
  );
}
