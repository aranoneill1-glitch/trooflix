"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import ViewCount, { trackView } from "@/components/ViewCount";
import CommentDrawer from "@/components/CommentDrawer";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedVideos, getCachedCreators } from "@/lib/cache";

const TROOFLIX_LOGO =
  "https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev/creators/1792093646889-trooflix-logo.jpg";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  creatorId?: number | null;
  createdAt?: string;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  isVerified?: boolean;
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
}

// Comment count cache
let cachedCommentCounts: Record<number, number> | null = null;
let commentCountsInflight: Promise<Record<number, number>> | null = null;
const commentCountListeners = new Set<(counts: Record<number, number>) => void>();

async function fetchCommentCounts(): Promise<Record<number, number>> {
  if (cachedCommentCounts) return cachedCommentCounts;
  if (commentCountsInflight) return commentCountsInflight;
  commentCountsInflight = (async () => {
    try {
      const r = await fetch("/api/comment-counts", { cache: "no-store" });
      const d = await r.json();
      const counts = d.counts && typeof d.counts === "object" ? d.counts : {};
      cachedCommentCounts = counts;
      commentCountListeners.forEach((fn) => fn(counts));
      return counts;
    } catch {
      cachedCommentCounts = {};
      return {};
    } finally {
      commentCountsInflight = null;
    }
  })();
  return commentCountsInflight;
}

