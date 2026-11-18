"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Play, Send, Volume2, VolumeX } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import CommentSheet from "@/components/CommentSheet";

type Props = {
  videos: any[];
  creators: any[];
  onVideoSelect: (video: any) => void;
};

type Post = {
  video: any;
  creator: any;
  commentCount: number;
};

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
function timeAgo(date: any) {
  if (!date) return "";
  const d = new Date(date).getTime();
  if (!isFinite(d)) return "";
  const days = Math.max(0, Math.floor((Date.now() - d) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function PostMedia({ video, onOpen, onLike }: { video: any; onOpen: () => void; onLike: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const lastTap = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const o = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "150px", threshold: 0.2 });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (inView) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  }, [inView]);

  const src = video.videoUrl || video.bitchuteUrl;

  return (
    <div ref={wrapRef} className="relative w-full aspect-[4/5] bg-black overflow-hidden">
      <img src={video.posterUrl || video.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {src && inView && (
        <video
          ref={ref}
          src={src}
          muted={muted}
          playsInline
          loop
          preload="metadata"
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <button
        className="absolute inset-0"
        aria-label="Play or pause"
        onClick={() => {
          const now = Date.now();
          if (now - lastTap.current < 300) { onLike(); lastTap.current = 0; return; }
          lastTap.current = now;
          const v = ref.current;
          if (v) { if (v.paused) v.play().catch(() => {}); else v.pause(); }
          else onOpen();
        }}
      />
      {src && (
        <button
          onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md"
        >
          {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      )}
      {!playing && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Play size={44} fill="white" className="text-white/80 drop-shadow-lg" />
        </span>
      )}
    </div>
  );
}

export default function InstagramHomeFeed({ videos, creators, onVideoSelect }: Props) {
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [sheetVideo, setSheetVideo] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [likedLocal, setLikedLocal] = useState<number[]>([]);

  const posts: Post[] = useMemo(() => {
    const usable = videos.filter((v: any) => (v.videoUrl || v.bitchuteUrl) && v.type?.toLowerCase() !== "tweet");
    return usable.slice().sort((a: any, b: any) => b.id - a.id).slice(0, 40).map((video: any) => {
      const creator = creators.find((c: any) =>
        (video.creatorId && c.id === video.creatorId) ||
        (video.uploaderUserId && (c.ownerUserId === video.uploaderUserId || c.user_id === video.uploaderUserId))
      ) || null;
      return { video, creator, commentCount: commentCounts[video.id] || 0 };
    });
  }, [videos, creators, commentCounts]);

  useEffect(() => {
    fetch("/api/comment-counts", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCommentCounts(d?.counts || {}))
      .catch(() => {});
  }, []);

  const toggleSave = (id: number) => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const storyCreators = creators.slice(0, 20);

  return (
    <div className="pb-24">
      {/* Stories tray */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-3 py-3 border-b border-white/[0.06]">
        {storyCreators.map((c: any) => (
          <Link key={c.id} href={c.slug ? `/profile/${c.slug}` : "#"} className="flex w-[64px] shrink-0 flex-col items-center gap-1.5">
            <span className="rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[2px]">
              <span className="block rounded-full border-2 border-[#08090c] p-[1px]">
                <span className="block h-[54px] w-[54px] overflow-hidden rounded-full bg-[#1c1c1e]">
                  {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white/70">{c.name?.[0]}</span>}
                </span>
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] text-white/75">{c.name?.split(" ")[0]}</span>
          </Link>
        ))}
      </div>

      {/* Posts */}
      <div className="divide-y divide-white/[0.06]">
        {posts.map(({ video, creator, commentCount }) => {
          const name = creator?.name || "Trooflix Creator";
          const avatar = creator?.photoUrl;
          return (
            <article key={video.id} className="pb-3">
              <header className="flex items-center gap-2.5 px-3 py-2.5">
                <Link href={creator?.slug ? `/profile/${creator.slug}` : "#"} className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-tr from-[#f09433] to-[#dc2743] p-[1.5px]">
                  <span className="block h-full w-full overflow-hidden rounded-full border-2 border-[#08090c]">
                    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">{name[0]}</span>}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">{name}</p>
                  <p className="truncate text-[10px] text-white/45">{video.category || "Trooflix"}</p>
                </div>
                <button onClick={() => onVideoSelect(video)} aria-label="More" className="p-1 text-white/70"><MoreHorizontal size={20} /></button>
              </header>

              <PostMedia
                video={video}
                onOpen={() => onVideoSelect(video)}
                onLike={() => setLikedLocal(prev => prev.includes(video.id) ? prev : [...prev, video.id])}
              />

              <div className="flex items-center gap-4 px-3 pt-2.5">
                <LikeButton videoId={video.id} size={24} showCount={false} />
                <button onClick={() => setSheetVideo(video.id)} aria-label="Comments" className="text-white active:opacity-60"><MessageCircle size={24} strokeWidth={1.7} /></button>
                <button onClick={() => { if (navigator.share) navigator.share({ title: video.title, url: window.location.href }).catch(() => {}); }} aria-label="Share" className="text-white active:opacity-60"><Send size={23} strokeWidth={1.7} /></button>
                <button onClick={() => toggleSave(video.id)} aria-label="Save" className={`ml-auto active:opacity-60 ${saved.includes(video.id) ? "text-[#ffd93d]" : "text-white"}`}><Bookmark size={23} strokeWidth={1.7} fill={saved.includes(video.id) ? "currentColor" : "none"} /></button>
              </div>

              <div className="px-3 pt-1.5">
                <p className="text-[13px] font-semibold text-white">{formatCount((video as any).likeCount || 0) || "0"} likes</p>
                <p className="mt-1 text-[13px] leading-snug text-white/90">
                  <span className="font-semibold">{name}</span> {video.description || video.title}
                </p>
                {commentCount > 0 && (
                  <button onClick={() => setSheetVideo(video.id)} className="mt-1 text-[12px] text-white/40">View all {commentCount} comments</button>
                )}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-white/30">{timeAgo(video.createdAt)}</p>
              </div>
            </article>
          );
        })}
      </div>

      {posts.length === 0 && (
        <p className="py-20 text-center text-sm text-white/40">No posts yet.</p>
      )}

      <CommentSheet videoId={sheetVideo} open={sheetVideo !== null} onClose={() => setSheetVideo(null)} />
    </div>
  );
}
