// src/components/BulkBar.tsx
'use client';

import { setArchived } from '@/lib/archive';
import { setTagsForMany } from '@/lib/tags';
import { useFavs } from '@/lib/favs';
import { toast } from '@/lib/toast';
import Link from 'next/link';

type Props = {
  ids: number[];
  onClose: () => void;
};

export default function BulkBar({ ids, onClose }: Props){
  const [favs, toggleFav] = useFavs();

  async function bulkArchive(flag: boolean){
    setArchived(ids, flag);
    toast(flag ? 'Archived selected' : 'Unarchived selected', 'info');
    onClose();
  }

  async function bulkFav(flag: boolean){
    ids.forEach(id => { const is = favs.has(id); if (flag && !is) toggleFav(id); if (!flag && is) toggleFav(id); });
    toast(flag ? 'Added to favorites' : 'Removed favorites', 'info');
    onClose();
  }

  function doTag(){
    const t = prompt('Add a tag to selected:');
    if (!t) return;
    setTagsForMany(ids, t, true);
    toast(`Tagged ${ids.length} course(s) with “${t}”`, 'success');
    onClose();
  }

  function openAll(){
    ids.slice(0, 10).forEach(id => window.open(`/course/${id}`, '_blank'));
  }

  return (
    <div className="card row" style={{position:'fixed', left:16, right:16, bottom:16, zIndex:60, justifyContent:'space-between', backdropFilter:'saturate(1.1) blur(6px)'}}>
      <div className="row"><strong>{ids.length}</strong><span className="text-muted">selected</span></div>
      <div className="row" style={{gap:8}}>
        <button className="btn" onClick={()=>bulkArchive(true)}>Archive</button>
        <button className="btn" onClick={()=>bulkArchive(false)}>Unarchive</button>
        <button className="btn" onClick={doTag}>+ Tag</button>
        <button className="btn" onClick={()=>bulkFav(true)}>★ Favorite</button>
        <button className="btn" onClick={()=>bulkFav(false)}>☆ Unfavorite</button>
        <button className="btn" onClick={openAll} title="Opens up to 10 tabs">Open all</button>
        <button className="btn ghost" onClick={onClose}>Clear</button>
        <Link className="btn primary" href="/courses">Done</Link>
      </div>
    </div>
  );
}
