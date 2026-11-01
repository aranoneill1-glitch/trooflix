"use client";

import type { JSX } from "react";

import { useEffect, useRef, useState } from "react";
import { Play, VolumeX, Volume2, MoreVertical, Maximize, ThumbsUp, MessageCircle, Share2, Bookmark } from "lucide-react";

export default function HomeFeedCard({ video, creator, onMore, onPlay, isActive, onSetActive, onOpenComments, isLiked, onToggleLike }: { video: any, creator: any, onMore: () => void, onPlay: () => void, isActive: boolean, onSetActive: () => void, onOpenComments: () => void, isLiked: boolean, onToggleLike: () => void }): JSX.Element | null {

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

  const videoSrc = video.videoUrl || video.bitchuteUrl || '';

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hrs > 0 
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 4000);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          onSetActive();
        }
      },
      { threshold: [0.6] }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
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
    if (isPlaying) {
      handleInteraction();
    } else {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    
    if (v.paused) {
      try {
        await v.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isSeeking || !v.duration) return;
    setProgress(v.currentTime / v.duration);
    setTimeLeft(formatTime(v.duration - v.currentTime));
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setTimeLeft(formatTime(v.duration));
  };

  const handlePointerSeek = (e: React.PointerEvent) => {
    const bar = e.currentTarget as HTMLDivElement;
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
    handleInteraction();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isSeeking) handlePointerSeek(e);
    handleInteraction();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsSeeking(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    handleInteraction();
  };

  if (!videoSrc) return null;

  return (
    <div ref={containerRef} className="w-full relative flex flex-col group/feed bg-[#09090B] lg:bg-transparent mb-6 lg:mb-0">
      
      <div className="w-full relative overflow-hidden flex flex-col lg:bg-[#1c1c1e] lg:rounded-2xl lg:border lg:border-white/5 lg:shadow-lg">
        
        <div 
          className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer" 
          onClick={() => { handleInteraction(); togglePlay(); }}
          onMouseMove={handleInteraction}
          onTouchStart={handleInteraction}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            playsInline
            muted={isMuted}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setError(true)}
            loop
          />

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <p className="text-white/50 text-sm">Video unavailable</p>
            </div>
          )}

          {/* Top Gradient for readability */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

          {/* TOP LEFT: Creator Avatar & Name */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1c1c1e] flex-shrink-0 border border-white/20">
              {creator?.photoUrl ? (
                <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-xs text-white">{creator?.name?.[0] || 'TF'}</span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-md">
                {creator?.name || 'Creator'}
              </h2>
            </div>
          </div>

          {/* TOP RIGHT: More Menu */}
          <button 
            onClick={(e) => { e.stopPropagation(); onMore(); }} 
            className="absolute top-3 right-3 z-20 p-1 text-white/80 hover:text-white drop-shadow-md transition"
          >
            <MoreVertical size={20} />
          </button>

          {/* CENTER: Play/Pause icon if paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                <Play size={32} fill="white" className="text-white ml-1" />
              </div>
            </div>
          )}
          
          {/* BOTTOM LEFT: Timer */}
          <div className={`absolute bottom-3 left-3 z-20 pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <span className="text-[11px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {timeLeft || '0:00'}
            </span>
          </div>

          {/* BOTTOM RIGHT: Controls (Volume & Fullscreen) */}
          <div className={`absolute bottom-3 right-3 flex items-center gap-2 z-20 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; handleInteraction(); }} 
              className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition"
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onPlay(); }}
              className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition"
            >
              <Maximize size={14} />
            </button>
          </div>

          {/* PROGRESS BAR */}
          <div 
            className="absolute bottom-0 inset-x-0 h-1 bg-transparent z-30 cursor-pointer group/progress hover:bg-white/20 transition-colors"
            style={{ touchAction: 'none' }}
          >
            <div 
              className="absolute inset-0 w-full h-full flex items-center"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div className="w-full h-full bg-transparent relative overflow-hidden">
                <div 
                  className="h-full bg-[#E53945]" 
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              
              <div 
                className={`absolute h-3 w-3 bg-[#E53945] rounded-full shadow-md transition-opacity pointer-events-none ${isSeeking ? 'opacity-100 scale-125' : 'opacity-0 group-hover/progress:opacity-100'}`}
                style={{ left: `calc(${progress * 100}% - 6px)` }}
              />
            </div>
          </div>
        </div>

        {/* TEXT INFO (Instagram Style) */}
        <div className="px-4 lg:px-4 pt-3 lg:pt-3 pb-3">
          <h3 className="text-[15px] font-semibold text-white leading-snug mb-1 line-clamp-2">
            {video.title}
          </h3>
          
          <p className="text-[14px] text-white/90 leading-snug line-clamp-3 mb-3">
            {video.description || 'No description available.'}
          </p>

          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-5">
              <button onClick={onToggleLike} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <ThumbsUp size={18} fill={isLiked ? "#E53945" : "none"} className={isLiked ? "text-[#E53945]" : "text-white"} />
                <span className="text-[13px] font-medium">Like</span>
              </button>
              <button onClick={onOpenComments} className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <MessageCircle size={18} />
                <span className="text-[13px] font-medium">Comment</span>
              </button>
              <button className="flex items-center gap-1.5 text-white/90 hover:text-white transition">
                <Share2 size={18} />
                <span className="text-[13px] font-medium">Share</span>
              </button>
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
