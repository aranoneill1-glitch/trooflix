"use client";
import { getCachedUser } from "@/lib/cache";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Heart, Eye, MessageCircle, Play, Pause, Gift, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import LikeButton from "@/components/LikeButton";
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
  views?: number;
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
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedReelId = params.get("reel");
    const requestedCreatorUserId = params.get("creator_user_id");
    const requestedCreatorId = params.get("creator_id");
    Promise.all([
      fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      fetch("/api/creators", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
    ]).then(([vData, cData]) => {
      const all = Array.isArray(vData) ? vData : [];
      const shortsOnly = all.filter((v: any) => {
        const isShort = ["short", "reel"].includes(String(v.type || "").toLowerCase());
        if (!isShort) return false;
        if (!requestedCreatorUserId && !requestedCreatorId) return true;
        const matchesCreatorUser = requestedCreatorUserId && String(v.uploaderUserId || "") === requestedCreatorUserId;
        const matchesCreatorId = requestedCreatorId && String(v.creatorId || "") === requestedCreatorId;
        return Boolean(matchesCreatorUser || matchesCreatorId);
      });
      const sortedShorts = shortsOnly.sort((a: any, b: any) => b.id - a.id);
      const requestedIndex = requestedReelId ? sortedShorts.findIndex((video: any) => String(video.id) === requestedReelId) : -1;
      const orderedShorts = requestedIndex > 0
        ? [sortedShorts[requestedIndex], ...sortedShorts.slice(0, requestedIndex), ...sortedShorts.slice(requestedIndex + 1)]
        : sortedShorts;
      setVideos(orderedShorts);
      setCreators(Array.isArray(cData) ? cData : []);
      if (orderedShorts.length > 0) {
        setActiveVideo(orderedShorts[0]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleMute = () => setIsMuted(prev => !prev);

  const scrollUp = () => {
    if (videoContainerRef.current) {
      videoContainerRef.current.scrollBy({ top: -videoContainerRef.current.clientHeight, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (videoContainerRef.current) {
      videoContainerRef.current.scrollBy({ top: videoContainerRef.current.clientHeight, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <main className="h-[100dvh] bg-black flex items-center justify-center">
        <Link href="/" aria-label="Return to Home" className="fixed left-4 top-[calc(env(safe-area-inset-top)+12px)] z-[100] inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3.5 text-sm font-semibold text-white shadow-lg backdrop-blur-xl transition hover:bg-black/70">
          <ChevronLeft size={18} /> Home
        </Link>
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  const activeCreator = activeVideo ? creators.find(c => String(c.id) === String(activeVideo.creatorId)) : null;

  return (
    <main className="h-[100dvh] w-full bg-[#050505] overflow-hidden flex flex-col lg:flex-row">
      <Link href="/" aria-label="Return to Home" className="fixed left-4 top-[calc(env(safe-area-inset-top)+12px)] z-[100] inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3.5 text-sm font-semibold text-white shadow-lg backdrop-blur-xl transition hover:bg-black/70">
        <ChevronLeft size={18} /> Home
      </Link>
      
      {/* MOBILE VIEW */}
      <div className="lg:hidden w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative bg-black">
        {videos.map((video) => {
          const creator = creators.find((c) => String(c.id) === String(video.creatorId)) || null;
          return (
            <MobileVideoShort
              key={video.id}
              video={video}
              creator={creator}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onOpenComments={() => setCommentSheetVideoId(video.id)}
              onSetActive={() => setActiveVideo(video)}
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
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden lg:flex w-full h-full items-center bg-[#050505] overflow-hidden">
        <div className="w-[10%] h-full shrink-0" />
        
        {/* 1. Left: Video (30%) */}
        <div 
          ref={videoContainerRef}
          className="w-[35%] h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide flex flex-col items-end shrink-0"
        >
          {videos.map((video) => (
            <DesktopVideoShort
              key={video.id}
              video={video}
              isMuted={isMuted}
              onSetActive={() => setActiveVideo(video)}
            />
          ))}
        </div>

        {/* 2. Gap (1.5%) */}
        <div className="w-[1.5%] h-full shrink-0" />

        {/* 3. Middle: Control Dock (10%) */}
        <div className="w-[10%] h-full flex items-center justify-center shrink-0">
          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 rounded-full py-6 px-3 flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <button onClick={scrollUp} className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition">
              <ChevronUp size={28} />
            </button>
            <div className="w-8 h-px bg-white/10" />
            <button onClick={toggleMute} className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition">
              {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
            </button>
            <div className="flex flex-col items-center gap-1 text-white/70">
              <Eye size={24}/>
              <span className="text-[11px] font-bold">{activeVideo?.views || 0}</span>
            </div>
            <button className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition">
              <MessageCircle size={24}/>
            </button>
            <button onClick={() => activeVideo && window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: activeVideo.creatorId, videoId: activeVideo.id } }))} className="w-12 h-12 flex items-center justify-center text-yellow-500 hover:bg-white/10 rounded-full transition">
              <Gift size={24}/>
            </button>
            <div className="flex flex-col items-center gap-1">
              {activeVideo && <LikeButton videoId={activeVideo.id} size={24} showCount={true} stacked={true} />}
            </div>
            <div className="w-8 h-px bg-white/10" />
            <button onClick={scrollDown} className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition">
              <ChevronDown size={28} />
            </button>
          </div>
        </div>

        {/* 4. Gap (1.5%) */}
        <div className="w-[1.5%] h-full shrink-0" />

        {/* 5. Right: Comments (57%) */}
        <div className="w-[42%] h-full flex items-center pr-6">
          <div className="w-full h-[85vh] max-h-[850px] bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {activeVideo && (
              <>
                <div className="p-4 flex items-center justify-between shrink-0 bg-[#0a0a0a] border-b border-white/5">
                  <div className="flex items-center gap-3">
                    {activeCreator?.photoUrl ? (
                      <img src={activeCreator.photoUrl} className="w-10 h-10 rounded-full border border-white/20 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                        {activeCreator?.name?.charAt(0) || "C"}
                      </div>
                    )}
                    <Link href={activeCreator?.slug ? `/profile/${activeCreator.slug}` : "#"} className="font-bold text-white hover:text-white/80 transition text-lg">
                      {activeCreator?.name || "Creator"}
                    </Link>
                  </div>
                  <button className="bg-[#E53945] hover:bg-[#d12e39] text-white text-sm font-bold px-5 py-1.5 rounded-full transition">
                    Follow
                  </button>
                </div>
                <div className="flex-1 overflow-hidden bg-[#0a0a0a]">
                  <Comments videoId={activeVideo.id} variant="chat" />
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}

function DesktopVideoShort({ video, isMuted, onSetActive }: { video: Video, isMuted: boolean, onSetActive: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const onSetActiveRef = useRef(onSetActive);
  const isMutedRef = useRef(isMuted);
  onSetActiveRef.current = onSetActive;
  isMutedRef.current = isMuted;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const current = videoRef.current;
        if (!current) return;
        if (entry.isIntersecting) {
          document.querySelectorAll<HTMLVideoElement>("video[data-short-player]").forEach((player) => {
            if (player !== current) {
              player.pause();
              player.muted = true;
              try { player.currentTime = 0; } catch {}
            }
          });
          try { current.currentTime = 0; } catch {}
          current.muted = isMutedRef.current;
          setIsActive(true);
          current.play().catch(() => {});
          onSetActiveRef.current();
        } else {
          current.pause();
          current.muted = true;
          try { current.currentTime = 0; } catch {}
          setIsActive(false);
        }
      },
      { threshold: 0.6 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        try { videoRef.current.currentTime = 0; } catch {}
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full snap-start flex items-center justify-end pr-2 shrink-0">
      <div className="relative w-full max-w-[500px] aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {(!video.videoUrl && !video.bitchuteUrl) ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">No video source</div>
        ) : (
          <video
            ref={videoRef}
            data-short-player
            src={video.videoUrl || video.bitchuteUrl}
            poster={video.posterUrl}
            loop
            playsInline
            muted={isMuted || !isActive}
            preload="auto"
            className="w-full h-full object-cover cursor-pointer"
            onClick={(e) => {
              if (e.currentTarget.paused) e.currentTarget.play();
              else e.currentTarget.pause();
            }}
          />
        )}
      </div>
    </div>
  );
}

function MobileVideoShort({ video, creator, isMuted, onToggleMute, onOpenComments, onSetActive }: { video: Video, creator: Creator | null, isMuted: boolean, onToggleMute: () => void, onOpenComments: () => void, onSetActive: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const onSetActiveRef = useRef(onSetActive);
  const isMutedRef = useRef(isMuted);
  onSetActiveRef.current = onSetActive;
  isMutedRef.current = isMuted;
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
    if (creator?.id) return Number(creator.id);
    const vidCreator = Number((video as any).creatorId);
    if (video.creatorId && !isNaN(vidCreator)) return vidCreator;
    const uploaderUuid = (video as any).uploaderUserId;
    if (!uploaderUuid) return null;
    try {
      const res = await fetch("/api/creators");
      const list = await res.json();
      const match = (Array.isArray(list) ? list : []).find(
        (c: any) => String(c.user_id) === String(uploaderUuid) || String(c.ownerUserId) === String(uploaderUuid)
      );
      if (match?.id) return Number(match.id);
    } catch (err) {}
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
      if (!targetId || isNaN(targetId)) return alert("This creator doesn't have a followable profile yet.");
      const newIsFollowing = !isFollowing;
      setIsFollowing(newIsFollowing);
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, creatorId: targetId })
      });
      if (!res.ok) throw new Error("Follow failed");
    } catch (err: any) {
      setIsFollowing(!isFollowing);
      alert("Follow failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmittingFollow(false);
    }
  };

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";
  const hasLongDescription = (video.description || "").length > 65;

  const [fallbackPhoto, setFallbackPhoto] = useState("");
  const [fallbackName, setFallbackName] = useState("");
  const [fallbackSlug, setFallbackSlug] = useState("");

  useEffect(() => {
    if (creator?.photoUrl) return;
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
      }).catch(() => {});
  }, [creator?.photoUrl, video]);

  const finalPhoto = creator?.photoUrl || fallbackPhoto;
  const finalName = creator?.name || fallbackName || "Creator";
  const finalSlug = creator?.slug || fallbackSlug;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const current = videoRef.current;
        if (!current) return;
        if (entry.isIntersecting) {
          document.querySelectorAll<HTMLVideoElement>("video[data-short-player]").forEach((player) => {
            if (player !== current) {
              player.pause();
              player.muted = true;
              try { player.currentTime = 0; } catch {}
            }
          });
          try { current.currentTime = 0; } catch {}
          current.muted = isMutedRef.current;
          setIsActive(true);
          current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          onSetActiveRef.current();
        } else {
          current.pause();
          current.muted = true;
          try { current.currentTime = 0; } catch {}
          setIsActive(false);
          setIsPlaying(false);
          setIsExpanded(false);
        }
      },
      { threshold: 0.6 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => {
      observer.disconnect();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        try { videoRef.current.currentTime = 0; } catch {}
      }
    };
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
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
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
        data-short-player
        src={videoSrc}
        loop
        playsInline
        muted={isMuted || !isActive}
        preload="auto"
        onLoadedData={() => {
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

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 px-6 text-center pointer-events-none">
          <p className="text-white font-bold mb-2">Video Unavailable</p>
          <p className="text-white/50 text-sm">Please upload an .mp4 file.</p>
        </div>
      )}

      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
            {isPlaying ? <Pause size={40} className="text-white" fill="currentColor" /> : <Play size={40} className="text-white ml-2" fill="currentColor" />}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      <div className="absolute left-4 right-[80px] bottom-[calc(env(safe-area-inset-bottom)+36px)] lg:bottom-[105px] z-30 flex flex-col items-start gap-3 pointer-events-none">
        <div 
          className="text-white text-[14px] drop-shadow-md leading-snug cursor-pointer pointer-events-auto"
          onClick={toggleExpand}
        >
          <span className={isExpanded ? "" : "line-clamp-2"}>
            {video.description || "Watch this exclusive clip on Trooflix."}
          </span>
          {!isExpanded && hasLongDescription && (
            <span className="text-white/60 font-bold ml-1.5 hover:text-white">... more</span>
          )}
        </div>

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

        <div className="flex items-center gap-5 pointer-events-auto">
          <button onClick={onToggleMute} className="text-white drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
            {isMuted ? <VolumeX size={26} strokeWidth={1.5} /> : <Volume2 size={26} strokeWidth={1.5} />}
          </button>
          <button onClick={onOpenComments} className="text-white drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
            <MessageCircle size={26} strokeWidth={1.5} />
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: video.creatorId, videoId: video.id } }))} className="text-yellow-500 drop-shadow-lg hover:scale-110 active:scale-95 transition-transform">
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

      <div className="absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] lg:bottom-[85px] z-40 pointer-events-none px-4">
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
