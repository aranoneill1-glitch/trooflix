"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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

// Global preference: once the user unmutes, every video in the feed stays unmuted.
let feedMuted = true;
const feedMuteListeners = new Set<(muted: boolean) => void>();
function setFeedMuted(muted: boolean) {
  feedMuted = muted;
  try { localStorage.setItem("trooflix:feedMuted", muted ? "1" : "0"); } catch {}
  feedMuteListeners.forEach(fn => fn(muted));
}
if (typeof window !== "undefined") {
  try { feedMuted = localStorage.getItem("trooflix:feedMuted") !== "0"; } catch {}
}

function PostMedia({ video, onOpen, onLike, isActive }: { video: any; onOpen: () => void; onLike: () => void; isActive: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [muted, setMuted] = useState(feedMuted);
  const lastTap = useRef(0);

  useEffect(() => {
    const fn = (m: boolean) => setMuted(m);
    feedMuteListeners.add(fn);
    return () => { feedMuteListeners.delete(fn); };
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = muted;
    if (isActive) {
      if (userPaused) { v.pause(); return; }
      // Browsers block autoplay with sound; if unmuted playback is rejected,
      // fall back to muted just for this clip until the next user gesture.
      v.play().then(() => setPlaying(true)).catch(() => {
        if (!v.muted) { v.muted = true; setMuted(true); }
        v.play().then(() => setPlaying(true)).catch(() => {});
      });
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
      setPlaying(false);
    }
  }, [isActive, muted, userPaused]);

  const handleTap = () => {
    const v = ref.current;
    if (!v) { onOpen(); return; }
    const now = Date.now();
    if (now - lastTap.current < 300) { onLike(); lastTap.current = 0; return; }
    lastTap.current = now;
    // First tap on an active, muted clip turns sound on globally (user gesture).
    if (isActive && v.muted) {
      setFeedMuted(false);
      if (v.paused) v.play().catch(() => {});
      return;
    }
    if (v.paused) {
      setUserPaused(false);
      v.play().catch(() => {});
    } else {
      setUserPaused(true);
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    setFeedMuted(!feedMuted);
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
      {userPaused && (
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

  const heroContent = useMemo(() => {
    const usable = (videos || []).filter((v: any) => v?.posterUrl || v?.backdropUrl || v?.title);
    const long = usable.find((v: any) => !["short", "reel"].includes(String(v?.type || "").toLowerCase())) || usable[0] || null;
    const short = usable.find((v: any) => ["short", "reel"].includes(String(v?.type || "").toLowerCase())) || usable[1] || usable[0] || null;
    const picks = usable.slice(0, 6);
    const creator = long ? (creators || []).find((c: any) => String(c?.id) === String(long?.creatorId) || String(c?.user_id) === String(long?.uploaderUserId) || String(c?.ownerUserId) === String(long?.uploaderUserId)) : (creators || [])[0];
    return { long, short, picks, creator };
  }, [videos, creators]);

  return (
    <div className="pb-24">
      {showWelcome && (
        <section className="relative overflow-hidden bg-[#040406] px-5 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-8 border-b border-white/[0.06]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(229,57,69,0.18),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(255,106,42,0.12),transparent_26%),radial-gradient(circle_at_50%_85%,rgba(229,57,69,0.10),transparent_32%)]" />
          <div className="relative z-10 mx-auto w-full max-w-md">
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center text-[36px] leading-[0.95] font-black tracking-[-0.05em] text-white mb-4">
              Watch everywhere
            </motion.h1>

            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }} className="relative h-[150px] mb-5">
              {/* TV */}
              <div className="absolute left-1/2 top-0 w-[52%] -translate-x-1/2">
                <div className="rounded-[10px] border border-[#2b2f36] bg-gradient-to-b from-[#1a1d22] to-[#0b0d10] p-[5px] shadow-[0_18px_45px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-[6px] bg-black ring-1 ring-white/10">
                    {heroContent.long?.backdropUrl || heroContent.long?.posterUrl ? (
                      <img src={heroContent.long.backdropUrl || heroContent.long.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover brightness-[0.72] saturate-[1.05]" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#2a1012,transparent_35%),linear-gradient(180deg,#151922_0%,#07080b_100%)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-black/10" />
                    <div className="absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between px-2">
                      <div className="text-[6px] font-black tracking-tight"><span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span></div>
                      <div className="flex items-center gap-1 text-[4px] text-white/70"><span>Home</span><span>Live</span><span>Shorts</span></div>
                    </div>
                    <div className="absolute left-2 top-6 right-[45%]">
                      <div className="inline-flex items-center rounded-full bg-[#E53945]/90 px-1.5 py-[1px] text-[4px] font-bold uppercase tracking-[0.12em] text-white mb-1">Featured</div>
                      <div className="text-[7px] font-black leading-tight text-white line-clamp-2">{heroContent.long?.title || "Cinematic Documentary"}</div>
                      <div className="mt-1 flex gap-1">
                        <div className="rounded-[3px] bg-white px-1.5 py-[2px] text-[4px] font-bold text-black">Play</div>
                        <div className="rounded-[3px] border border-white/30 bg-black/30 px-1.5 py-[2px] text-[4px] font-semibold text-white">Info</div>
                      </div>
                    </div>
                    <div className="absolute right-1.5 bottom-1.5 left-[38%] flex gap-1">
                      {(heroContent.picks.slice(1, 4).length ? heroContent.picks.slice(1, 4) : [null, null, null]).map((v: any, i: number) => (
                        <div key={i} className="relative flex-1 aspect-[16/10] overflow-hidden rounded-[3px] border border-white/15 bg-white/5">
                          {(v?.posterUrl || v?.backdropUrl) ? <img src={v.posterUrl || v.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-2 bottom-1 h-[2px] rounded-full bg-white/15 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{width:["30%","70%","30%"]}} transition={{duration:8, repeat:Infinity, ease:"easeInOut"}} /></div>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_22%,rgba(255,255,255,0)_100%)]" />
                  </div>
                </div>
                <div className="mx-auto mt-[3px] h-[7px] w-[18%] rounded-b-[6px] bg-gradient-to-b from-[#2a2e35] to-[#111318] shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
                <div className="mx-auto h-[3px] w-[34%] rounded-full bg-[#1a1d22]" />
              </div>

              {/* Laptop */}
              <div className="absolute left-[6%] bottom-[2px] w-[24%]">
                <div className="rounded-t-[8px] border border-[#3a3f47] border-b-0 bg-gradient-to-b from-[#c9ced6] to-[#9aa3af] p-[3px] shadow-[0_14px_30px_rgba(0,0,0,0.55)]">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[5px] bg-[#0b0d11] ring-1 ring-black/40">
                    <div className="absolute inset-x-0 top-0 h-3 bg-[#11141a] border-b border-white/10 flex items-center px-1 gap-1">
                      <span className="h-[3px] w-[3px] rounded-full bg-[#ff5f57]" /><span className="h-[3px] w-[3px] rounded-full bg-[#febc2e]" /><span className="h-[3px] w-[3px] rounded-full bg-[#28c840]" />
                      <div className="ml-auto h-[5px] w-8 rounded-full bg-white/10" />
                    </div>
                    <div className="absolute inset-x-0 top-3 bottom-0 p-1 bg-[#07090d]">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[4px] font-black"><span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span></div>
                        <div className="flex gap-1 text-[3px] text-white/50"><span>Home</span><span>Creators</span></div>
                      </div>
                      <div className="grid grid-cols-3 gap-[3px]">
                        {(heroContent.picks.slice(0, 3).length ? heroContent.picks.slice(0, 3) : [null, null, null]).map((v: any, i: number) => (
                          <div key={i} className="relative aspect-[16/10] overflow-hidden rounded-[2px] bg-white/5 border border-white/10">
                            {(v?.posterUrl || v?.backdropUrl) ? <img src={v.posterUrl || v.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                            <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-black/80 to-transparent" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 space-y-[2px]">
                        {[heroContent.picks[3], heroContent.picks[4]].map((v: any, i: number) => (
                          <div key={i} className="flex items-center gap-1">
                            <div className="h-[7px] w-[12px] rounded-[2px] bg-white/10 overflow-hidden relative">{(v?.posterUrl || v?.backdropUrl) ? <img src={v.posterUrl || v.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                            <div className="flex-1 h-[3px] rounded-full bg-white/15 overflow-hidden"><div className="h-full w-2/3 bg-white/30 rounded-full" /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0)_28%)]" />
                  </div>
                </div>
                <div className="h-[5px] rounded-b-[6px] bg-gradient-to-b from-[#d7dce4] to-[#8e97a3] border-x border-b border-[#7f8894]" />
              </div>

              {/* Phone */}
              <div className="absolute right-[8%] bottom-0 w-[13%]">
                <div className="rounded-[14px] border border-[#4a4f58] bg-gradient-to-b from-[#2a2e35] to-[#0f1115] p-[3px] shadow-[0_16px_35px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="relative aspect-[9/19.5] overflow-hidden rounded-[11px] bg-black ring-1 ring-white/10">
                    {(heroContent.short?.posterUrl || heroContent.short?.backdropUrl || heroContent.long?.posterUrl) ? (
                      <img src={heroContent.short?.posterUrl || heroContent.short?.backdropUrl || heroContent.long?.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,#1b1020_0%,#090a0f_100%)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
                    <div className="absolute left-1/2 top-[3px] h-[5px] w-[45%] -translate-x-1/2 rounded-full bg-black border border-white/10" />
                    <div className="absolute right-[5px] top-[22%] flex flex-col items-center gap-[5px]">
                      <div className="h-[8px] w-[8px] rounded-full bg-white/20 border border-white/20" />
                      <div className="h-[7px] w-[7px] rounded-full bg-white/20 border border-white/20" />
                      <div className="h-[7px] w-[7px] rounded-full bg-white/20 border border-white/20" />
                    </div>
                    <div className="absolute left-[5px] right-[12px] bottom-[10px]">
                      <div className="flex items-center gap-1 mb-[2px]">
                        <div className="h-[6px] w-[6px] rounded-full bg-white/30 overflow-hidden relative">{heroContent.creator?.photoUrl ? <img src={heroContent.creator.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}</div>
                        <div className="h-[2px] w-8 rounded-full bg-white/70" />
                      </div>
                      <div className="h-[2px] w-full rounded-full bg-white/40 mb-[2px]" />
                      <div className="h-[2px] w-2/3 rounded-full bg-white/30" />
                    </div>
                    <div className="absolute inset-x-[6px] bottom-[4px] h-[2px] rounded-full bg-white/20 overflow-hidden"><motion.div className="h-full rounded-full bg-[#E53945]" animate={{width:["25%","65%","25%"]}} transition={{duration:7, repeat:Infinity, ease:"easeInOut"}} /></div>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0)_26%)]" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-center text-[34px] leading-[1.02] font-black tracking-[-0.04em] text-white mb-3">
              Say goodbye to censorship and hello to freedom.
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="text-center text-[18px] leading-relaxed text-white/70 font-medium mb-5">
              Watch, create and get paid for what you love.
            </motion.p>

            <div className="flex items-center justify-center gap-2">
              <Link href="/login" className="rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black hover:bg-white/90 transition">Sign in</Link>
              <Link href="/signup" className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition">Sign up</Link>
            </div>
          </div>
        </section>
      )}

      {/* Main-type pills + categories dropdown — below the fixed top bar */}
      <div className={`px-3 pb-3 border-b border-white/[0.06] ${showWelcome ? "pt-3" : "pt-[calc(env(safe-area-inset-top)+68px)]"}`}>
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
