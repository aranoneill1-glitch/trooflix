"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, RotateCcw, RotateCw, Gauge, Moon, List, Check } from "lucide-react";
import TextOverlayRenderer from "@/components/TextOverlay";
import { AnimatePresence, motion } from "framer-motion";

type Chapter = { title: string; time: number };

export default function AppleVideoPlayer({
  src,
  poster,
  title,
  onClose,
  textOverlays,
  chapters = [],
}: {
  src: string;
  poster?: string;
  title: string;
  onClose: () => void;
  textOverlays?: any[];
  chapters?: Chapter[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Podcast State
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showChaptersMenu, setShowChaptersMenu] = useState(false);

  // Hide the bottom nav when player opens
  useEffect(() => {
    document.dispatchEvent(new Event("player-open"));
    return () => {
      document.dispatchEvent(new Event("player-close"));
    };
  }, []);

  // Media Session API (Background Audio)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || "Trooflix Audio", artist: "Trooflix", album: "Trooflix Podcasts",
      artwork: [{ src: poster || "/icon.png", sizes: "512x512", type: "image/png" }],
    });
    navigator.mediaSession.setActionHandler("play", () => { videoRef.current?.play(); setIsPlaying(true); });
    navigator.mediaSession.setActionHandler("pause", () => { videoRef.current?.pause(); setIsPlaying(false); });
    navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
    navigator.mediaSession.setActionHandler("seekto", (details) => { if (details.seekTime && videoRef.current) videoRef.current.currentTime = details.seekTime; });
  }, [title, poster]);

  // Sleep Timer Logic
  useEffect(() => {
    if (!sleepTimer) return;
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimer) {
        videoRef.current?.pause();
        setIsPlaying(false);
        setSleepTimer(null);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer]);

  useEffect(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    if (isPlaying && !showSpeedMenu && !showSleepMenu && !showChaptersMenu) {
      setShowControls(true);
      controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
    }
    return () => { if (controlsTimeout.current) clearTimeout(controlsTimeout.current); };
  }, [isPlaying, showSpeedMenu, showSleepMenu, showChaptersMenu]);

  const handleScreenTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('.menu-container')) return;
    setShowControls((prev) => {
      const next = !prev;
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (next && isPlaying) controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
      return next;
    });
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatRemaining = (time: number) => {
    if (isNaN(time)) return "-0:00";
    return `-${formatTime(duration - time)}`;
  };

  const togglePlay = () => { if (videoRef.current) { if (isPlaying) videoRef.current.pause(); else videoRef.current.play(); } };
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => { const time = Number(e.target.value); setCurrentTime(time); if (videoRef.current) videoRef.current.currentTime = time; };
  const skip = (amount: number) => { if (videoRef.current) videoRef.current.currentTime += amount; };
  const changeSpeed = (rate: number) => { setPlaybackRate(rate); if (videoRef.current) videoRef.current.playbackRate = rate; setShowSpeedMenu(false); };
  const setTimer = (minutes: number | null) => { if (minutes === null) setSleepTimer(null); else setSleepTimer(Date.now() + minutes * 60 * 1000); setShowSleepMenu(false); };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center select-none" onClick={handleScreenTap}>
      <video ref={videoRef} src={src} poster={poster} className="w-full h-full object-contain pointer-events-none" autoPlay playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
      />
      <TextOverlayRenderer overlays={textOverlays} />

      {/* TOP BAR */}
      <div className={`absolute top-0 left-0 right-0 z-50 p-6 pt-[env(safe-area-inset-top)] flex items-start justify-between transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        <button onClick={onClose} className="pointer-events-auto w-12 h-12 bg-[#1c1c1e]/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#1c1c1e] transition border border-white/10"><X size={24} /></button>
        <div className="flex items-center gap-2 pointer-events-auto">
          {sleepTimer && <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 flex items-center gap-1"><Moon size={12} /> Timer Active</div>}
          <button onClick={() => { if(videoRef.current) videoRef.current.muted = !isMuted; setIsMuted(!isMuted); }} className="w-12 h-12 bg-[#1c1c1e]/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#1c1c1e] transition border border-white/10">
            {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        </div>
      </div>

      {/* BOTTOM CONTROLS (Thumb-Friendly) */}
      <div className={`absolute bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-[env(safe-area-inset-bottom)] mb-4 transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}>
        
        {/* NEW: Playback Controls (Moved to bottom) */}
        <div className="pointer-events-auto flex items-center justify-center gap-8 mb-5">
          <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="w-14 h-14 bg-[#1c1c1e]/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#1c1c1e] transition border border-white/10 relative">
            <RotateCcw size={24} strokeWidth={1.5} /><span className="absolute text-[9px] font-bold mt-0.5">10</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-20 h-20 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition shadow-xl">
            {isPlaying ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" className="ml-1" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="w-14 h-14 bg-[#1c1c1e]/80 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-[#1c1c1e] transition border border-white/10 relative">
            <RotateCw size={24} strokeWidth={1.5} /><span className="absolute text-[9px] font-bold mt-0.5">10</span>
          </button>
        </div>

        {/* Toolbar (Speed, Sleep Timer, Chapters) */}
        <div className="pointer-events-auto flex items-center justify-center gap-2 mb-3 relative menu-container">
          <div className="relative">
            <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSleepMenu(false); setShowChaptersMenu(false); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border transition ${playbackRate !== 1 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-[#1c1c1e]/80 text-white/80 border-white/10"}`}>
              <Gauge size={16} /> {playbackRate}x
            </button>
            <AnimatePresence>
              {showSpeedMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                  {[1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <button key={rate} onClick={() => changeSpeed(rate)} className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 transition">{rate}x {playbackRate === rate && <Check size={14} className="text-blue-400" />}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button onClick={() => { setShowSleepMenu(!showSleepMenu); setShowSpeedMenu(false); setShowChaptersMenu(false); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border transition ${sleepTimer ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-[#1c1c1e]/80 text-white/80 border-white/10"}`}>
              <Moon size={16} /> Sleep
            </button>
            <AnimatePresence>
              {showSleepMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                  <button onClick={() => setTimer(null)} className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 transition">Off {sleepTimer === null && <Check size={14} className="text-blue-400" />}</button>
                  <button onClick={() => setTimer(15)} className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 transition">15 minutes</button>
                  <button onClick={() => setTimer(30)} className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 transition">30 minutes</button>
                  <button onClick={() => setTimer(45)} className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/10 transition">45 minutes</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {chapters.length > 0 && (
            <div className="relative">
              <button onClick={() => { setShowChaptersMenu(!showChaptersMenu); setShowSpeedMenu(false); setShowSleepMenu(false); }} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-[#1c1c1e]/80 text-white/80 border border-white/10 backdrop-blur-md">
                <List size={16} /> Chapters
              </button>
              <AnimatePresence>
                {showChaptersMenu && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full right-0 mb-2 w-64 max-h-60 overflow-y-auto bg-[#0f0f12]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 scrollbar-hide">
                    {chapters.map((ch, i) => (
                      <button key={i} onClick={() => { if(videoRef.current) videoRef.current.currentTime = ch.time; setShowChaptersMenu(false); }} className="w-full flex flex-col items-start px-4 py-2 hover:bg-white/10 transition border-b border-white/5 last:border-0">
                        <span className="text-sm font-semibold text-white">{ch.title}</span>
                        <span className="text-xs text-white/50">{formatTime(ch.time)}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Seek Bar */}
        <div className="pointer-events-auto w-full bg-[#1c1c1e]/80 backdrop-blur-md rounded-full px-5 py-4 flex items-center gap-4 border border-white/10 shadow-2xl">
          <span className="text-white text-sm font-medium tabular-nums tracking-wide">{formatTime(currentTime)}</span>
          <div className="relative flex-1 flex items-center h-4">
            <input type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek} className="w-full absolute inset-0 h-1 my-auto bg-white/20 rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full shadow-inner cursor-pointer z-10" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white rounded-full pointer-events-none" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
          </div>
          <span className="text-white/60 text-sm font-medium tabular-nums tracking-wide">{formatRemaining(currentTime)}</span>
        </div>
      </div>
    </div>
  );
}
