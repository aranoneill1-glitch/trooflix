"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Headphones, Heart, Maximize2, MessageCircle, MoreHorizontal, Play, Send, ShoppingBag, Volume2, VolumeX } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import CommentSheet from "@/components/CommentSheet";
import { GoldCoin } from "@/components/TipModal";
import { ChevronDown, X as XIcon } from "lucide-react";
import { MAIN_TYPES, SUB_CATEGORIES, normalizeMainType, type MainType } from "@/lib/videoTypes";

type Props = {
  videos: any[];
  creators: any[];
  onVideoSelect: (video: any) => void;
  showWelcome?: boolean;
};

type Post = {
  video: any;
  creator: any;
  commentCount: number;
};

function haptic() { try { (navigator as any).vibrate?.(10); } catch {} }

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

function PostMedia({ video, onOpen, onLike, isActive }: { video: any; onOpen: () => void; onLike: () => void; isActive: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (isActive) {
      // Autoplay with sound is blocked by browsers. Start muted, then unmute
      // on the next real user tap (see handleTap) — that gesture allows sound.
      v.muted = true;
      setMuted(true);
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
      v.muted = true;
      setMuted(true);
      setPlaying(false);
    }
  }, [isActive]);

  const handleTap = () => {
    const v = ref.current;
    if (!v) { onOpen(); return; }
    const now = Date.now();
    if (now - lastTap.current < 300) { onLike(); lastTap.current = 0; return; }
    lastTap.current = now;
    // First tap on an active, muted clip turns the sound on (user gesture).
    if (isActive && v.muted) {
      v.muted = false;
      setMuted(false);
      if (v.paused) v.play().catch(() => {});
      return;
    }
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  };

  const src = video.videoUrl || video.bitchuteUrl;

  return (
    <div className="relative w-full aspect-[4/5] bg-black overflow-hidden">
      <img src={video.posterUrl || video.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {src && (
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
        onClick={handleTap}
      />
      {src && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
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

export default function InstagramHomeFeed({ videos, creators, onVideoSelect, showWelcome = false }: Props) {
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [sheetVideo, setSheetVideo] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [likedLocal, setLikedLocal] = useState<number[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const postRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [activeType, setActiveType] = useState<MainType | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  // Remember where the user was so returning from the full-screen shorts
  // player restores the exact scroll position and active filter.
  const openShortsPlayer = (id: number) => {
    try {
      sessionStorage.setItem("trooflix:feedReturn", JSON.stringify({
        scrollY: window.scrollY,
        activeType,
        activeCategory,
      }));
    } catch {}
    window.location.href = `/feed?reel=${id}`;
  };

  useEffect(() => {
    let saved: { scrollY?: number; activeType?: MainType | null; activeCategory?: string | null } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem("trooflix:feedReturn") || "null"); } catch {}
    if (saved) {
      if (saved.activeType !== undefined) setActiveType(saved.activeType ?? null);
      if (saved.activeCategory !== undefined) setActiveCategory(saved.activeCategory ?? null);
      try { sessionStorage.removeItem("trooflix:feedReturn"); } catch {}
      const y = Number(saved.scrollY) || 0;
      const restore = () => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => requestAnimationFrame(restore));
      const t = setTimeout(restore, 400);
      return () => clearTimeout(t);
    }
  }, []);

  const posts: Post[] = useMemo(() => {
    let usable = videos.filter((v: any) => (v.videoUrl || v.bitchuteUrl) && v.type?.toLowerCase() !== "tweet");
    if (activeType) usable = usable.filter((v: any) => normalizeMainType(v) === activeType);
    if (activeCategory) usable = usable.filter((v: any) => String(v.category || "") === activeCategory);
    return usable.slice().sort((a: any, b: any) => b.id - a.id).slice(0, 40).map((video: any) => {
      const creator = creators.find((c: any) =>
        (video.creatorId && c.id === video.creatorId) ||
        (video.uploaderUserId && (c.ownerUserId === video.uploaderUserId || c.user_id === video.uploaderUserId))
      ) || null;
      return { video, creator, commentCount: commentCounts[video.id] || 0 };
    });
  }, [videos, creators, commentCounts, activeType, activeCategory]);

  useEffect(() => {
    const nodes = Array.from(postRefs.current.values());
    if (!nodes.length) return;
    if (typeof IntersectionObserver === "undefined") { setActiveId(posts[0]?.video.id ?? null); return; }
    const observer = new IntersectionObserver((entries) => {
      // The post whose center is closest to the viewport center wins.
      const center = window.innerHeight / 2;
      let bestId: number | null = null;
      let bestDistance = Infinity;
      entries.forEach((entry) => {
        const id = Number((entry.target as HTMLElement).dataset.postId);
        if (!entry.isIntersecting) return;
        const rect = entry.boundingClientRect;
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        if (distance < bestDistance) { bestDistance = distance; bestId = id; }
      });
      if (bestId !== null) setActiveId(bestId);
    }, { rootMargin: "-20% 0px -20% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    nodes.forEach(n => observer.observe(n));
    return () => observer.disconnect();
  }, [posts]);

  useEffect(() => {
    fetch("/api/comment-counts", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCommentCounts(d?.counts || {}))
      .catch(() => {});
  }, []);

  const toggleSave = (id: number) => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="pb-24">
      {showWelcome && (
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+68px)] pb-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F06A72] mb-2">Welcome to Trooflix</p>
          <h1 className="text-2xl font-black tracking-tight text-white mb-1">Creation freedom starts here.</h1>
          <p className="text-xs text-white/45 mb-4">Watch, create and get paid for what you love.</p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/login" className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition">Sign in</Link>
            <Link href="/signup" className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition">Sign up</Link>
          </div>
        </div>
      )}

      {/* Main-type pills + categories dropdown — below the fixed top bar */}
      <div className={`px-3 pb-3 border-b border-white/[0.06] ${showWelcome ? "pt-1" : "pt-[calc(env(safe-area-inset-top)+68px)]"}`}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {MAIN_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => { haptic(); setActiveType(prev => prev === t.id ? null : t.id); setActiveCategory(null); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                activeType === t.id ? "bg-[#E53945] border-[#E53945] text-white" : "bg-white/5 border-white/10 text-white/60"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => { haptic(); setCategoriesOpen(v => !v); }}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition ${activeCategory || categoriesOpen ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/60"}`}
          >
            Categories <ChevronDown size={13} className={categoriesOpen ? "rotate-180" : ""} />
          </button>
        </div>

        {categoriesOpen && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUB_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { haptic(); setActiveCategory(prev => prev === c ? null : c); setActiveType(null); }}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${activeCategory === c ? "bg-[#E53945] border-[#E53945] text-white" : "bg-white/5 border-white/10 text-white/60"}`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {(activeType || activeCategory) && (
          <button onClick={() => { setActiveType(null); setActiveCategory(null); }} className="mt-3 inline-flex items-center gap-1 text-[11px] text-white/45">
            <XIcon size={12} /> Clear filter
          </button>
        )}
      </div>

      {/* Posts */}
      <div className="divide-y divide-white/[0.06]">
        {posts.map(({ video, creator, commentCount }, index) => {
          const name = creator?.name || "Trooflix Creator";
          const avatar = creator?.photoUrl;
          return (
            <React.Fragment key={video.id}>
            {index === 4 && (
              <article className="px-4 py-6">
                <Link href="/merchandise" className="block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1c1e] to-[#0d0d10]">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1200&auto=format&fit=crop" alt="Trooflix merch" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute bottom-3 left-4 text-xl font-black tracking-tight text-white">Creators Market</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">Wear the movement</p>
                      <p className="text-xs text-white/50">Merch from your favourite creators.</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#E53945] px-4 py-2 text-xs font-bold text-white">
                      <ShoppingBag size={14} /> Visit store
                    </span>
                  </div>
                </Link>
              </article>
            )}
            {index === 8 && (
              <article className="px-4 py-6">
                <Link href="/latest?category=Podcasts" className="block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1c1c1e] to-[#0d0d10]">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=1200&auto=format&fit=crop" alt="Podcast studio" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute bottom-3 left-4 text-xl font-black tracking-tight text-white">Podcasts</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">Listen to the voices</p>
                      <p className="text-xs text-white/50">Conversations worth your time.</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-[#E53945] px-4 py-2 text-xs font-bold text-white">
                      <Headphones size={14} /> Explore podcasts
                    </span>
                  </div>
                </Link>
              </article>
            )}
            <article
              data-post-id={video.id}
              ref={(el) => { if (el) postRefs.current.set(video.id, el); else postRefs.current.delete(video.id); }}
              className="pb-3"
            >
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
                isActive={activeId === video.id}
                onOpen={() => onVideoSelect(video)}
                onLike={() => setLikedLocal(prev => prev.includes(video.id) ? prev : [...prev, video.id])}
              />

              <div className="flex items-center gap-4 px-3 pt-2.5">
                <LikeButton videoId={video.id} size={24} showCount={false} />
                <button onClick={() => { haptic(); setSheetVideo(video.id); }} aria-label="Comments" className="text-white active:opacity-60"><MessageCircle size={24} strokeWidth={1.7} /></button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: video.creatorId || video.uploaderUserId, videoId: video.id } }))}
                  aria-label="Tip creator"
                  className="active:opacity-60"
                >
                  <GoldCoin size={23} />
                </button>
                <button onClick={() => { if (navigator.share) navigator.share({ title: video.title, url: window.location.href }).catch(() => {}); }} aria-label="Share" className="text-white active:opacity-60"><Send size={23} strokeWidth={1.7} /></button>
                <button
                  onClick={() => { haptic(); openShortsPlayer(video.id); }}
                  aria-label="Open shorts player"
                  className="ml-auto text-white active:opacity-60"
                >
                  <Maximize2 size={23} strokeWidth={1.7} />
                </button>
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
            </React.Fragment>
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
