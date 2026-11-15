"use client";
import { getCachedUser, getCachedVideos, getCachedCreators } from "@/lib/cache";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Heart, Eye, MessageCircle, Play, Pause, ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import LikeButton, { externalLike } from "@/components/LikeButton";
import { motion, AnimatePresence } from "framer-motion";
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
  const [viewCounts, setViewCounts] = useState<Record<number, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedReelId = params.get("reel");
    const requestedCreatorUserId = params.get("creator_user_id");
    const requestedCreatorId = params.get("creator_id");
    Promise.all([
      getCachedVideos().catch(() => []),
      getCachedCreators().catch(() => []),
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
      const initialViews: Record<number, number> = {};
      orderedShorts.forEach((v: any) => { initialViews[v.id] = Number(v.views || 0); });
      setViewCounts(initialViews);
      if (orderedShorts.length > 0) {
        setActiveVideo(orderedShorts[0]);
      }
      setLoading(false);
      fetch("/api/comment-counts", { cache: "no-store" })
        .then(r => r.json())
        .then(d => setCommentCounts(d?.counts || {}))
        .catch(() => {});
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (commentSheetVideoId !== null) return;
    fetch("/api/comment-counts", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCommentCounts(d?.counts || {}))
      .catch(() => {});
  }, [commentSheetVideoId]);

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
        <Link href="/" aria-label="Return to Home" className="fixed left-4 top-[calc(env(safe-area-inset-top)+12px)] z-[100] inline-flex h-11 w-11 items-center justify-center text-white drop-shadow-lg transition hover:scale-110">
          <ArrowLeft size={28} strokeWidth={2.5} />
        </Link>
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  const activeCreator = activeVideo ? creators.find(c => String(c.id) === String(activeVideo.creatorId)) : null;

  return (
    <main className="h-[100dvh] w-full bg-[#050505] overflow-hidden flex flex-col lg:flex-row">
      <Link href="/" aria-label="Return to Home" className="fixed left-4 top-[calc(env(safe-area-inset-top)+12px)] z-[100] inline-flex h-11 w-11 items-center justify-center text-white drop-shadow-lg transition hover:scale-110">
        <ArrowLeft size={28} strokeWidth={2.5} />
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
              viewCount={viewCounts[video.id] ?? Number(video.views || 0)}
              commentCount={commentCounts[video.id] ?? commentCounts[String(video.id) as any] ?? 0}
              onViewCounted={() => setViewCounts((prev) => ({ ...prev, [video.id]: (prev[video.id] ?? Number(video.views || 0)) + 1 }))}
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
              <span className="text-[11px] font-bold">{activeVideo ? (viewCounts[activeVideo.id] ?? Number((activeVideo as any).views || 0)) : 0}</span>
            </div>
            <button className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition">
              <MessageCircle size={24}/>
            </button>
            <button onClick={() => activeVideo && window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: activeVideo.creatorId, videoId: activeVideo.id } }))} className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
                <path d="M10.2 5.8L9.4 3.9M13.8 5.8L14.6 3.9M10.2 18.2L9.4 20.1M13.8 18.2L14.6 20.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
                <text x="12" y="15" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">TC</text>
              </svg>
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

  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    if (diff < 320) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      lastTapRef.current = 0;
      externalLike(video.id, true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hId = Date.now() + Math.random();
      setFloatingHearts((prev) => [...prev.slice(-2), { id: hId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== hId));
      }, 900);
    } else {
      lastTapRef.current = now;
      const target = e.currentTarget;
      clickTimeoutRef.current = setTimeout(() => {
        if (target.paused) target.play();
        else target.pause();
      }, 260);
    }
  };

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

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted || !isActive;
  }, [isMuted, isActive]);

  return (
    <div ref={containerRef} className="w-full h-full snap-start flex items-center justify-end pr-2 shrink-0">
      <div className="relative w-full max-w-[500px] aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {(!video.videoUrl && !video.bitchuteUrl) ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">No video source</div>
        ) : (
          <>
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
              onClick={handleVideoClick}
            />
            <AnimatePresence>
              {floatingHearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ scale: 0, opacity: 0, x: h.x - 45, y: h.y - 45, rotate: -15 }}
                  animate={{
                    scale: [0, 1.4, 1.1, 1],
                    opacity: [0, 1, 1, 0],
                    y: h.y - 120,
                    rotate: [-15, 0, 12],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: [0.175, 0.885, 0.32, 1.275] }}
                  className="absolute pointer-events-none z-50 flex items-center justify-center"
                  style={{ left: 0, top: 0 }}
                >
                  <Heart size={90} className="text-red-500 fill-red-500 filter drop-shadow-[0_0_25px_rgba(239,68,68,0.95)]" />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

