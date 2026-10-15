"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import SaveButton from "@/components/SaveButton";
import LikeButton, { externalLike } from "@/components/LikeButton";
import ViewCount from "@/components/ViewCount";
import FollowButton from "@/components/FollowButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import CommentDrawer from "@/components/CommentDrawer";
import FeedFullscreenPlayer from "@/components/FeedFullscreenPlayer";
import { MessageCircle } from "lucide-react";

// ---- Global single-playback lock: only ONE feed video plays at a time ----
let currentPlayer: HTMLVideoElement | null = null;

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  duration: string;
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

const TROOFLIX_LOGO =
  "https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev/creators/1792093646889-trooflix-logo.jpg";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return new Date(iso).toLocaleDateString();
}

function CommentCount({
  videoId,
  onClick,
}: {
  videoId: number;
  onClick?: () => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch(`/api/comments?video_id=${videoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const list = Array.isArray(d) ? d : Array.isArray(d.comments) ? d.comments : [];
        setCount(list.length);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [videoId]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition"
    >
      <MessageCircle size={18} />
      {count !== null && <span className="text-sm">{count}</span>}
    </button>
  );
}

/**
 * Video card with autoplay when mostly visible in viewport.
 */
function FeedCard({
  video,
  creator,
  onOpenComments,
  onOpenFullscreen,
  muted,
  onToggleMute,
  isFullscreenOpen,
}: {
  video: Video;
  creator: Creator | null;
  onOpenComments: () => void;
  onOpenFullscreen: (startTime?: number) => void;
  muted: boolean;
  onToggleMute: () => void;
  isFullscreenOpen: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const lastTapRef = useRef(0);
  const [videoAspect, setVideoAspect] = useState<string>("16 / 9"); // default until loaded

  const handleVideoTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Ignore taps that landed on interactive elements (like button, mute, follow)
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("[data-feed-like]")
    ) {
      return;
    }

    const now = Date.now();
    const delta = now - lastTapRef.current;

    if (delta < 300 && delta > 0) {
      // Double-tap → like
      lastTapRef.current = 0;
      const rect = containerRef.current?.getBoundingClientRect();
      const clientX =
        "changedTouches" in e
          ? e.changedTouches[0].clientX
          : (e as React.MouseEvent).clientX;
      const clientY =
        "changedTouches" in e
          ? e.changedTouches[0].clientY
          : (e as React.MouseEvent).clientY;
      if (rect) {
        setHeartBurst({
          x: clientX - rect.left,
          y: clientY - rect.top,
          id: Date.now(),
        });
        setTimeout(() => setHeartBurst(null), 900);
      }
      // Fire the like via the shared bus (no DOM querying, no synthetic click)
      externalLike(video.id);
    } else {
      // Single tap → fullscreen (deferred so double-tap wins)
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          const t = videoRef.current?.currentTime || 0;
          onOpenFullscreen(t);
        }
      }, 300);
    }
  };

  // IntersectionObserver — play when >50% visible, pause otherwise
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setShouldPlay(entry.intersectionRatio >= 0.85);
        }
      },
      { threshold: [0, 0.5, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play/pause based on visibility
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Pause inline video if fullscreen player is open, or user manually paused
    if (shouldPlay && !userPaused && !isFullscreenOpen) {
      // Enforce single-playback — pause any other feed video first
      if (currentPlayer && currentPlayer !== v) {
        try {
          currentPlayer.pause();
        } catch {}
      }
      currentPlayer = v;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    } else {
      v.pause();
      if (currentPlayer === v) currentPlayer = null;
    }
  }, [shouldPlay, userPaused, isFullscreenOpen]);

  // Sync muted prop
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  const name = creator?.name || "TROOFLIX";
  const slug = creator?.slug;
  const handle = slug ? `@${slug.replace(/-/g, "")}` : "@trooflix";

  return (
    <article className="border-b border-white/5 pb-2 mb-2 md:pb-4 md:mb-4">
      {/* Author row */}
      <div className="flex items-center gap-3 px-3 md:px-0 py-2.5">
        {creator?.photoUrl ? (
          <img
            src={creator.photoUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : !creator ? (
          <img
            src={TROOFLIX_LOGO}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold flex-shrink-0">
            {name[0]?.toUpperCase() || "T"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {slug ? (
            <Link
              href={`/podcaster/${slug}`}
              className="font-semibold text-[15px] hover:underline inline-flex items-center gap-1.5 max-w-full"
            >
              <span className="truncate">{name}</span>
              {creator?.isVerified && <VerifiedBadge size={14} />}
            </Link>
          ) : (
            <span className="font-semibold text-[15px] inline-flex items-center gap-1.5 max-w-full">
              <span className="truncate">{name}</span>
              {creator?.isVerified && <VerifiedBadge size={14} />}
            </span>
          )}
          <p className="text-xs text-white/50 truncate">
            {handle} · {timeAgo(video.createdAt)}
          </p>
        </div>
        {creator && <FollowButton creatorId={creator.id} />}
      </div>

      {/* Video — inline autoplay, no play button */}
      <div
        ref={containerRef}
        className="relative w-full bg-black md:rounded-xl overflow-hidden group cursor-pointer"
        style={{ aspectRatio: videoAspect, maxHeight: "80vh" }}
        onClick={handleVideoTap}
      >
        {/* Play overlay when paused */}
        {userPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
              <div className="w-0 h-0 border-l-[18px] border-l-white border-y-[12px] border-y-transparent ml-1" />
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          data-video-id={video.id}
          src={video.bitchuteUrl}
          poster={video.backdropUrl || video.posterUrl}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) {
              setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
            }
          }}
          className="w-full h-full object-cover"
        />

        {/* Heart burst on double-tap */}
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
        {/* Mute toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>


      </div>

      {/* Action rail: Like · Comment · Save · Views */}
      <div className="flex items-center gap-6 px-3 md:px-0 pt-3 pb-2">
        <span data-feed-like><LikeButton videoId={video.id} size={18} showCount /></span>
        <CommentCount videoId={video.id} onClick={onOpenComments} />
        <SaveButton videoId={video.id} variant="icon" />
        <ViewCount videoId={video.id} showIcon />
      </div>

      {/* Caption — IG-style: @handle + title + description */}
      <div className="px-3 md:px-0 pb-2">
        {video.title && (
          <p className="text-sm leading-snug">
            <span className="font-semibold text-white/95">
              {slug ? `@${slug.replace(/-/g, "")}` : "@trooflix"}
            </span>{" "}
            <span className="text-white/90">{video.title}</span>
          </p>
        )}
        {video.description && (
          <p className="text-sm text-white/60 leading-snug line-clamp-3 mt-1">
            {video.description}
          </p>
        )}
      </div>
    </article>
  );
}

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [startTime, setStartTime] = useState(0);

  const playingIndex = playing
    ? videos.findIndex((v) => v.id === playing.id)
    : -1;
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos").then((r) => r.json()),
      fetch("/api/creators").then((r) => r.json()),
    ])
      .then(([vids, creats]) => {
        const list: Video[] = Array.isArray(vids) ? vids : [];
        list.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bTime - aTime;
        });
        setVideos(list);
        setCreators(Array.isArray(creats) ? creats : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const creatorById = (id?: number | null) =>
    id ? creators.find((c) => c.id === id) || null : null;

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto md:px-0">
        <h1 className="text-2xl md:text-3xl font-black mb-4 px-3 md:px-2">Feed</h1>

        {loading && <p className="text-white/50 text-center py-12">Loading…</p>}
        {!loading && videos.length === 0 && (
          <p className="text-white/50 text-center py-12">Nothing here yet.</p>
        )}

        <div>
          {videos.map((video) => (
            <FeedCard
              key={video.id}
              video={video}
              creator={creatorById(video.creatorId)}
              onOpenComments={() => setCommentVideo(video)}
              onOpenFullscreen={(startTime) => {
                if (typeof startTime === "number") setStartTime(startTime);
                else setStartTime(0);
                setPlaying(video);
              }}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              isFullscreenOpen={playing?.id === video.id}
            />
          ))}
        </div>
      </div>

      <MobileBottomNav />

      <CommentDrawer
        videoId={commentVideo?.id ?? null}
        title={commentVideo?.title}
        onClose={() => setCommentVideo(null)}
      />

      {playing && (
        <FeedFullscreenPlayer
          videos={videos}
          index={playingIndex < 0 ? 0 : playingIndex}
          creators={creators}
          startTime={startTime}
          onClose={(endTime) => {
            // Carry back the time into the feed card so inline playback resumes
            if (typeof endTime === "number" && playing) {
              const v = document.querySelector<HTMLVideoElement>(
                `video[data-video-id="${playing.id}"]`
              );
              if (v) {
                try { v.currentTime = endTime; } catch {}
              }
            }
            setPlaying(null);
            setStartTime(0);
          }}
          onIndexChange={(i) => {
            setStartTime(0);
            setPlaying(videos[i]);
          }}
        />
      )}
    </main>
  );
}
