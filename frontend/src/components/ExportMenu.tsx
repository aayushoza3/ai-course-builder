// src/components/ExportMenu.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CourseDetail } from '@/lib/types';
import { toast } from '@/lib/toast';

function toMarkdown(detail: CourseDetail){
  const lines:string[] = [];
  lines.push(`# ${detail.title}`);
  if (detail.description) lines.push('', detail.description);
  lines.push('');
  detail.modules.sort((a,b)=>a.order-b.order).forEach((m,i)=>{
    lines.push(`## Module ${i+1}: ${m.title}`, '');
    m.lessons.forEach((l,j)=>{
      lines.push(`### ${i+1}.${j+1} ${l.title}`);
      if (l.content_md) { lines.push('', l.content_md.trim(), ''); }
      if (l.resources?.length){
        lines.push('**Resources**');
        l.resources.forEach(r => lines.push(`- [${r.title}](${r.url})`));
        lines.push('');
      }
    });
  });
  return lines.join('\n');
}

export default function ExportMenu({ detail }: { detail: CourseDetail }){
  const [open, setOpen] = useState(false);
  const md = useMemo(()=>toMarkdown(detail), [detail]);
  const json = useMemo(()=>JSON.stringify(detail, null, 2), [detail]);

  const download = (ext:'md'|'json') => {
    const data = ext === 'md' ? md : json;
    const type = ext === 'md' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([data], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${detail.title.replace(/\s+/g,'_')}.${ext}`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 0);
    toast(`${ext.toUpperCase()} exported`, 'success');
  };

  const copy = async () => {
    try{ await navigator.clipboard.writeText(md); toast('Copied Markdown to clipboard', 'success'); }
    catch{ toast('Copy failed', 'error'); }
  };

  // keyboard integration
  useEffect(()=>{
    const onExport = (e: Event) => {
      const cmd = (e as CustomEvent).detail?.cmd ?? 'open';
      if (cmd === 'open') setOpen(true);
      if (cmd === 'download') { download('md'); setOpen(false); }
      if (cmd === 'copy') { copy(); setOpen(false); }
    };
    window.addEventListener('acb:export', onExport as EventListener);
    return () => window.removeEventListener('acb:export', onExport as EventListener);
  }, [md]);

  return (
    <div style={{position:'relative'}}>
      <button className="btn" onClick={()=>setOpen(o=>!o)} aria-haspopup="menu" aria-expanded={open}>Export</button>
      {open && (
        <div className="card" style={{position:'absolute', right:0, top:'110%', zIndex:40, width:260}}>
          <div className="small text-muted" style={{marginBottom:8}}>Export this course</div>
          <div className="stack">
            <button className="btn" onClick={()=>download('md')}>Download .md</button>
            <button className="btn" onClick={()=>download('json')}>Download .json</button>
            <button className="btn ghost" onClick={copy}>Copy Markdown</button>
          </div>
          <div className="small text-muted" style={{marginTop:8}}>
            Tip: <span className="kbd">Shift</span>+<span className="kbd">E</span> to open •
            <span className="kbd">Cmd/Ctrl</span>+<span className="kbd">Shift</span>+<span className="kbd">E</span> to download
          </div>
        </div>
      )}
    </div>
  );
}