function MobileVideoShort({ video, creator, viewCount, commentCount, onViewCounted, isMuted, onToggleMute, onOpenComments, onSetActive }: { video: Video, creator: Creator | null, viewCount: number, commentCount: number, onViewCounted: () => void, isMuted: boolean, onToggleMute: () => void, onOpenComments: () => void, onSetActive: () => void }) {
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
  const [showError, setShowError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [showReelActions, setShowReelActions] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    if (diff < 320) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      lastTapRef.current = 0;
      externalLike(video.id, true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hId = Date.now() + Math.random();
      setFloatingHearts((prev) => [...prev.slice(-2), { id: hId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== hId));
      }, 900);
    } else {
      lastTapRef.current = now;
      clickTimeoutRef.current = setTimeout(() => {
        handleScreenClick();
      }, 260);
    }
  };

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

  const hasTrackedViewRef = useRef(false);
  const onViewCountedRef = useRef(onViewCounted);
  onViewCountedRef.current = onViewCounted;

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
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
          try { current.currentTime = 0; } catch {}
          current.muted = isMutedRef.current;
          setIsActive(true);
          current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          onSetActiveRef.current();
          if (!hasTrackedViewRef.current) {
            hasTrackedViewRef.current = true;
            onViewCountedRef.current();
            fetch("/api/views", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId: video.id })
            }).catch(() => {});
          }
        } else {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          current.pause();
          current.muted = true;
          try { current.currentTime = 0; } catch {}
          setIsActive(false);
          setIsPlaying(false);
          setIsExpanded(false);
          setShowError(false);
        }
      },
      { threshold: 0.6 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      observer.disconnect();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        try { videoRef.current.currentTime = 0; } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted || !isActive;
  }, [isMuted, isActive]);

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
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
        }}
        onCanPlay={() => {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
        }}
        onPlaying={() => {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          const mediaError = videoRef.current?.error;
          if (!mediaError) return;
          setHasError(true);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.readyState >= 2 && !v.error) return;
            setShowError(true);
          }, 900);
        }}
        className="w-full h-full object-cover cursor-pointer"
        onClick={handleVideoTap}
      />

      <AnimatePresence>
        {floatingHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ scale: 0, opacity: 0, x: h.x - 48, y: h.y - 48, rotate: -15 }}
            animate={{
              scale: [0, 1.5, 1.15, 1],
              opacity: [0, 1, 1, 0],
              y: h.y - 130,
              rotate: [-15, 0, 14],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="absolute pointer-events-none z-50 flex items-center justify-center"
            style={{ left: 0, top: 0 }}
          >
            <Heart size={96} className="text-red-500 fill-red-500 filter drop-shadow-[0_0_30px_rgba(239,68,68,0.95)]" />
          </motion.div>
        ))}
      </AnimatePresence>

      {showError && hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 px-6 text-center pointer-events-none">
          <p className="text-white font-bold mb-2">Video unavailable</p>
          <p className="text-white/50 text-sm">Please try again later.</p>
        </div>
      )}

      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
            {isPlaying ? <Pause size={40} className="text-white" fill="currentColor" /> : <Play size={40} className="text-white ml-2" fill="currentColor" />}
          </div>
        </div>
      )}

      <div className={`absolute left-4 right-4 lg:right-[80px] bottom-[calc(env(safe-area-inset-bottom)+112px)] lg:bottom-[150px] z-30 flex flex-col items-start gap-3 pointer-events-none transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`}>
        <div 
          className="text-white text-[14px] drop-shadow-md leading-snug cursor-pointer pointer-events-auto max-w-[92%]"
          onClick={toggleExpand}
        >
          <span className={isExpanded ? "" : "line-clamp-2"}>
            {video.description || "Watch this exclusive clip on Trooflix."}
          </span>
          {!isExpanded && hasLongDescription && (
            <span className="text-white/60 font-bold ml-1.5 hover:text-white">... more</span>
          )}
        </div>

        {/* Avatar/creator kept out of bottom action tab */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link href={finalSlug ? `/profile/${finalSlug}` : "#"} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e]">
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

        {/* Audio kept separate from action tab */}
        <button
          onClick={onToggleMute}
          aria-label={isMuted ? "Unmute reel" : "Mute reel"}
          className="pointer-events-auto text-white hover:scale-110 active:scale-95 transition-transform p-2 rounded-full bg-black/35 backdrop-blur-md border border-white/10 focus:outline-none"
        >
          {isMuted ? <VolumeX size={22} strokeWidth={2.2} /> : <Volume2 size={22} strokeWidth={2.2} />}
        </button>
      </div>

      {/* Bottom action bar: like, comment, tip, views (avatar excluded) */}
      <div className={`fixed inset-x-0 bottom-0 z-[260] lg:absolute lg:inset-x-auto lg:right-[80px] lg:bottom-[92px] lg:w-[360px] pointer-events-auto border-t border-white/10 bg-[#070709] lg:border lg:rounded-2xl transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex items-center justify-around px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+4px)] lg:pb-3">
          <div className="flex items-center justify-center min-w-0 flex-1 text-white">
            <LikeButton videoId={video.id} size={30} showCount={true} stacked={false} />
          </div>

          <button
            onClick={onOpenComments}
            aria-label="Open comments"
            className="flex items-center justify-center gap-1.5 min-w-0 flex-1 text-white hover:text-white/90 transition"
          >
            <MessageCircle size={30} strokeWidth={2.2} className="text-white/90" />
            <span className="text-[13px] font-extrabold tracking-tight">{commentCount || 0}</span>
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: video.creatorId, videoId: video.id } }))}
            aria-label="Tip creator"
            className="flex items-center justify-center min-w-0 flex-1 text-white hover:text-white/90 transition"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/90">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
              <path d="M10.2 5.8L9.4 3.9M13.8 5.8L14.6 3.9M10.2 18.2L9.4 20.1M13.8 18.2L14.6 20.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
              <text x="12" y="15" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">TC</text>
            </svg>
          </button>

          <div className="flex items-center justify-center gap-1.5 min-w-0 flex-1 text-white">
            <Eye size={30} strokeWidth={2.2} className="text-white/90" />
            <span className="text-[13px] font-extrabold tracking-tight">{viewCount || 0}</span>
          </div>
        </div>
      </div>

      <div className={`absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+70px)] lg:bottom-[85px] z-[255] pointer-events-none px-0 lg:px-4 transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`}>
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
