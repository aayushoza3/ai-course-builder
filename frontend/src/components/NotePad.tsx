// src/components/NotePad.tsx
'use client';

import { useEffect, useState } from 'react';

export default function NotePad({ courseId }: { courseId: number }){
  const KEY = `acb_notes_${courseId}`;
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');

  useEffect(()=>{ try{ setTxt(localStorage.getItem(KEY) || ''); }catch{} }, [KEY]);
  useEffect(()=>{ const id = setTimeout(()=> localStorage.setItem(KEY, txt), 300); return ()=>clearTimeout(id); }, [txt, KEY]);

  return (
    <>
      <button className="btn" onClick={()=>setOpen(true)}>✎ Notes</button>
      {open && (
        <>
          <div className="overlay" onClick={()=>setOpen(false)} />
          <div className="modal" style={{maxWidth:720, inset:'10% 0 10% 0'}}>
            <div className="row" style={{justifyContent:'space-between'}}>
              <h2 className="h2">Notes</h2>
              <button className="btn ghost" onClick={()=>setOpen(false)}>Close</button>
            </div>
            <textarea className="textarea" rows={18} value={txt} onChange={e=>setTxt(e.target.value)} placeholder="Write takeaways, questions, links…" />
            <div className="small text-muted">Saved automatically.</div>
          </div>
        </>
      )}
    </>
  );
}
