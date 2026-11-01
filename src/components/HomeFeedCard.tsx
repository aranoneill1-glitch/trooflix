"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { Play, VolumeX, Volume2, MoreVertical, Maximize, ThumbsUp, MessageCircle, Eye, Share2, Bookmark } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function HomeFeedCard({ video, creator, onMore, onPlay, isActive, onSetActive, onOpenComments, isLiked, onToggleLike, hideCreatorInfo }: { video: any, creator: any, onMore: () => void, onPlay: () => void, isActive: boolean, onSetActive: () => void, onOpenComments: () => void, isLiked: boolean, onToggleLike: () => void, hideCreatorInfo?: boolean }): JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>(video.duration || '0:00');
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stats State
  const [liked, setLiked] = useState(isLiked || false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);
  const hasRecordedView = useRef(false);

  const videoSrc = video.videoUrl || video.bitchuteUrl || '';

  // Resolve identity
  useEffect(() => {
    getCachedUser().then((u: any) => {
      if (u?.id) setUserId(u.id);
      else {
        let a = localStorage.getItem("trooflix:anon_id");
        if (!a) {
          a = "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem("trooflix:anon_id", a);
        }
        setAnonId(a);
      }
    });
  }, []);

  // Fetch initial counts
  useEffect(() => {
    fetch("/api/like-counts")
      .then((r) => r.json())
      .then((d) => setLikeCount(d.counts?.[video.id] || 0))
      .catch(() => {});
    fetch("/api/views")
      .then((r) => r.json())
      .then((d) => setViewCount(d.counts?.[video.id] || 0))
      .catch(() => {});
    fetch(`/api/comments?video_id=${video.id}`)
      .then((r) => r.json())
      .then((d) => setCommentCount(Array.isArray(d.comments) ? d.comments.filter((c: any) => !c.parent_id).length : 0))
      .catch(() => {});
  }, [video.id]);

  // Check if already liked
  useEffect(() => {
    const id = userId || anonId;
    if (!id) return;
    const url = userId ? `/api/likes?user_id=${userId}` : `/api/likes?anon_id=${anonId}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setLiked(Array.isArray(d.ids) && d.ids.includes(video.id)))
      .catch(() => {});
  }, [userId, anonId, video.id]);

  // Record view
  useEffect(() => {
    if (isActive && !hasRecordedView.current && (userId || anonId)) {
      hasRecordedView.current = true;
      fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id }),
      })
        .then(() => setViewCount((c) => c + 1))
        .catch(() => {});
    }
  }, [isActive, userId, anonId, video.id]);

  const toggleLike = async () => {
    if (!userId && !anonId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? Math.max(0, c - 1) : c + 1));
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, anonId, videoId: video.id }),
      });
      const data = await res.json();
      if (typeof data.liked === "boolean") {
        setLiked(data.liked);
      }
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : Math.max(0, c - 1)));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.6) onSetActive();
    }, { threshold: [0.6] });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onSetActive]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().then(() => setIsPlaying(true)).catch(() => {
        v.muted = true;
        setIsMuted(true);
        v.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (isPlaying) handleInteraction();
    else setShowControls(true);
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [isPlaying]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (v.paused) { try { await v.play(); setIsPlaying(true); } catch (err) { console.error(err); } }
    else { v.pause(); setIsPlaying(false); }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isSeeking || !v.duration) return;
    setProgress(v.currentTime / v.duration);
    setTimeLeft(formatTime(v.duration - v.currentTime));
  };

  if (video.type?.toLowerCase() === "tweet") {
    return (
      <div className="w-full relative flex flex-col bg-[#1c1c1e] mb-8 mx-auto rounded-[24px] border border-white/10 shadow-2xl p-5">
        {!hideCreatorInfo && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1c1c1e] border border-white/20 shrink-0">
              {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{creator?.name?.[0] || 'C'}</div>}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">{creator?.name || 'Creator'}</h2>
              <p className="text-[11px] text-white/50">@{creator?.slug || 'user'}</p>
            </div>
          </div>
        )}
        
        <p className="text-white/90 text-[15px] leading-relaxed whitespace-pre-wrap mb-4">{video.description}</p>
        
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
          <div className="flex items-center gap-6">
            <button onClick={toggleLike} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
              <ThumbsUp size={20} fill={liked ? "#E53945" : "none"} className={liked ? "text-[#E53945]" : "text-white"} />
              <span className="text-[13px] font-bold">{likeCount}</span>
            </button>
            <button onClick={onOpenComments} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
              <MessageCircle size={20} />
              <span className="text-[13px] font-bold">{commentCount}</span>
            </button>
            <div className="flex items-center gap-1.5 text-white/60">
              <Eye size={20} />
              <span className="text-[13px] font-bold">{viewCount}</span>
            </div>
          </div>
          <button className="text-white/90 hover:text-white transition">
            <Bookmark size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (!videoSrc) return null;

  return (
    <div ref={containerRef} className="w-full relative flex flex-col group/feed bg-[#09090B] lg:bg-transparent mb-8 mx-auto rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
      <div className="w-full relative overflow-hidden flex flex-col lg:bg-[#1c1c1e] lg:rounded-2xl lg:border lg:border-white/5 lg:shadow-lg">
        
        <div className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer" onClick={() => { handleInteraction(); togglePlay(); }} onMouseMove={handleInteraction} onTouchStart={handleInteraction}>
          <video ref={videoRef} src={videoSrc} className="w-full h-full object-cover" playsInline muted={isMuted} preload="metadata" onTimeUpdate={handleTimeUpdate} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={() => setError(true)} loop />

          {error && <div className="absolute inset-0 flex items-center justify-center bg-black/80"><p className="text-white/50 text-sm">Video unavailable</p></div>}

          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

          {/* CREATOR INFO (Hidden on Profile Feed) */}
          {!hideCreatorInfo && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1c1c1e] flex-shrink-0 border border-white/20">
                {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-xs text-white">{creator?.name?.[0] || 'TF'}</span>}
              </div>
              <div><h2 className="text-sm font-bold text-white drop-shadow-md">{creator?.name || 'Creator'}</h2></div>
            </div>
          )}

          <button onClick={(e) => { e.stopPropagation(); onMore(); }} className="absolute top-3 right-3 z-20 p-1 text-white/80 hover:text-white drop-shadow-md transition"><MoreVertical size={20} /></button>

          {!isPlaying && <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"><div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl"><Play size={32} fill="white" className="text-white ml-1" /></div></div>}
          
          <div className={`absolute bottom-3 left-3 z-20 pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}><span className="text-[11px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">{timeLeft || '0:00'}</span></div>

          <div className={`absolute bottom-3 right-3 flex items-center gap-2 z-20 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; handleInteraction(); }} className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition">{isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}</button>
            <button onClick={(e) => { e.stopPropagation(); onPlay(); }} className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition"><Maximize size={14} /></button>
          </div>
        </div>

        {/* TEXT INFO */}
        <div className="px-4 pt-3 pb-3">
          <h3 className="text-[15px] font-semibold text-white leading-snug mb-1 line-clamp-2">{video.title}</h3>
          <p className="text-[14px] text-white/90 leading-snug line-clamp-3 mb-3">{video.description || 'No description available.'}</p>

          {/* ACTION BUTTONS (NUMBERS ONLY) */}
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-6">
              <button onClick={toggleLike} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <ThumbsUp size={20} fill={liked ? "#E53945" : "none"} className={liked ? "text-[#E53945]" : "text-white"} />
                <span className="text-[13px] font-bold">{likeCount}</span>
              </button>
              
              <button onClick={onOpenComments} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <MessageCircle size={20} />
                <span className="text-[13px] font-bold">{commentCount}</span>
              </button>

              <div className="flex items-center gap-1.5 text-white/60">
                <Eye size={20} />
                <span className="text-[13px] font-bold">{viewCount}</span>
              </div>
            </div>
            
            <button className="text-white/90 hover:text-white transition">
              <Bookmark size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
