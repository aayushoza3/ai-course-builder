// src/components/FocusTimer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/toast';
import { confettiBurst } from '@/lib/confetti';
import { logStudy } from '@/lib/study';

function fmt(ms:number){
  const s = Math.max(0, Math.round(ms/1000));
  const m = Math.floor(s/60);
  const r = s%60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

export default function FocusTimer(){
  const [ms, setMs] = useState(25*60*1000);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(()=>{
    if (!running) { if (ref.current) cancelAnimationFrame(ref.current); return; }
    let start = performance.now();
    const step = (now:number)=>{
      const diff = now - start; start = now;
      setMs(v => {
        const next = v - diff;
        if (next <= 0){
          setRunning(false);
          toast('Focus session complete! 🎉', 'success');
          confettiBurst(50);
          logStudy();                      // <-- record session
          return 0;
        }
        return next;
      });
      ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return ()=> { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [running]);

  return (
    <>
      <button className="fab" style={{right:18, bottom:18}} onClick={()=>setOpen(o=>!o)} title="Focus timer">⏱️</button>
      {open && (
        <div className="card" style={{position:'fixed', right:18, bottom:88, zIndex:70, width:260}}>
          <div className="h2">Focus timer</div>
          <div className="center" style={{fontSize:32, fontWeight:800, letterSpacing:1}}>{fmt(ms)}</div>
          <div className="row" style={{justifyContent:'space-between'}}>
            <button className="btn" onClick={()=>setRunning(r=>!r)}>{running ? 'Pause' : 'Start'}</button>
            <button className="btn ghost" onClick={()=>setMs(25*60*1000)}>25:00</button>
            <button className="btn ghost" onClick={()=>setMs(50*60*1000)}>50:00</button>
            <button className="btn ghost" onClick={()=>setMs(5*60*1000)}>05:00</button>
          </div>
          <div className="row" style={{justifyContent:'flex-end'}}>
            <button className="btn ghost" onClick={()=>{ setRunning(false); setMs(25*60*1000); }}>Reset</button>
          </div>
        </div>
      )}
    </>
  );
}
