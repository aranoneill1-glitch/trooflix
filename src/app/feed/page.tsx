"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Heart, Eye, MessageCircle, Play, Pause } from "lucide-react";
import LikeButton from "@/components/LikeButton";
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
  const [mutedVideos, setMutedVideos] = useState<Record<number, boolean>>({});
  const [commentSheetVideoId, setCommentSheetVideoId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      fetch("/api/creators", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
    ]).then(([vData, cData]) => {
      const all = Array.isArray(vData) ? vData : [];
      // Only show videos uploaded as Shorts, sorted newest first
      const shortsOnly = all.filter((v: any) => v.type?.toLowerCase() === "short");
      const sortedShorts = shortsOnly.sort((a: any, b: any) => b.id - a.id);
      
      setVideos(sortedShorts);
      setCreators(Array.isArray(cData) ? cData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleMute = (id: number, currentMuted: boolean) => {
    setMutedVideos(prev => ({ ...prev, [id]: !currentMuted }));
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
            isMuted={mutedVideos[video.id] ?? true}
            onToggleMute={() => toggleMute(video.id, mutedVideos[video.id] ?? true)}
            onOpenComments={() => setCommentSheetVideoId(video.id)}
          />
        );
      })}

      {videos.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-white/50">
          <Play size={48} className="mb-4 opacity-50" />
          <p>No shorts available yet.</p>
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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const wasPlayingRef = useRef(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";
  const hasLongDescription = (video.description || "").length > 65;

  const creatorName = creator?.name || "Creator";
  const creatorPhoto = creator?.photoUrl || "";
  const creatorSlug = creator?.slug || "";
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
          setIsExpanded(false);
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
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

  const handleSeek = (e: React.PointerEvent) => {
    if (!videoRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setProgress(percentage);
    if (videoRef.current.duration) {
      videoRef.current.currentTime = (percentage / 100) * videoRef.current.duration;
    }
  };

  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    if (videoRef.current) {
      wasPlayingRef.current = !videoRef.current.paused;
      videoRef.current.pause();
    }
    handleSeek(e);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleSeek(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (videoRef.current && wasPlayingRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      
      <video
        ref={videoRef}
        src={videoSrc}
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
        onError={() => setHasError(true)}
        className="w-full h-full object-cover cursor-pointer"
        onClick={handleScreenClick}
      />

      {/* ERROR OVERLAY (z-10 so it sits UNDER the buttons) */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 px-6 text-center pointer-events-none">
          <p className="text-white font-bold mb-2">Video Unavailable</p>
          <p className="text-white/50 text-sm">Please upload an .mp4 file.</p>
        </div>
      )}

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

      {/* RIGHT SIDE ACTION BUTTONS */}
      <div className="absolute right-3 bottom-[110px] flex flex-col items-center gap-6 z-30">
        
        <div className="flex flex-col items-center gap-1 text-white">
          <Eye size={22} />
          <span className="text-[11px] font-bold">{(video as any).views || 0}</span>
        </div>

        <button onClick={onToggleMute} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>

        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition">
          <LikeButton videoId={video.id} size={26} />
        </div>

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

      {/* PROGRESS BAR (DRAGGABLE) */}
      <div className="absolute left-4 right-[80px] bottom-[80px] z-30 flex items-center gap-3 pointer-events-none">
        <div 
          ref={progressBarRef}
          className="relative flex-1 h-[6px] bg-white/30 rounded-full cursor-pointer touch-none py-2 -my-2 pointer-events-auto"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[6px] bg-white rounded-full pointer-events-none" style={{ width: `${progress}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none" style={{ left: `calc(${progress}% - 7px)` }} />
        </div>
        <span className="text-white/90 text-[12px] font-semibold tabular-nums tracking-wide pointer-events-none">
          {formatTime((progress / 100) * (videoRef.current?.duration || 0))}
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
