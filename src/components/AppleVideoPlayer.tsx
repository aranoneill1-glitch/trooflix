"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Play, Pause, RotateCcw, RotateCw, 
  Settings, ChevronLeft, ThumbsUp, ThumbsDown, 
  Send, MessageCircle
} from "lucide-react";
import { motion } from "framer-motion";

interface AppleVideoPlayerProps {
  src: string;
  title?: string;
  creatorName?: string;
  creatorPhoto?: string;
  views?: string;
  timeAgo?: string;
  onClose: () => void;
  chapters?: { title: string; time: number }[];
  textOverlays?: any[]; // Added to satisfy existing app props
  poster?: string;      // Added to satisfy existing app props
}

export default function AppleVideoPlayer({ 
  src, 
  title = "Untitled Video", 
  creatorName = "Creator", 
  creatorPhoto = "", 
  views = "0 views", 
  timeAgo = "Just now", 
  onClose,
  chapters = [],
  textOverlays,
  poster
}: AppleVideoPlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);
  
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
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
      }, 3000);
    }
  };

  useEffect(() => {
    handleInteraction();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    
    if (v.paused) {
      try {
        await v.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed", err);
      }
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const skip = (amount: number) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + amount));
      handleInteraction();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen for fullscreen changes (e.g., if user presses ESC)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
    setCurrentTime(formatTime(v.currentTime));
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(formatTime(v.duration));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const newTime = (Number(e.target.value) / 100) * v.duration;
    v.currentTime = newTime;
    setProgress(Number(e.target.value));
  };

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 50 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 50 }} 
      className={`fixed inset-0 z-[200] flex flex-col ${isFullscreen ? 'bg-black' : 'bg-[#0a0a0a]'} overflow-y-auto`}
    >
      {/* ================= VIDEO SECTION ================= */}
      <div 
        className="relative w-full aspect-video bg-black flex-shrink-0 group"
        onClick={() => { handleInteraction(); togglePlay(); }}
        onMouseMove={handleInteraction}
        onTouchStart={handleInteraction}
      >
        {/* Fallback poster if passed */}
        {poster && !isPlaying && (
          <img src={poster} alt="" className="absolute inset-0 w-full h-full object-contain -z-10" />
        )}

        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          playsInline
          poster={poster}
          onClick={(e) => e.stopPropagation()} // Let parent handle clicks
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setError(true)}
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-white/50 text-sm">Video failed to load.</p>
          </div>
        )}

        {/* TOP BAR (Back & Settings) */}
        <div className={`absolute top-0 inset-x-0 p-4 pt-safe bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="p-2 -ml-2 text-white hover:text-white/80 transition"
          >
            <ChevronLeft size={28} />
          </button>
          <button 
            onClick={(e) => e.stopPropagation()} 
            className="p-2 -mr-2 text-white hover:text-white/80 transition"
          >
            <Settings size={24} />
          </button>
        </div>

        {/* CENTER CONTROLS (Play, Skip) */}
        <div className={`absolute inset-0 flex items-center justify-center gap-10 z-20 pointer-events-none transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <button 
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="pointer-events-auto text-white hover:scale-110 transition drop-shadow-lg"
          >
            <RotateCcw size={36} fill="white" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="pointer-events-auto text-white hover:scale-110 transition drop-shadow-xl"
          >
            {isPlaying ? <Pause size={64} fill="white" /> : <Play size={64} fill="white" className="ml-2" />}
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="pointer-events-auto text-white hover:scale-110 transition drop-shadow-lg"
          >
            <RotateCw size={36} fill="white" />
          </button>
        </div>

        {/* BOTTOM SEEK BAR */}
        <div 
          className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-white/90 text-sm font-medium mb-2 px-1">
            <span>{currentTime}</span>
            <span>{duration}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#E53945] hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #E53945 ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
            }}
          />
        </div>
      </div>

      {/* ================= DETAILS SECTION (Below Video) ================= */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        
        {/* Creator Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1c1c1e] flex-shrink-0 border border-white/10">
            {creatorPhoto ? (
              <img src={creatorPhoto} alt={creatorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#E53945] flex items-center justify-center font-bold text-white">
                {creatorName[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight mb-1">
              {title}
            </h1>
            <p className="text-sm text-white/60">
              <span className="font-semibold text-white/80">{creatorName}</span> • {views} • {timeAgo}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 mb-8">
          <button className="flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-white text-sm font-medium transition">
            <ThumbsUp size={18} /> 16.5K
          </button>
          <button className="flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-white text-sm font-medium transition">
            <ThumbsDown size={18} /> 1.5K
          </button>
          <button className="flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-white text-sm font-medium transition">
            <Send size={18} /> Share
          </button>
          <button className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d32f3a] px-4 py-2 rounded-full text-white text-sm font-medium transition">
            <MessageCircle size={18} fill="currentColor" /> Chat
          </button>
        </div>

        {/* Top Video / Related Content Placeholder */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Top Video</h2>
          <div className="flex flex-col gap-4">
            {/* Placeholder for related videos */}
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4 cursor-pointer group">
                <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="flex-1 py-1">
                  <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-white/80 transition">
                    Placeholder Related Video Title {i}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">Creator Name</p>
                  <p className="text-xs text-white/50">5.3 M views • 7 months ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fullscreen Toggle Button (Floating on bottom right if not fullscreen) */}
        {!isFullscreen && (
          <button 
            onClick={toggleFullscreen}
            className="fixed bottom-6 right-6 bg-[#E53945] text-white p-4 rounded-full shadow-2xl hover:scale-105 transition z-50 flex items-center gap-2 font-bold"
          >
            <RotateCw size={20} /> Fullscreen
          </button>
        )}
      </div>
    </motion.div>
  );
}
