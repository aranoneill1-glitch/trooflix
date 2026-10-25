"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Play, Volume2, VolumeX, MessageCircle, Send, Eye, Heart, Share } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import ViewCount, { trackView } from "@/components/ViewCount";
import CommentDrawer from "@/components/CommentDrawer";
import ShareReelSheet from "@/components/ShareReelSheet";
import VerifiedBadge from "@/components/VerifiedBadge";
import { motion, AnimatePresence } from "framer-motion";

type Author = { name: string; avatar: string; verified: boolean; profileHref: string };

function VideoSlide({ video, index, isActive, isNext, isPrev, author, muted, onToggleMute, onOpenComments, onOpenShare }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  useLayoutEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      v.currentTime = 0;
      v.muted = muted;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setPlaying(true)).catch(() => {
          v.muted = true;
          v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        });
      }
    } else {
      v.pause();
      setPlaying(false);
      setProgress(0);
    }
  }, [isActive, muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
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
      className="w-full h-full snap-start relative bg-black flex items-center justify-center"
      onClick={togglePlay}
    >
      <video
        key={video.id} 
        ref={videoRef}
        src={video.videoUrl ?? video.bitchuteUrl}
        poster={video.posterUrl}
        className="w-full h-full object-contain pointer-events-none"
        loop
        playsInline
        muted={muted}
        preload={isActive || isNext || isPrev ? "auto" : "metadata"}
        autoPlay={isActive}
        onTimeUpdate={handleTimeUpdate}
      />

      {!playing && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="p-5 bg-black/50 rounded-full backdrop-blur text-white">
            <Play size={40} fill="white" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-24 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-10">
        
        <div className="absolute right-4 bottom-28 flex flex-col items-center gap-5 pointer-events-auto">
          <div className="flex flex-col items-center gap-1 text-white drop-shadow-md">
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
          <div className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <SaveButton videoId={video.id} variant="icon" size={24} />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-end max-w-[75%] pointer-events-auto mb-2">
          <Link href={author?.profileHref || "#"} className="flex items-center gap-2 mb-2 w-max">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-600 to-red-900 overflow-hidden flex-shrink-0 border border-white/20">
              {author?.avatar ? (
                <img src={author.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                  {author?.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <span className="font-bold text-white text-[13px] drop-shadow-md flex items-center gap-1">
              {author?.name || "User"}
              {author?.verified && <VerifiedBadge size={13} variant="gold" />}
            </span>
          </Link>

          {video.title && <h3 className="text-white font-bold text-sm mb-1 drop-shadow-md">{video.title}</h3>}
          {video.description && <p className="text-white/80 text-xs line-clamp-2 mb-2 drop-shadow-md">{video.description}</p>}
        </div>

        <div className="absolute left-4 top-16 pointer-events-auto">
           <button onClick={onToggleMute} className="p-2.5 bg-black/50 rounded-full backdrop-blur text-white">
             {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
        </div>
      </div>

      {/* IG-STYLE DRAGGABLE PROGRESS BAR */}
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
          <div className="w-full h-[4px] bg-white/30 group-hover:h-[6px] transition-all rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-none" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          <div 
            className={`absolute h-3.5 w-3.5 bg-white rounded-full shadow-md transition-opacity pointer-events-none ${isSeeking ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ left: `calc(${progress * 100}% - 7px)` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProfileReelViewer({
  videos,
  initialIndex,
  onClose,
  author,
  getAuthor,
}: {
  videos: any[];
  initialIndex: number;
  onClose: () => void;
  author?: Author;
  getAuthor?: (video: any) => Author;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  const [commentVideo, setCommentVideo] = useState<any>(null);
  const [shareVideo, setShareVideo] = useState<any>(null);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const child = container.children[initialIndex] as HTMLElement;
      if (child) {
        container.scrollTo({ top: child.offsetTop, behavior: "instant" });
      }
    }
  }, [initialIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenterY = containerRect.top + containerRect.height / 2;
    
    let closestIndex = activeIndex;
    let minDistance = Infinity;

    Array.from(container.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const elRect = el.getBoundingClientRect();
      const elCenterY = elRect.top + elRect.height / 2;
      const distance = Math.abs(containerCenterY - elCenterY);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur pointer-events-auto">
          <X size={24} />
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {videos.map((v, i) => {
          const displayAuthor = getAuthor ? getAuthor(v) : (author || { name: "User", avatar: "", verified: false, profileHref: "#" });
          return (
            <VideoSlide
              key={v.id}
              video={v}
              index={i}
              isActive={activeIndex === i}
              isNext={i === activeIndex + 1}
              isPrev={i === activeIndex - 1}
              author={displayAuthor}
              muted={muted}
              onToggleMute={() => setMuted((m: boolean) => !m)}
              onOpenComments={() => setCommentVideo(v)}
              onOpenShare={() => setShareVideo(v)}
            />
          );
        })}
      </div>

      {commentVideo && <CommentDrawer videoId={commentVideo.id} title={commentVideo.title || "Comments"} onClose={() => setCommentVideo(null)} />}
      {shareVideo && <ShareReelSheet open={!!shareVideo} onClose={() => setShareVideo(null)} videoId={shareVideo.id} videoTitle={shareVideo.title || ""} />}
    </div>
  );
}
