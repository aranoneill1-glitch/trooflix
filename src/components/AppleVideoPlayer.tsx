"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX } from "lucide-react";
import TextOverlayRenderer from "@/components/TextOverlay";

export default function AppleVideoPlayer({
  src,
  poster,
  title,
  onClose,
  textOverlays,
}: {
  src: string;
  poster?: string;
  title: string;
  onClose: () => void;
  textOverlays?: any[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls when playing
  useEffect(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);

    if (isPlaying) {
      setShowControls(true);
      controlsTimeout.current = setTimeout(() => setShowControls(false), 1000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [isPlaying]);

  const handleScreenTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    setShowControls((prev) => {
      const next = !prev;
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (next && isPlaying) {
        controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
      }
      return next;
    });
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatRemaining = (time: number) => {
    if (isNaN(time)) return "-0:00";
    const rem = duration - time;
    const m = Math.floor(rem / 60);
    const s = Math.floor(rem % 60);
    return `-${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const skip = (amount: number) => {
    if (videoRef.current) videoRef.current.currentTime += amount;
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center select-none"
      onClick={handleScreenTap}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain pointer-events-none"
        autoPlay
        playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <TextOverlayRenderer overlays={textOverlays} />

      {/* TOP BAR */}
      <div className={`absolute top-0 left-0 right-0 z-50 p-6 pt-[env(safe-area-inset-top)] flex items-start justify-between transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        <button onClick={onClose} className="pointer-events-auto relative w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
          <div className="absolute inset-0 rounded-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10" />
          <X size={24} className="relative z-10" />
        </button>
        <button 
          onClick={() => { if(videoRef.current) videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }} 
          className="pointer-events-auto relative w-12 h-12 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <div className="absolute inset-0 rounded-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10" />
          {isMuted ? <VolumeX size={22} className="relative z-10" /> : <Volume2 size={22} className="relative z-10" />}
        </button>
      </div>

      {/* CENTER CONTROLS (Fixed iOS Blur Bug) */}
      <div className={`absolute inset-0 z-40 flex items-center justify-center gap-6 transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        
        {/* Rewind 10s */}
        <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="pointer-events-auto relative w-[72px] h-[72px] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
          <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_0_rgba(255,255,255,0.2)]" />
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
            <path d="M12 5V2L7 6.5L12 11V8C15.31 8 18 10.69 18 14C18 17.31 15.31 20 12 20C8.69 20 6 17.31 6 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="12" y="16" fontSize="7.5" fontWeight="bold" fill="currentColor" textAnchor="middle" stroke="none">10</text>
          </svg>
        </button>
        
        {/* Play / Pause */}
        <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="pointer-events-auto relative w-[88px] h-[88px] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
          <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_0_rgba(255,255,255,0.2)]" />
          {isPlaying ? (
            <Pause size={40} fill="white" strokeWidth={0} className="relative z-10" />
          ) : (
            <Play size={40} fill="white" strokeWidth={0} className="ml-1.5 relative z-10" />
          )}
        </button>
        
        {/* Forward 10s */}
        <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="pointer-events-auto relative w-[72px] h-[72px] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform">
          <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_1px_0_rgba(255,255,255,0.2)]" />
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
            <path d="M12 5V2L17 6.5L12 11V8C8.69 8 6 10.69 6 14C6 17.31 8.69 20 12 20C15.31 20 18 17.31 18 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="12" y="16" fontSize="7.5" fontWeight="bold" fill="currentColor" textAnchor="middle" stroke="none">10</text>
          </svg>
        </button>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 p-6 pb-[env(safe-area-inset-bottom)] mb-6 transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        
        {/* Glass Time Pill Bar */}
        <div className="pointer-events-auto relative w-full rounded-full px-5 py-4 flex items-center gap-4 overflow-hidden">
          <div className="absolute inset-0 rounded-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 shadow-2xl" />
          
          <span className="relative z-10 text-white text-sm font-medium tabular-nums tracking-wide">
            {formatTime(currentTime)}
          </span>
          
          <div className="relative z-10 flex-1 flex items-center h-4">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full absolute inset-0 h-1 my-auto bg-white/20 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full shadow-inner cursor-pointer z-10"
            />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white rounded-full pointer-events-none" 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>

          <span className="relative z-10 text-white/60 text-sm font-medium tabular-nums tracking-wide">
            {formatRemaining(currentTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
