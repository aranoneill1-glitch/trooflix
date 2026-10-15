"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  MessageCircle,
  Send,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import CommentDrawer from "@/components/CommentDrawer";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
};

type Props = {
  videos: Video[];
  index: number;
  creators: Creator[];
  onClose: (endTime?: number) => void;
  onIndexChange: (i: number) => void;
  startTime?: number;
};

// ---------------------------------------------------------------------------
// Comment count cache
// ---------------------------------------------------------------------------

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
      className="flex flex-col items-center justify-center gap-1.5 text-white"
      style={{ minHeight: 46 }}
      aria-label="Comments"
    >
      <MessageCircle size={26} />
      <span className="text-[11px] font-semibold tabular-nums text-white/90 leading-none h-3">
        {count !== null && count > 0 ? count.toLocaleString() : "\u00A0"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// VideoCard — one reel. Video element size is FIXED; the parent animates.
// ---------------------------------------------------------------------------

type VideoCardProps = {
  video: Video;
  creator: Creator | null;
  isActive: boolean;
  isNext: boolean;      // next neighbor — silent preload
  compact: boolean;     // comments open → smaller chrome
  muted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  onOpenComments: () => void;
  registerTap: (fn: () => void) => void;
  initialSeek: number;
  cardIndex: number;
};

function VideoCard({
  video,
  creator,
  isActive,
  isNext,
  compact,
  muted,
  onToggleMute,
  onClose,
  onOpenComments,
  registerTap,
  initialSeek,
  cardIndex,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekAppliedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Play / pause on active change ----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      if (!seekAppliedRef.current && initialSeek > 0) {
        try { v.currentTime = initialSeek; } catch {}
      }
      seekAppliedRef.current = true;
      v.muted = muted;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
      setPaused(false);
    } else {
      v.pause();
      setPaused(false);
      setShowControls(false);
    }
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Neighbor preload (muted) so first frame is decoded before we arrive ----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) return;      // handled above
    if (!isNext) {
      try { v.pause(); } catch {}
      return;
    }
    v.muted = true;
    v.play().catch(() => {});
  }, [isNext, isActive]);

  // ---- Mute sync (does NOT retrigger play/pause) ----
  useEffect(() => {
    const v = videoRef.current;
    if (v && isActive) v.muted = muted;
  }, [muted, isActive]);

  // ---- Controls auto-hide timer cleanup ----
  useEffect(() => () => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
  }, []);

  // ---- Register tap handler with parent (only when active) ----
  useEffect(() => {
    if (!isActive) return;
    registerTap(() => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play().catch(() => {});
        setPaused(false);
        flashControls(400);
      } else {
        v.pause();
        setPaused(true);
        flashControls(2000);
      }
    });
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const flashControls = (ms: number) => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), ms);
  };

  const name = creator?.name || "TROOFLIX";
  const handle = creator?.slug ? `@${creator.slug.replace(/-/g, "")}` : "@trooflix";

  const share = () => {
    const url = `${window.location.origin}/podcaster/${creator?.slug || ""}/${video.id}`;
    if (navigator.share) navigator.share({ title: video.title, url }).catch(() => {});
    else navigator.clipboard.writeText(url);
  };

  return (
    <div
      data-feed-card
      className="relative w-screen flex-shrink-0 overflow-hidden bg-black snap-start snap-always flex items-center justify-center"
      style={{
        height: compact ? "35dvh" : "100dvh",
        scrollSnapAlign: "start",
      }}
    >
      {/*
        Video element: fixed 100% × 100% of its parent.
        The parent above changes size. The video uses object-contain,
        so the visible frame is centered and letterboxed. NO React re-render
        of the video element itself during the shrink — no flash.
      */}
      <video
        ref={videoRef}
        src={video.bitchuteUrl}
        className="w-full h-full object-contain"
        style={{
          borderRadius: compact ? "12px" : 0,
        }}
        playsInline
        muted={muted}
        loop
        preload="auto"
        data-fullscreen-video={cardIndex}
      />

      {/* Top bar — only when NOT compact */}
      {isActive && !compact && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
      )}

      {/* Center controls (play / mute) — fade in on tap */}
      <AnimatePresence>
        {isActive && !compact && showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none z-10"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute();
                flashControls(2000);
              }}
              className="pointer-events-auto w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) {
                  v.play().catch(() => {});
                  setPaused(false);
                  flashControls(400);
                } else {
                  v.pause();
                  setPaused(true);
                  flashControls(2000);
                }
              }}
              className="pointer-events-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? (
                <Play size={30} fill="white" className="text-white ml-1" />
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart burst */}
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

      {/* Right rail */}
      {isActive && !compact && (
        <div className="absolute right-3 bottom-56 z-20 flex flex-col items-center gap-5">
          <div data-like-button>
            <LikeButton videoId={video.id} size={26} stacked />
          </div>
          <CommentCountStacked videoId={video.id} onClick={onOpenComments} />
          <button
            onClick={share}
            className="flex flex-col items-center text-white"
            aria-label="Share"
          >
            <Send size={26} />
          </button>
          <SaveButton videoId={video.id} variant="icon" />
        </div>
      )}

      {/* Bottom overlay (creator, title, description) */}
      {isActive && !compact && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 mb-3 pointer-events-auto">
            <Link href={creator ? `/podcaster/${creator.slug}` : "#"} className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden">
                {creator?.photoUrl ? (
                  <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm">{name[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{name}</p>
              <p className="text-xs text-white/60 truncate">{handle}</p>
            </div>
            {creator && (
              <div className="flex-shrink-0">
                <FollowButton creatorId={creator.id} size={14} />
              </div>
            )}
          </div>

          {video.title && (
            <p className="text-sm text-white/90 mb-1 line-clamp-2">{video.title}</p>
          )}
          {video.description && (
            <p className="text-xs text-white/60 line-clamp-2">{video.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeedFullscreenPlayer — outer shell
// ---------------------------------------------------------------------------

export default function FeedFullscreenPlayer({
  videos,
  index,
  creators,
  onClose,
  onIndexChange,
  startTime = 0,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(index);

  const tapRef = useRef<(() => void) | null>(null);
  const lastTapRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const scrollLockRef = useRef(false);

  // ---- Initial scroll to index ----
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-feed-card]");
    const cardH = card?.clientHeight || el.clientHeight || 1;
    el.style.scrollBehavior = "auto";
    el.scrollTop = index * cardH;
    setActiveIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Scroll tracker (paused during comment transition) ----
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      if (commentOpen || scrollLockRef.current) return;
      const card = el.querySelector<HTMLElement>("[data-feed-card]");
      const h = card?.clientHeight || el.clientHeight || 1;
      const i = Math.round(el.scrollTop / h);
      if (i !== activeIndex && i >= 0 && i < videos.length) {
        setActiveIndex(i);
        onIndexChange(i);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeIndex, videos.length, onIndexChange, commentOpen]);

  // ---- Keyboard controls ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !commentOpen) {
        closeWithTime();
        return;
      }
      const el = scrollerRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>("[data-feed-card]");
      const h = card?.clientHeight || el.clientHeight || 1;
      if (e.key === "ArrowDown") {
        el.scrollTo({ top: (activeIndex + 1) * h, behavior: "smooth" });
      }
      if (e.key === "ArrowUp") {
        el.scrollTo({ top: Math.max(0, (activeIndex - 1) * h), behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentOpen, activeIndex]);

  // ---- Body scroll lock ----
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ---- Live index (from actual scroll position) ----
  const liveIndex = () => {
    const el = scrollerRef.current;
    if (!el) return activeIndex;
    const card = el.querySelector<HTMLElement>("[data-feed-card]");
    const h = card?.clientHeight || el.clientHeight || 1;
    return Math.max(0, Math.min(Math.round(el.scrollTop / h), videos.length - 1));
  };

  // ---- Open comments: freeze scroll, then shrink ----
  const openComments = () => {
    const el = scrollerRef.current;
    if (el) {
      const idx = liveIndex();
      const card = el.querySelector<HTMLElement>("[data-feed-card]");
      const h = card?.clientHeight || el.clientHeight || 1;
      scrollLockRef.current = true;
      el.style.scrollBehavior = "auto";
      el.scrollTop = idx * h;
      if (idx !== activeIndex) {
        setActiveIndex(idx);
        onIndexChange(idx);
      }
    }
    setCommentOpen(true);
  };

  // ---- Re-snap after shrink transition ----
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      const card = el.querySelector<HTMLElement>("[data-feed-card]");
      const h = card?.clientHeight || el.clientHeight || 1;
      el.style.scrollBehavior = "auto";
      el.scrollTop = activeIndex * h;
      scrollLockRef.current = false;
    }, 20); // instant — just enough for layout to settle
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentOpen]);

  // ---- Close with time ----
  const closeWithTime = () => {
    const el = scrollerRef.current;
    const idx = liveIndex();
    const v = el?.querySelector<HTMLVideoElement>(
      `video[data-fullscreen-video="${idx}"]`
    );
    onClose(v?.currentTime || 0);
  };

  // ---- Tap / double-tap / swipe ----
  const onTouchEnd = (e: React.TouchEvent) => {
    if (commentOpen) return;

    // Horizontal → close
    if (touchStartXRef.current !== null) {
      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
      const dy = Math.abs(e.changedTouches[0].clientY - (touchStartYRef.current || 0));
      touchStartXRef.current = null;
      if (dx > 80 && dy < 60) {
        lastTapRef.current = 0;
        touchStartYRef.current = null;
        closeWithTime();
        return;
      }
    }

    // Vertical → ignore (handled by scroll)
    if (touchStartYRef.current !== null) {
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
      touchStartYRef.current = null;
      if (dy > 10) {
        lastTapRef.current = 0;
        return;
      }
    }

    const now = Date.now();
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;

    const delta = now - lastTapRef.current;

    if (delta < 300 && delta > 0) {
      // double-tap → like
      lastTapRef.current = 0;
      const cards = scrollerRef.current?.querySelectorAll<HTMLElement>("[data-feed-card]");
      const visible = cards?.[activeIndex];
      const likeBtn = visible?.querySelector<HTMLButtonElement>("[data-like-button] button");
      if (likeBtn) likeBtn.click();
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) tapRef.current?.();
      }, 300);
    }
  };

  const creatorFor = (id?: number | null) =>
    id ? creators.find((c) => c.id === id) || null : null;

  const current = videos[activeIndex];

  return (
    <>
      {/* Strip — height animates; video elements inside do NOT re-render */}
      <div
        className="fixed left-0 right-0 top-0 z-[250] bg-black"
        style={{
          height: commentOpen ? "35dvh" : "100dvh",
        }}
      >
        <div
          ref={scrollerRef}
          onTouchStart={(e) => {
            touchStartYRef.current = e.touches[0].clientY;
            touchStartXRef.current = e.touches[0].clientX;
          }}
          onTouchEnd={onTouchEnd}
          className={`h-full w-full snap-y snap-mandatory scrollbar-hide ${
            commentOpen ? "overflow-hidden" : "overflow-y-scroll"
          }`}
          style={{
            scrollSnapType: commentOpen ? "none" : "y mandatory",
            pointerEvents: commentOpen ? "none" : "auto",
          }}
        >
          {videos.map((v, i) => (
            <VideoCard
              key={v.id}
              video={v}
              creator={creatorFor(v.creatorId)}
              isActive={i === activeIndex}
              isNext={i === activeIndex + 1}
              compact={commentOpen}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onClose={closeWithTime}
              onOpenComments={openComments}
              registerTap={(fn) => { tapRef.current = fn; }}
              initialSeek={i === index ? startTime : 0}
              cardIndex={i}
            />
          ))}
        </div>
      </div>

      {/* Comment drawer (below the strip) */}
      <CommentDrawer
        videoId={commentOpen && current ? current.id : null}
        title={current?.title}
        topOffset={commentOpen ? "35dvh" : undefined}
        onClose={() => setCommentOpen(false)}
      />
    </>
  );
}
