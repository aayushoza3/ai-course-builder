import Link from 'next/link';

export default function YouTubeCard({ url, title }: { url:string; title:string }) {
  const m = url.match(/(?:v=|youtu\.be\/)([\w\-]{6,})/i);
  const vid = m?.[1];
  const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : undefined;
  return (
    <Link href={url} target="_blank" className="group rounded-xl border overflow-hidden inline-block w-full">
      {thumb && <img src={thumb} alt={title} className="w-full aspect-video object-cover" />}
      <div className="p-3 text-sm group-hover:underline">{title || 'YouTube video'}</div>
    </Link>
  );
}
