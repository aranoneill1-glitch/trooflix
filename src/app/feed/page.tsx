"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Heart, MessageCircle, Play, Pause } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import CommentSheet from "@/components/CommentSheet";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
};

type Creator = {
  id: number;
  name?: string;
  slug?: string;
  photoUrl?: string;
};

export default function ShortsFeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [commentSheetVideoId, setCommentSheetVideoId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      fetch("/api/creators", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
    ]).then(([vData, cData]) => {
      setVideos(Array.isArray(vData) ? vData : []);
      setCreators(Array.isArray(cData) ? cData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  if (loading) {
    return (
      <main className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {videos.map((video) => {
        const creator = creators.find((c) => c.id === video.creatorId) || null;
        return (
          <VideoShort
            key={video.id}
            video={video}
            creator={creator}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onOpenComments={() => setCommentSheetVideoId(video.id)}
          />
        );
      })}

      {videos.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-white/50">
          <Play size={48} className="mb-4 opacity-50" />
          <p>No clips available yet.</p>
        </div>
      )}

      <CommentSheet
        videoId={commentSheetVideoId}
        open={commentSheetVideoId !== null}
        onClose={() => setCommentSheetVideoId(null)}
      />

      <MobileBottomNav />
    </main>
  );
}

function VideoShort({ video, creator, isMuted, onToggleMute, onOpenComments }: { video: Video, creator: Creator | null, isMuted: boolean, onToggleMute: () => void, onOpenComments: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";
  const hasLongDescription = (video.description || "").length > 65;

  const creatorName = creator?.name || "Creator";
  const creatorPhoto = creator?.photoUrl || "";
  const creatorSlug = creator?.slug || "";
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        } else {
          video.pause();
          setIsPlaying(false);
          setIsExpanded(false);
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const handleScreenClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 800);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleLike = useCallback(() => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  }, []);

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always bg-black flex items-center justify-center overflow-hidden pb-16">

      <video
        ref={videoRef}
        src={videoSrc}
        poster={video.posterUrl}
        loop
        playsInline
        muted={isMuted}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedData={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleScreenClick}
      />

      {/* Play/Pause visual feedback overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
            {isPlaying ? <Pause size={40} className="text-white" fill="currentColor" /> : <Play size={40} className="text-white ml-2" fill="currentColor" />}
          </div>
        </div>
      )}

      {/* Gradients for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* TOP LEFT: CREATOR AVATAR + NAME */}
      <Link
        href={creatorSlug ? `/profile/${creatorSlug}` : `/profile/${video.uploaderUserId || "creator"}`}
        className="absolute top-12 left-4 z-30 flex items-center gap-3 group"
      >
        <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1c1c1e] shrink-0">
          {creatorPhoto ? (
            <img src={creatorPhoto} alt={creatorName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base font-black text-white bg-gradient-to-br from-[#E53945] to-[#8a1e26]">
              {creatorInitial}
            </div>
          )}
        </div>
        <span className="text-white text-sm font-bold drop-shadow-lg group-hover:text-[#E53945] transition">
          {creatorName}
        </span>
      </Link>

      {/* RIGHT SIDE ACTION BUTTONS (no rings) */}
      <div className="absolute right-3 bottom-[110px] flex flex-col items-center gap-6 z-30">

        {/* Mute/Unmute */}
        <button onClick={onToggleMute} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition">
            <Heart size={26} fill={liked ? "#E53945" : "none"} className={liked ? "text-[#E53945]" : "text-white"} />
          </div>
          {likeCount > 0 && (
            <span className="text-white text-[11px] font-bold drop-shadow-md">{likeCount}</span>
          )}
        </button>

        {/* Comment */}
        <button onClick={onOpenComments} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition">
          <MessageCircle size={24} />
        </button>

      </div>

      {/* BOTTOM TEXT INFO */}
      <div className="absolute left-4 right-[80px] bottom-[132px] z-30 flex flex-col items-start pointer-events-none">
        <h2 className="text-white text-[22px] font-bold leading-tight mb-1.5 drop-shadow-lg line-clamp-2">
          {video.title}
        </h2>
        <p className="text-white/90 text-[13px] font-semibold mb-1 drop-shadow-md">
          {video.type || "Clip"} • {video.category || "Trending"}
        </p>

        <div
          className="text-white/80 text-[14px] drop-shadow-md leading-snug cursor-pointer pointer-events-auto"
          onClick={toggleExpand}
        >
          <span className={isExpanded ? "" : "line-clamp-2"}>
            {video.description || "Watch this exclusive clip on Trooflix."}
          </span>
          {!isExpanded && hasLongDescription && (
            <span className="text-white/60 font-bold ml-1.5 hover:text-white">
              ... more
            </span>
          )}
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="absolute left-4 right-[80px] bottom-[114px] z-30 flex items-center gap-3 pointer-events-none">
        <div className="relative flex-1 h-[2px] bg-white/30 rounded-full">
          <div className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md transition-all duration-100 ease-linear"
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        </div>
        <span className="text-white/90 text-[12px] font-semibold tabular-nums tracking-wide">
          {videoRef.current ? formatTime(videoRef.current.currentTime) : "0:00"}
        </span>
      </div>

    </div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
