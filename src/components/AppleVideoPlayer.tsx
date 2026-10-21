"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw } from "lucide-react";
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

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => {
    handleMouseMove();
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [isPlaying]);

  // Format time (e.g., 1:24)
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const skip = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onClick={handleMouseMove}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
      />

      <TextOverlayRenderer overlays={textOverlays} />

      {/* TOP BAR */}
      <div className={`absolute top-0 left-0 right-0 p-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur">
          <X size={24} />
        </button>
        <span className="text-white font-semibold text-sm drop-shadow-md truncate max-w-[70%]">{title}</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* CENTER CONTROLS */}
      <div className={`absolute inset-0 flex items-center justify-center gap-12 transition-opacity duration-300 pointer-events-none ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}>
        <button onClick={() => skip(-15)} className="pointer-events-auto p-4 bg-black/40 rounded-full backdrop-blur text-white hover:bg-black/60 transition">
          <RotateCcw size={32} />
        </button>
        <button onClick={togglePlay} className="pointer-events-auto p-5 bg-black/40 rounded-full backdrop-blur text-white hover:bg-black/60 transition">
          {isPlaying ? <Pause size={48} fill="white" /> : <Play size={48} fill="white" className="ml-2" />}
        </button>
        <button onClick={() => skip(15)} className="pointer-events-auto p-4 bg-black/40 rounded-full backdrop-blur text-white hover:bg-black/60 transition">
          <RotateCw size={32} />
        </button>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className={`absolute bottom-0 left-0 right-0 p-4 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        
        {/* Scrubber */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-white/80 font-medium w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-white/30 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full shadow-inner cursor-pointer"
          />
          <span className="text-xs text-white/80 font-medium w-10">{formatTime(duration)}</span>
        </div>

        {/* Bottom Action Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-white/80 transition">
              {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
            </button>
            <button onClick={() => { if(videoRef.current) videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }} className="text-white hover:text-white/80 transition">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
          
          <button 
            onClick={() => {
              if (videoRef.current) {
                if (document.fullscreenElement) document.exitFullscreen();
                else videoRef.current.requestFullscreen();
              }
            }} 
            className="text-white hover:text-white/80 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
