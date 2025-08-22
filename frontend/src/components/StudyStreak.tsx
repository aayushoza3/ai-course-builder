// src/components/StudyStreak.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { heatmap, streak } from '@/lib/study';

export default function StudyStreak(){
  const [hm, setHm] = useState<number[]>([]);
  const [st, setSt] = useState(0);

  useEffect(()=>{
    const tick = () => { setHm(heatmap(84)); setSt(streak()); };
    tick();
    const t = setInterval(tick, 2000);
    return ()=> clearInterval(t);
  }, []);

  const cells = useMemo(()=> hm.slice().reverse(), [hm]); // oldest left

  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div className="row" style={{justifyContent:'space-between', marginBottom:8}}>
        <div className="h2">Study streak</div>
        <div className="badge">{st} day{st===1?'':'s'}</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(28, 10px)', gap:3}}>
        {cells.map((v, i)=>(
          <div key={i} title={`${v} session${v===1?'':'s'}`} style={{
            width:10, height:10, borderRadius:3,
            background: v === 0 ? 'color-mix(in oklab, var(--fg) 10%, transparent)'
              : v < 2 ? 'color-mix(in oklab, var(--ring) 25%, transparent)'
              : v < 4 ? 'color-mix(in oklab, var(--ring) 45%, transparent)'
              : 'color-mix(in oklab, var(--ring) 70%, transparent)'
          }}/>
        ))}
      </div>
      <div className="small text-muted" style={{marginTop:6}}>Last 12 weeks • darker means more focus sessions</div>
    </div>
  );
}
