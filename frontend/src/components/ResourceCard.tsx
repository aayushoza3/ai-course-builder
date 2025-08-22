// src/components/ResourceCard.tsx
'use client';

import Image from 'next/image';

function ytId(u: string) {
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if (url.hostname.includes('youtube')) return new URLSearchParams(url.search).get('v');
  } catch {}
  return null;
}

export default function ResourceCard({ url, title, provider }: { url: string; title: string; provider: string }) {
  let thumb: string | null = null;
  const id = ytId(url);
  if (id) thumb = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

  let hostname = '';
  try { hostname = new URL(url).hostname.replace(/^www\./,''); } catch {}
  const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl border border-border/60 overflow-hidden hover:shadow-md bg-card"
    >
      <div className="aspect-video bg-muted/40 relative">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={favicon} alt="" width={28} height={28} className="opacity-80" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-sm font-medium line-clamp-2">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{provider || hostname}</div>
      </div>
    </a>
  );
}
