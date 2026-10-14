"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Maximize2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import ViewCount from "@/components/ViewCount";
import FollowButton from "@/components/FollowButton";
import CommentDrawer from "@/components/CommentDrawer";
import FeedFullscreenPlayer from "@/components/FeedFullscreenPlayer";
import { MessageCircle } from "lucide-react";

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
};

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
  onOpenFullscreen: () => void;
  muted: boolean;
  onToggleMute: () => void;
  isFullscreenOpen: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // IntersectionObserver — play when >50% visible, pause otherwise
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setShouldPlay(entry.intersectionRatio >= 0.5);
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
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    } else {
      v.pause();
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
    <article className="bg-[#0d0d10] md:bg-transparent border border-white/5 md:border-0 md:border-b md:border-white/10 rounded-xl md:rounded-none overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-3 p-3 md:px-2 md:py-3">
        {creator?.photoUrl ? (
          <img
            src={creator.photoUrl}
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
              className="font-semibold text-[15px] hover:underline block truncate"
            >
              {name}
            </Link>
          ) : (
            <span className="font-semibold text-[15px] block truncate">{name}</span>
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
        className="relative w-full aspect-video bg-black md:rounded-xl overflow-hidden group cursor-pointer"
        onClick={() => setUserPaused((p) => !p)}
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
          src={video.bitchuteUrl}
          poster={video.backdropUrl || video.posterUrl}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
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

        {/* Fullscreen button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullscreen();
          }}
          className="absolute top-3 right-14 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center hover:bg-black/70 transition"
          aria-label="Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Title + description */}
      <div className="px-3 md:px-2 py-3">
        <h2 className="font-semibold text-[15px] leading-snug mb-1">
          {video.title}
        </h2>
        {video.description && (
          <p className="text-sm text-white/60 leading-snug line-clamp-3">
            {video.description}
          </p>
        )}
      </div>

      {/* Action rail: Like · Comment · Save · Views */}
      <div className="flex items-center gap-6 px-3 md:px-2 pb-3 md:pb-4 pt-1">
        <LikeButton videoId={video.id} size={18} showCount />
        <CommentCount videoId={video.id} onClick={onOpenComments} />
        <SaveButton videoId={video.id} variant="icon" />
        <ViewCount videoId={video.id} showIcon />
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

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-3 md:px-0">
        <h1 className="text-2xl md:text-3xl font-black mb-4 px-2">Feed</h1>

        {loading && <p className="text-white/50 text-center py-12">Loading…</p>}
        {!loading && videos.length === 0 && (
          <p className="text-white/50 text-center py-12">Nothing here yet.</p>
        )}

        <div className="space-y-3 md:space-y-5">
          {videos.map((video) => (
            <FeedCard
              key={video.id}
              video={video}
              creator={creatorById(video.creatorId)}
              onOpenComments={() => setCommentVideo(video)}
              onOpenFullscreen={() => setPlaying(video)}
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
          video={playing}
          creator={creatorById(playing.creatorId)}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
  );
}
