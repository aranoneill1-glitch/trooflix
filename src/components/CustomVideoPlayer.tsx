"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Airplay, Volume2, VolumeX, RotateCcw, RotateCw, Play, Pause } from "lucide-react";
import { useRouter } from "next/navigation";

interface PlayerProps {
  src: string;
  poster?: string;
  onClose?: () => void;
}

export default function CustomVideoPlayer({ src, poster, onClose }: PlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 3 seconds of inactivity
  const handleInteraction = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    handleInteraction();
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
    handleInteraction();
  };

  const handleSpeedChange = (newSpeed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = newSpeed;
    setSpeed(newSpeed);
    setShowSpeedMenu(false);
    handleInteraction();
  };

  const handleAirplay = () => {
    if (videoRef.current && (videoRef.current as any).webkitShowPlaybackTargetPicker) {
      (videoRef.current as any).webkitShowPlaybackTargetPicker();
    } else {
      alert("AirPlay is not supported on this browser (iOS/Safari only).");
    }
    handleInteraction();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
    handleInteraction();
  };

  const skip = (amount: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += amount;
    handleInteraction();
  };

  useEffect(() => {
    let active = true;
    const update = () => {
      if (!active) return;
      if (videoRef.current && !isScrubbing) {
        const current = videoRef.current.currentTime;
        const total = videoRef.current.duration || 1;
        setCurrentTime(current);
        setDuration(total);
        setProgress((current / total) * 100);
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
    return () => { active = false; };
  }, [isScrubbing]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = Number(e.target.value);
    const total = videoRef.current.duration || 1;
    const seekTo = (val / 100) * total;
    videoRef.current.currentTime = seekTo;
    setProgress(val);
    setCurrentTime(seekTo); // Smoothly update text while dragging
    handleInteraction();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0 || duration >= 3600) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center" onMouseMove={handleInteraction} onTouchStart={handleInteraction}>
      
      {/* Native Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        playsInline
        x-webkit-airplay="allow"
        onClick={togglePlay}
        onVolumeChange={() => setIsMuted(videoRef.current?.muted || false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain"
      />

      {/* UI Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="absolute inset-0 z-10 pointer-events-none"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex gap-4">
                <button onClick={() => onClose ? onClose() : router.back()} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                  <X size={24} />
                </button>
                <button onClick={handleAirplay} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                  <Airplay size={24} />
                </button>
              </div>
              <button onClick={toggleMute} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>

            {/* Center Playback Controls */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8 pointer-events-auto">
              <button onClick={() => skip(-10)} className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                <RotateCcw size={32} />
                <span className="absolute text-[10px] font-bold mt-1">10</span>
              </button>
              
              <button onClick={togglePlay} className="w-24 h-24 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                {isPlaying ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-2" />}
              </button>

              <button onClick={() => skip(10)} className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
                <RotateCw size={32} />
                <span className="absolute text-[10px] font-bold mt-1">10</span>
              </button>
            </div>

            {/* Bottom Right Settings & Speed */}
            <div className="absolute bottom-28 right-6 pointer-events-auto flex flex-col items-end gap-3">
              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 mb-1"
                  >
                    {[1, 1.25, 1.5, 2].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => handleSpeedChange(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition ${speed === s ? "bg-white/20 text-white" : "text-white/60 hover:text-white"}`}
                      >
                        {s}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); handleInteraction(); }} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition text-sm font-bold">
                {speed}x
              </button>
            </div>

            {/* Bottom Timeline */}
            <div className="absolute bottom-8 left-6 right-6 pointer-events-auto flex items-center gap-4">
              <span className="text-xs font-medium text-white/80 w-12 text-right">{formatTime(currentTime)}</span>
              
              <div className="relative flex-1 h-8 flex items-center group">
                <input 
                  type="range" min="0" max="100" value={progress} onChange={handleSeek}
                  className="absolute w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer outline-none z-20 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full
                    [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full"
                />
                {/* Custom Fill for timeline */}
                <div className="absolute h-2 bg-white rounded-full z-10 pointer-events-none" style={{ width: `${progress}%` }} />
              </div>

              <span className="text-xs font-medium text-white/80 w-16">-{formatTime(duration - currentTime)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
