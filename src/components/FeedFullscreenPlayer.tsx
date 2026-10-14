"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import CommentDrawer from "@/components/CommentDrawer";
import ViewCount from "@/components/ViewCount";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import { createClient } from "@/utils/supabase/client";

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
  video: Video;
  creator: Creator | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

function timeAgoShort(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function FeedFullscreenPlayer({
  video,
  creator,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const [showControls, setShowControls] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastTapRef = useRef(0);
  const touchStartY = useRef<number | null>(null);

  // Autoplay on mount
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.play().catch(() => {});
  }, [video.id, muted]);

  // Escape / arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !commentOpen) onClose();
      if (e.key === "ArrowUp" && onPrev) onPrev();
      if (e.key === "ArrowDown" && onNext) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext, commentOpen]);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Toggle play/pause silently
  const flashControls = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2000);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    flashControls();
  };

  // Double-tap to like
  const onContainerTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now();
    const target = e.target as HTMLElement;
    // Ignore taps on buttons/links/interactive
    if (target.closest("button") || target.closest("a")) return;

    if (now - lastTapRef.current < 300) {
      // Double tap — trigger like
      lastTapRef.current = 0;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const touch = e.changedTouches[0];
        setHeartBurst({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          id: Date.now(),
        });
        setTimeout(() => setHeartBurst(null), 900);
      }
      // Fire a like via the LikeButton's pattern — dispatch click on the like button
      const likeBtn = containerRef.current?.querySelector<HTMLButtonElement>(
        "[data-like-button]"
      );
      if (likeBtn) likeBtn.click();
    } else {
      // Single tap → toggle play (only if not a swipe)
      lastTapRef.current = now;
    }
  };

  // Swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (Math.abs(dy) > 70) {
      // Swipe — ignore tap behavior
      lastTapRef.current = 0;
      if (dy < 0 && onNext) onNext();
      if (dy > 0 && onPrev) onPrev();
    } else {
      // Treat as tap (for double-tap detection)
      onContainerTouchEnd(e);
    }
  };

  const name = creator?.name || "TROOFLIX";
  const handle = creator?.slug ? `@${creator.slug.replace(/-/g, "")}` : "@trooflix";

  return (
    <>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="fixed inset-0 z-[250] bg-black flex items-center justify-center select-none"
      >
        {/* Video */}
        <video
          ref={videoRef}
          src={video.bitchuteUrl}
          poster={video.backdropUrl || video.posterUrl}
          className="w-full h-full object-contain bg-black"
          playsInline
          muted={muted}
          loop
          autoPlay
          preload="auto"
        />

        {/* Top bar — close only */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Reels-style center controls (fade after 2s) */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none z-10"
            >
              {/* Mute button (like Reels) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMuted((m) => !m);
                  flashControls();
                }}
                className="pointer-events-auto w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              {/* Play / pause button */}
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
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heart burst animation */}
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
        <div className="absolute right-3 bottom-56 z-20 flex flex-col items-center gap-6">
          <div data-like-button>
            <LikeButton videoId={video.id} size={28} />
          </div>
          <button
            onClick={() => setCommentOpen(true)}
            className="flex flex-col items-center text-white"
            aria-label="Comments"
          >
            <MessageCircle size={28} />
          </button>
          <button
            className="flex flex-col items-center text-white"
            aria-label="Share"
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({
                    title: video.title,
                    url: `${window.location.origin}/podcaster/${creator?.slug || ""}/${video.id}`,
                  })
                  .catch(() => {});
              } else {
                navigator.clipboard.writeText(
                  `${window.location.origin}/podcaster/${creator?.slug || ""}/${video.id}`
                );
              }
            }}
          >
            <Send size={26} />
          </button>
          <SaveButton videoId={video.id} variant="icon" />
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black via-black/60 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <Link href={creator ? `/podcaster/${creator.slug}` : "#"} className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden">
                {creator?.photoUrl ? (
                  <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm">
                    {name[0]?.toUpperCase() || "?"}
                  </span>
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
            <p className="text-sm text-white/90 mb-2 line-clamp-2">
              {video.title}
            </p>
          )}
          {video.description && (
            <p className="text-xs text-white/60 mb-3 line-clamp-2">
              {video.description}
            </p>
          )}

          <button
            onClick={() => setCommentOpen(true)}
            className="w-full text-left bg-white/10 hover:bg-white/15 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white/60 transition"
          >
            Add comment…
          </button>
        </div>
      </motion.div>

      {/* Comment drawer on top */}
      <CommentDrawer
        videoId={commentOpen ? video.id : null}
        title={video.title}
        onClose={() => setCommentOpen(false)}
      />
    </>
  );
}
