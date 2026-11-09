"use client";
import { getCachedUser } from "@/lib/cache";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Gift, Volume2, VolumeX, Heart, Eye, MessageCircle, Play, Pause } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import CommentSheet from "@/components/CommentSheet";
import Comments from "@/components/Comments";

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
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);

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

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  if (loading) {
    return (
      <main className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full bg-black flex overflow-hidden">
      <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative">
        {videos.map((video) => {
          const creator = creators.find((c) => String(c.id) === String(video.creatorId)) || null;
          return (
            <VideoShort
              key={video.id}
              video={video}
              creator={creator}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onOpenComments={() => setCommentSheetVideoId(video.id)}
              onSetActive={() => setActiveVideoId(video.id)}
            />
          );
        })}

        {videos.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/50">
            <Play size={48} className="mb-4 opacity-50" />
            <p>No shorts available yet.</p>
          </div>
        )}
      </div>

      <div className="hidden lg:flex flex-col w-[400px] xl:w-[450px] h-full bg-[#0f0f12] border-l border-white/10 shadow-2xl z-20">
        <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageCircle size={16} /> Comments
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeVideoId ? (
            <Comments videoId={activeVideoId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/30 text-sm gap-3">
              <MessageCircle size={32} opacity={0.5} />
              <p>Scroll to a short to see comments</p>
            </div>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <CommentSheet
          videoId={commentSheetVideoId}
          open={commentSheetVideoId !== null}
          onClose={() => setCommentSheetVideoId(null)}
        />
        <MobileBottomNav />
      </div>
    </main>
  );
}

function VideoShort({ video, creator, isMuted, onToggleMute, onOpenComments, onSetActive }: { video: Video, creator: Creator | null, isMuted: boolean, onToggleMute: () => void, onOpenComments: () => void, onSetActive: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const wasPlayingRef = useRef(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check if user is following this creator
  useEffect(() => {
    getCachedUser().then((u: any) => {
      if (u) {
        setUser(u);
        (async () => {
          let checkId = Number(creator?.id ?? 0);
          if (!checkId || isNaN(checkId)) {
            const vidCreator = Number((video as any).creatorId);
            if ((video as any).creatorId && !isNaN(vidCreator)) {
              checkId = vidCreator;
            } else if ((video as any).uploaderUserId) {
              try {
                const r = await fetch("/api/creators");
                const list = await r.json();
                const match = (Array.isArray(list) ? list : []).find(
                  (c: any) => String(c.user_id) === String((video as any).uploaderUserId) || String(c.ownerUserId) === String((video as any).uploaderUserId)
                );
                if (match?.id) checkId = Number(match.id);
              } catch {}
            }
          }
          if (checkId && !isNaN(checkId)) {
            fetch(`/api/follows?creator_id=${checkId}&user_id=${u.id}`)
              .then(r => r.json())
              .then(d => setIsFollowing(d.isFollowing || false))
              .catch(() => {});
          }
        })();
      }
    });
  }, [creator?.id]);

  const resolveCreatorId = async (): Promise<number | null> => {
    // 1. If we already have the numeric creator from the creators list, use it
    if (creator?.id) return Number(creator.id);

    // 2. If video.creatorId is a real number, use it
    const vidCreator = Number((video as any).creatorId);
    if (video.creatorId && !isNaN(vidCreator)) return vidCreator;

    // 3. Otherwise, look up the creator by their UUID (uploaderUserId)
    const uploaderUuid = (video as any).uploaderUserId;
    if (!uploaderUuid) return null;

    try {
      const res = await fetch("/api/creators");
      const list = await res.json();
      const match = (Array.isArray(list) ? list : []).find(
        (c: any) => String(c.user_id) === String(uploaderUuid) || String(c.ownerUserId) === String(uploaderUuid)
      );
      if (match?.id) return Number(match.id);
    } catch (err) {
      console.error("Creator lookup failed:", err);
    }
    return null;
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return alert("Please log in to follow creators.");
    if (isSubmittingFollow) return;

    setIsSubmittingFollow(true);
    try {
      const targetId = await resolveCreatorId();
      console.log("DEBUG Shorts Follow: resolved creatorId =", targetId);

      if (!targetId || isNaN(targetId)) {
        alert("This creator doesn't have a followable profile yet.");
        return;
      }

      const newIsFollowing = !isFollowing;
      setIsFollowing(newIsFollowing);

      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, creatorId: targetId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Follow failed");
      }
      console.log("DEBUG Shorts Follow: success, following =", newIsFollowing);
    } catch (err: any) {
      console.error("DEBUG Shorts Follow: error =", err);
      setIsFollowing(!isFollowing); // rollback
      alert("Follow failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmittingFollow(false);
    }
  };

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";
  const hasLongDescription = (video.description || "").length > 65;

  const creatorName = creator?.name || "Creator";
  const creatorPhoto = creator?.photoUrl || "";
  const creatorSlug = creator?.slug || "";
  const creatorInitial = creatorName.charAt(0).toUpperCase();

  // Fallback: If KV doesn't have this creator, fetch from Supabase profiles
  const [fallbackPhoto, setFallbackPhoto] = useState("");
  const [fallbackName, setFallbackName] = useState("");
  const [fallbackSlug, setFallbackSlug] = useState("");

  useEffect(() => {
    if (creatorPhoto) return;
    const userId = (video as any).uploaderUserId || (video as any).creatorId;
    if (!userId) return;
    fetch(`/api/profile?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          if (d.profile.avatar_url) setFallbackPhoto(d.profile.avatar_url);
          if (d.profile.display_name || d.profile.username) setFallbackName(d.profile.display_name || d.profile.username);
          if (d.profile.username) setFallbackSlug(d.profile.username);
        }
      })
      .catch(() => {});
  }, [creatorPhoto, video]);

  const finalPhoto = creatorPhoto || fallbackPhoto;
  const finalName = creator?.name || fallbackName || "Creator";
  const finalSlug = creatorSlug || fallbackSlug;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
                  videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
                  if (onSetActive) onSetActive();
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

  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      if (videoRef.current && !isDragging && !videoRef.current.paused) {
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p || 0);
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isDragging]);

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
    <div className="relative w-full h-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      
      <video
        ref={videoRef}
        src={videoSrc}
        loop
        playsInline
        muted={isMuted}
        preload="auto"
        
        onLoadedData={() => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          // Trigger permanent view count
          fetch("/api/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId: video.id })
          }).catch(() => {});
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
      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />



            {/* BOTTOM LEFT: DESCRIPTION, AVATAR, BUTTONS */}
      <div className="absolute left-4 right-[80px] bottom-[105px] z-30 flex flex-col items-start gap-3 pointer-events-none">

        {/* 1. Description */}
        <div 
          className="text-white text-[14px] drop-shadow-md leading-snug cursor-pointer pointer-events-auto"
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

        {/* 2. Avatar Row */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link href={finalSlug ? `/profile/${finalSlug}` : "#"} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e]">
              {finalPhoto ? (
                <img src={finalPhoto} alt={finalName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-[#E53945] to-[#8a1e26]">
                  {finalName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-white text-[14px] font-semibold drop-shadow-md group-hover:text-white/80 transition-colors">
              {finalName}
            </span>
          </Link>
          
          <button 
            onClick={handleFollow} 
            disabled={isSubmittingFollow}
            className={`ml-1 px-3 py-1 text-xs font-bold rounded-md transition backdrop-blur-sm border ${isFollowing ? "bg-white/10 border-white/20 text-white" : "bg-white/20 border-white/30 text-white hover:bg-white/30"} ${isSubmittingFollow ? "opacity-50 cursor-wait" : ""}`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>

        {/* 3. Action Buttons Row */}
        <div className="flex items-center gap-5 pointer-events-auto">
          <button onClick={onToggleMute} className="text-white drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
            {isMuted ? <VolumeX size={26} strokeWidth={1.5} /> : <Volume2 size={26} strokeWidth={1.5} />}
          </button>
          <button onClick={onOpenComments} className="text-white drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
            <MessageCircle size={26} strokeWidth={1.5} />
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: video.creatorId } }))} className="text-yellow-500 drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
            <Gift size={26} strokeWidth={1.5} />
          </button>
          <div className="text-white drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
            <LikeButton videoId={video.id} size={26} stacked={false} />
          </div>
          <div className="flex items-center gap-1.5 text-white drop-shadow-lg">
            <Eye size={26} strokeWidth={1.5} />
            <span className="text-[13px] font-bold">{(video as any).views || 0}</span>
          </div>
        </div>

      </div>

      {/* PROGRESS BAR (DRAGGABLE) */}
      <div className="absolute left-0 right-0 bottom-[85px] z-40 pointer-events-none">
        <div 
          ref={progressBarRef}
          className="relative w-full h-[3px] bg-transparent cursor-pointer touch-none py-3 -my-3 pointer-events-auto"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[2px] bg-white pointer-events-none" style={{ width: `${progress}%` }} />
        </div>
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
