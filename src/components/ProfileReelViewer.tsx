"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Play, Volume2, VolumeX, MessageCircle, Send, Eye, Heart, Share } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import ViewCount, { trackView } from "@/components/ViewCount";
import CommentDrawer from "@/components/CommentDrawer";
import ShareReelSheet from "@/components/ShareReelSheet";
import VerifiedBadge from "@/components/VerifiedBadge";
import { motion, AnimatePresence } from "framer-motion";

type Video = {
  id: number;
  title?: string;
  description?: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl?: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  textOverlays?: any[];
  viewCount?: number;
};

export default function ProfileReelViewer({
  videos,
  initialIndex,
  onClose,
  author,
}: {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
  author: { name: string; avatar: string; verified: boolean; profileHref: string };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  
  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  const trackedViews = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const child = container.children[initialIndex] as HTMLElement;
      if (child) {
        container.scrollTo({ top: child.offsetTop, behavior: "instant" });
      }
    }
  }, [initialIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(index);
            
            const videoId = Number((entry.target as HTMLElement).dataset.videoId);
            if (!trackedViews.current.has(videoId)) {
              trackedViews.current.add(videoId);
              trackView(videoId);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur pointer-events-auto">
          <X size={24} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {videos.map((v, i) => (
          <ReelItem
            key={v.id}
            video={v}
            index={i}
            isActive={activeIndex === i}
            author={author}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onOpenComments={() => setCommentVideo(v)}
            onOpenShare={() => setShareVideo(v)}
            onCloseViewer={onClose}
          />
        ))}
      </div>

      {commentVideo && (
        <CommentDrawer
          videoId={commentVideo.id}
          title={commentVideo.title || "Comments"}
          onClose={() => setCommentVideo(null)}
        />
      )}

      {shareVideo && (
        <ShareReelSheet
          open={!!shareVideo}
          onClose={() => setShareVideo(null)}
          videoId={shareVideo.id}
          videoTitle={shareVideo.title || ""}
        />
      )}
    </div>
  );
}

function ReelItem({ video, index, isActive, author, muted, onToggleMute, onOpenComments, onOpenShare, onCloseViewer }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [playing, setPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isSeeking, setIsSeeking] = useState(false);
  
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleScreenTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.ui-ignore') || target.closest('.progress-bar-container')) return;

    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
      triggerLike();
    } else {
      tapTimeout.current = setTimeout(() => {
        togglePlay();
        tapTimeout.current = null;
      }, 250);
    }
  };

  const triggerLike = () => {
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);

    const el = document.getElementById(`like-btn-${video.id}`);
    if (el) {
      const clickable = el.querySelector('button') || el.firstElementChild;
      if (clickable) (clickable as HTMLElement).click();
      else el.click();
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isSeeking || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };

  const handlePointerSeek = (e: React.PointerEvent) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = e.clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    setProgress(percentage);
    v.currentTime = percentage * v.duration;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsSeeking(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerSeek(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isSeeking) handlePointerSeek(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsSeeking(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      data-index={index}
      data-video-id={video.id}
      className="w-full h-full snap-start relative bg-black flex items-center justify-center"
      onClick={handleScreenTap}
    >
      <video
        ref={videoRef}
        src={video.videoUrl ?? video.bitchuteUrl ?? ""}
        className="w-full h-full object-contain pointer-events-none"
        loop
        playsInline
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
      />

      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <Heart size={100} fill="#ef4444" className="text-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-24 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10">
        
        {/* RIGHT SIDE ACTIONS */}
        <div className="absolute right-4 bottom-28 flex flex-col items-center gap-5 pointer-events-auto">
          <div id={`like-btn-${video.id}`} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <LikeButton videoId={video.id} size={26} showCount={true} />
          </div>
          <button onClick={onOpenComments} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <MessageCircle size={26} />
          </button>
          <div className="flex flex-col items-center gap-1 text-white/80 drop-shadow-md">
            <Eye size={24} />
            <span className="text-xs font-semibold"><ViewCount videoId={video.id} showIcon={false} /></span>
          </div>
          <button onClick={onOpenShare} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <Send size={26} />
          </button>
          <button onClick={() => {
            const url = window.location.origin + `/feed?reel=${video.id}`;
            if (navigator.share) navigator.share({ url });
            else navigator.clipboard.writeText(url);
          }} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <Share size={24} />
          </button>
          <div className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <SaveButton videoId={video.id} variant="icon" size={24} />
          </div>
        </div>

        {/* BOTTOM LEFT INFO */}
        <div className="flex-1 flex flex-col justify-end max-w-[75%] pointer-events-auto mb-2">
          <Link href={author.profileHref} onClick={onCloseViewer} className="flex items-center gap-2 mb-2 w-max">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-600 to-red-900 overflow-hidden flex-shrink-0 border border-white/20">
              {author.avatar ? (
                <img src={author.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                  {author.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <span className="font-bold text-white text-[13px] drop-shadow-md flex items-center gap-1">
              {author.name || "User"}
              {author.verified && <VerifiedBadge size={13} variant="gold" />}
            </span>
          </Link>

          {video.title && <h3 className="text-white font-bold text-sm mb-1 drop-shadow-md">{video.title}</h3>}
          {video.description && <p className="text-white/80 text-xs line-clamp-2 mb-2 drop-shadow-md">{video.description}</p>}
        </div>

        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
             <div className="p-5 bg-black/50 rounded-full backdrop-blur text-white">
               <Play size={40} fill="white" />
             </div>
          </div>
        )}
        
        <div className="absolute left-4 top-16 pointer-events-auto ui-ignore">
           <button onClick={onToggleMute} className="p-2.5 bg-black/50 rounded-full backdrop-blur text-white">
             {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
        </div>
      </div>

      {/* ===== IG-STYLE DRAGGABLE PROGRESS BAR (ABOVE BOTTOM NAV) ===== */}
      <div 
        className="absolute bottom-[85px] left-0 right-0 z-[60] progress-bar-container pointer-events-auto px-4"
        style={{ touchAction: 'none' }} 
        onClick={(e) => e.stopPropagation()} 
      >
        <div 
          ref={progressBarRef}
          className="relative w-full h-8 flex items-center cursor-pointer group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Background Track */}
          <div className="w-full h-[4px] bg-white/30 group-hover:h-[6px] transition-all rounded-full overflow-hidden">
            {/* Filled Progress */}
            <div 
              className="h-full bg-white transition-none" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          {/* Draggable Thumb (Only visible when seeking or hovering) */}
          <div 
            className={`absolute h-3.5 w-3.5 bg-white rounded-full shadow-md transition-opacity pointer-events-none ${isSeeking ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ left: `calc(${progress * 100}% - 7px)` }}
          />
        </div>
      </div>
    </div>
  );
}