function CommentCountStacked({
  videoId,
  onClick,
}: {
  videoId: number;
  onClick: () => void;
}) {
  const [count, setCount] = useState<number | null>(() =>
    cachedCommentCounts ? cachedCommentCounts[videoId] ?? 0 : null
  );

  useEffect(() => {
    let mounted = true;
    const onUpdate = (counts: Record<number, number>) => {
      if (mounted) setCount(counts[videoId] ?? 0);
    };
    commentCountListeners.add(onUpdate);
    fetchCommentCounts().then((counts) => {
      if (mounted) setCount(counts[videoId] ?? 0);
    });
    return () => {
      mounted = false;
      commentCountListeners.delete(onUpdate);
    };
  }, [videoId]);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-white"
      aria-label="Comments"
    >
      <MessageCircle size={30} />
      <span className="text-xs font-semibold tabular-nums text-white leading-none">
        {count !== null && count > 0 ? count.toLocaleString() : ""}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ReelCard — pure presentational, driven by parent's active index
// ---------------------------------------------------------------------------

function ReelCard({
  video,
  creator,
  muted,
  onToggleMute,
  onOpenComments,
  registerTap,
  isActive,
  shouldRenderVideo,
}: {
  video: Video;
  creator: Creator | null;
  muted: boolean;
  onToggleMute: () => void;
  onOpenComments: () => void;
  registerTap: (fn: () => void) => void;
  isActive: boolean;
  shouldRenderVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);

  const name = creator?.name || "TROOFLIX";
  const slug = creator?.slug;
  const handle = slug ? `@${slug.replace(/-/g, "")}` : "@trooflix";

  // Register tap
  useEffect(() => {
    registerTap(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) v.play().catch(() => {});
      else v.pause();
    });
  }, [registerTap]);

  // Source management — load only when in window, clear otherwise, keep element alive
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (shouldRenderVideo) {
      const current = v.src || "";
      if (!current.includes(video.bitchuteUrl)) {
        v.src = video.bitchuteUrl;
        v.preload = "auto";
        v.load();
      }
    } else {
      v.pause();
      try {
        v.removeAttribute("src");
        v.load();
      } catch {}
    }
  }, [shouldRenderVideo, video.bitchuteUrl]);

  // Play/pause — driven purely by isActive + muted
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      v.muted = muted;
      v.volume = muted ? 0 : 1;
      const p = v.play();
      if (p && p.catch) {
        p.catch(() => {
          v.muted = true;
          v.volume = 0;
          v.play().catch(() => {});
        });
      }
    } else {
      v.pause();
      v.muted = true;
      v.volume = 0;
      try { v.currentTime = 0; } catch {}
      setProgress(0);
    }
  }, [isActive, muted, shouldRenderVideo]);

  // Audio guard — if the video starts playing while we don't want sound, mute it
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const guard = () => {
      if (!isActive) {
        v.muted = true;
        v.volume = 0;
      } else {
        v.muted = muted;
        v.volume = muted ? 0 : 1;
      }
    };
    v.addEventListener("play", guard);
    v.addEventListener("playing", guard);
    return () => {
      v.removeEventListener("play", guard);
      v.removeEventListener("playing", guard);
    };
  }, [isActive, muted, shouldRenderVideo]);

  const onTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;

    const now = Date.now();
    const delta = now - lastTapRef.current;

    if (delta < 300 && delta > 0) {
      // Double-tap → like
      lastTapRef.current = 0;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = "changedTouches" in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
      const cy = "changedTouches" in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
      setHeartBurst({ x: cx - rect.left, y: cy - rect.top, id: Date.now() });
      setTimeout(() => setHeartBurst(null), 900);
      const likeBtn = document.querySelector<HTMLButtonElement>(
        `[data-reel-like="${video.id}"] button`
      );
      if (likeBtn) {
        likeBtn.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
      }
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }
      }, 300);
    }
  };

  const share = () => {
    const url = `${window.location.origin}/podcaster/${slug || ""}/${video.id}`;
    if (navigator.share) navigator.share({ title: video.title, url }).catch(() => {});
    else navigator.clipboard.writeText(url);
  };

  const seekFromClientX = (clientX: number) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  };

  return (
    <section
      data-reel-index={video.id}
      className="relative w-full snap-start snap-always flex items-center justify-center overflow-hidden bg-black"
      style={{
        scrollSnapAlign: "start",
        height: "calc(100dvh - 64px - env(safe-area-inset-bottom))",
      }}
    >
      <video
        ref={videoRef}
        data-video-id={video.id}
        src={video.bitchuteUrl}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) {
            setIsLandscape(v.videoWidth / v.videoHeight >= 1);
          }
        }}
        onTimeUpdate={(e) => {
          if (scrubbing) return;
          const v = e.currentTarget;
          if (v.duration && isFinite(v.duration)) {
            setProgress(v.currentTime / v.duration);
          }
        }}
        className={`absolute inset-0 w-full h-full bg-black ${
          isLandscape ? "object-contain" : "object-cover"
        }`}
        onClick={onTap}
      />

      {/* Right rail */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <button
          onClick={onToggleMute}
          className="flex flex-col items-center text-white"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
        </button>
        <div data-reel-like={video.id}>
          <LikeButton videoId={video.id} size={30} stacked />
        </div>
        <CommentCountStacked videoId={video.id} onClick={onOpenComments} />
        <button onClick={share} className="flex flex-col items-center text-white" aria-label="Share">
          <Send size={28} />
        </button>
        <SaveButton videoId={video.id} variant="icon" />
      </div>

      <AnimatePresence>
        {heartBurst && (
          <motion.div
            key={heartBurst.id}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute pointer-events-none z-30"
            style={{ left: heartBurst.x - 40, top: heartBurst.y - 40 }}
          >
            <Heart size={80} fill="white" className="text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <div
        ref={progressBarRef}
        onClick={(e) => { e.stopPropagation(); seekFromClientX(e.clientX); }}
        onTouchStart={(e) => { e.stopPropagation(); setScrubbing(true); seekFromClientX(e.touches[0].clientX); }}
        onTouchMove={(e) => { e.stopPropagation(); if (scrubbing) seekFromClientX(e.touches[0].clientX); }}
        onTouchEnd={(e) => { e.stopPropagation(); setScrubbing(false); }}
        className="absolute left-0 right-0 bottom-0 z-30 h-6 flex items-end cursor-pointer"
        style={{ pointerEvents: "auto" }}
      >
        <div className="w-full h-[3px] bg-white/25 relative">
          <div
            className="h-full bg-white"
            style={{
              width: `${progress * 100}%`,
              transition: scrubbing ? "none" : "width 0.35s linear",
            }}
          />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 mb-3 pointer-events-auto">
          <Link href={slug ? `/podcaster/${slug}` : "/"} className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {creator?.photoUrl ? (
                <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : !creator ? (
                <img src={TROOFLIX_LOGO} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">{name[0]?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm inline-flex items-center gap-1 text-white">
                <span className="truncate max-w-[160px]">{name}</span>
                {creator?.isVerified && <VerifiedBadge size={13} />}
              </p>
              <p className="text-xs text-white/70 truncate">{handle} · {timeAgo(video.createdAt)}</p>
            </div>
          </Link>
        </div>

        <div className="max-w-[80%] pointer-events-auto">
          {video.title && (
            <p className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">{video.title}</p>
          )}
          {video.description && (
            <p className="text-xs text-white/80 leading-snug line-clamp-2">{video.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
            <ViewCount videoId={video.id} showIcon />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feed page
// ---------------------------------------------------------------------------

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  const [muted, setMuted] = useState(true);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const tapHandlerRef = useRef<(() => void) | null>(null);

  // Load videos + creators
  useEffect(() => {
    Promise.all([getCachedVideos(), getCachedCreators()])
      .then(([vids, creats]) => {
        const list: Video[] = Array.isArray(vids) ? vids : [];
        list.sort((a, b) => {
          const aT = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bT = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bT - aT;
        });
        setVideos(list);
        setCreators(Array.isArray(creats) ? creats : []);
        setLoading(false);
        // Show "tap for sound" prompt once per session
        if (list.length > 0) {
          try {
            const dismissed = sessionStorage.getItem("trooflix:sound-prompt");
            if (!dismissed) setShowSoundPrompt(true);
          } catch {
            setShowSoundPrompt(true);
          }
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // Track active index via IntersectionObserver
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || videos.length === 0) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-reel-index]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.6) {
            const id = Number((entry.target as HTMLElement).dataset.reelIndex);
            const idx = videos.findIndex((v) => v.id === id);
            if (idx >= 0) setActiveIndex(idx);
          }
        }
      },
      { root: el, threshold: [0.25, 0.5, 0.75, 1.0] }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [videos.length]);

  // Count views + preload neighbors on active change
  useEffect(() => {
    const active = videos[activeIndex];
    if (active?.id) trackView(active.id);
  }, [activeIndex, videos.length]);

  // Enable sound on first user tap (browser requirement)
  const enableSound = () => {
    setMuted(false);
    setShowSoundPrompt(false);
    try { sessionStorage.setItem("trooflix:sound-prompt", "1"); } catch {}
  };

  const creatorById = (id?: number | null) =>
    id ? creators.find((c) => c.id === id) || null : null;

  return (
    <main
      className="bg-black text-white overflow-hidden relative"
      style={{ height: "100dvh" }}
    >
      {loading && (
        <div className="h-full flex items-center justify-center">
          <p className="text-white/50">Loading…</p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div
          ref={scrollerRef}
          className="w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{
            height: "calc(100dvh - 64px - env(safe-area-inset-bottom))",
            scrollSnapType: "y mandatory",
          }}
        >
          {videos.map((video, i) => (
            <ReelCard
              key={video.id}
              video={video}
              creator={creatorById(video.creatorId)}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onOpenComments={() => setCommentVideo(video)}
              isActive={i === activeIndex}
              shouldRenderVideo={Math.abs(i - activeIndex) <= 1}
              registerTap={(fn) => {
                if (i === activeIndex) tapHandlerRef.current = fn;
              }}
            />
          ))}
        </div>
      )}

      {/* Sound prompt */}
      <AnimatePresence>
        {showSoundPrompt && !loading && videos.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            onClick={enableSound}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex items-center gap-2.5 bg-black/40 backdrop-blur-md border border-white/25 text-white font-semibold text-[15px] px-6 py-3 rounded-full shadow-2xl hover:bg-black/60 hover:border-white/50 active:scale-95 transition"
          >
            <VolumeX size={18} className="opacity-90" />
            <span>Tap for sound</span>
          </motion.button>
        )}
      </AnimatePresence>

      <MobileBottomNav />

      <CommentDrawer
        videoId={commentVideo?.id ?? null}
        title={commentVideo?.title}
        onClose={() => setCommentVideo(null)}
      />
    </main>
  );
}
