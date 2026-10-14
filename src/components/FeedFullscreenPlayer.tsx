"use client";

import { useEffect, useRef, useState } from "react";
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
  onClose: () => void;
  onIndexChange: (i: number) => void;
};

function VideoCard({
  video,
  creator,
  isActive,
  onClose,
  onOpenComments,
  muted,
  onToggleMute,
  flashSignalRef,
}: {
  video: Video;
  creator: Creator | null;
  isActive: boolean;
  onClose: () => void;
  onOpenComments: () => void;
  muted: boolean;
  onToggleMute: () => void;
  flashSignalRef: React.MutableRefObject<(() => void) | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const flashControls = (ms: number = 2000) => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), ms);
  };

  const togglePlay = () => {
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
  };

  // Expose togglePlay to parent via shared ref — ONLY when this card is active
  useEffect(() => {
    if (!isActive) return;
    (flashSignalRef as any).current = togglePlay;
    return () => {
      // Don't overwrite other cards' handlers on deactivate — leave for the next active
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.muted = muted;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
      setPaused(false);
    } else {
      v.pause();
      v.currentTime = 0;
      setPaused(false);
      setShowControls(false);
    }
  }, [isActive, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  useEffect(() => {
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  const name = creator?.name || "TROOFLIX";
  const handle = creator?.slug ? `@${creator.slug.replace(/-/g, "")}` : "@trooflix";

  const share = () => {
    const url = `${window.location.origin}/podcaster/${creator?.slug || ""}/${video.id}`;
    if (navigator.share) navigator.share({ title: video.title, url }).catch(() => {});
    else navigator.clipboard.writeText(url);
  };

  return (
    <div
      ref={containerRef}
      data-feed-card
      className="relative w-screen h-screen flex-shrink-0 overflow-hidden bg-black snap-start snap-always"
      style={{ scrollSnapAlign: "start", height: "100dvh" }}
    >
      <video
        ref={videoRef}
        src={video.bitchuteUrl}
        poster={video.backdropUrl || video.posterUrl}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        loop
        preload="auto"
      />

      {isActive && (
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

      <AnimatePresence>
        {isActive && showControls && (
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
                flashControls();
              }}
              className="pointer-events-auto w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
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

      {isActive && (
        <div className="absolute right-3 bottom-56 z-20 flex flex-col items-center gap-6">
          <div data-like-button>
            <LikeButton videoId={video.id} size={28} />
          </div>
          <button
            onClick={onOpenComments}
            className="flex flex-col items-center text-white"
            aria-label="Comments"
          >
            <MessageCircle size={28} />
          </button>
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

      {isActive && (
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

export default function FeedFullscreenPlayer({
  videos,
  index,
  creators,
  onClose,
  onIndexChange,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const tapRef = useRef<(() => void) | null>(null);
  const lastTapRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  // Which video is centered — derived from scroll position, not prop
  const [activeIndex, setActiveIndex] = useState(index);

  // Jump to the passed index on mount (once)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = index * el.clientHeight;
    setActiveIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track which card is centered as user scrolls
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.clientHeight || 1;
      const i = Math.round(el.scrollTop / h);
      if (i !== activeIndex && i >= 0 && i < videos.length) {
        setActiveIndex(i);
        onIndexChange(i);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeIndex, videos.length, onIndexChange]);

  // Escape / arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !commentOpen) onClose();
      const el = scrollerRef.current;
      if (!el) return;
      if (e.key === "ArrowDown") {
        el.scrollTo({ top: (activeIndex + 1) * el.clientHeight, behavior: "smooth" });
      }
      if (e.key === "ArrowUp") {
        el.scrollTo({
          top: Math.max(0, (activeIndex - 1) * el.clientHeight),
          behavior: "smooth",
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, commentOpen, activeIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onTouchEnd = (e: React.TouchEvent) => {
    // If the finger moved significantly, this is a swipe — not a tap
    if (touchStartYRef.current !== null) {
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
      touchStartYRef.current = null;
      if (dy > 10) {
        // Reset tap tracking so a stale timestamp doesn't combine with the next tap
        lastTapRef.current = 0;
        return;
      }
    }

    const now = Date.now();
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;

    const delta = now - lastTapRef.current;

    if (delta < 300 && delta > 0) {
      lastTapRef.current = 0;
      // Find the currently visible card's like button
      const cards = scrollerRef.current?.querySelectorAll<HTMLElement>(
        "[data-feed-card]"
      );
      const visibleCard = cards?.[activeIndex];
      const likeBtn = visibleCard?.querySelector<HTMLButtonElement>(
        "[data-like-button] button"
      );
      if (likeBtn) likeBtn.click();
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          tapRef.current?.();
        }
      }, 300);
    }
  };

  const creatorFor = (id?: number | null) =>
    id ? creators.find((c) => c.id === id) || null : null;

  const current = videos[activeIndex];

  return (
    <>
      <div className="fixed inset-0 z-[250] bg-black">
        <div
          ref={scrollerRef}
          onTouchStart={(e) => {
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={onTouchEnd}
          className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: "y mandatory", height: "100dvh" }}
        >
          {videos.map((v, i) => (
            <VideoCard
              key={v.id}
              video={v}
              creator={creatorFor(v.creatorId)}
              isActive={i === activeIndex}
              onClose={onClose}
              onOpenComments={() => setCommentOpen(true)}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              flashSignalRef={tapRef}
            />
          ))}
        </div>
      </div>

      <CommentDrawer
        videoId={commentOpen && current ? current.id : null}
        title={current?.title}
        onClose={() => setCommentOpen(false)}
      />
    </>
  );
}
