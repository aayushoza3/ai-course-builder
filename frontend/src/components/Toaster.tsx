// src/components/Toaster.tsx
'use client';

import React, { useEffect, useState } from 'react';

type ToastItem = { id: number; msg: string; type: 'success'|'info'|'error' };

export default function Toaster(){
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(()=>{
    let id = 1;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const t: ToastItem = { id: id++, msg: String(detail.msg ?? ''), type: detail.type ?? 'info' };
      setItems(list => [...list, t]);
      setTimeout(()=> setItems(list => list.filter(x => x.id !== t.id)), detail.timeout ?? 2600);
    };
    window.addEventListener('acb:toast', handler as EventListener);
    return ()=> window.removeEventListener('acb:toast', handler as EventListener);
  }, []);

  return (
    <div className="toast-wrap" aria-live="polite" aria-atomic="true">
      {items.map(t=>(
        <div key={t.id} className={`toast ${t.type}`}>
          <div className="dot" />
          <div className="msg">{t.msg}</div>
        </div>
      ))}
    </div>
  );
}
