"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, X, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { saveProgress, getProgress } from "@/lib/progress";

type Props = {
  src: string;
  title: string;
  videoId?: number;
  onClose: () => void;
};

export default function VideoPlayer({ src, title, videoId, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Detect if it's an HLS stream or a direct MP4
  const isHls = src.includes(".m3u8");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    } else {
      // Direct MP4 (or Safari native HLS)
      video.src = src;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, isHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setCurrent(video.currentTime);
      // Save every ~5 seconds
      if (videoId && video.duration) {
        const now = Math.floor(video.currentTime);
        if (now % 5 === 0) {
          saveProgress(videoId, now, video.duration);
        }
      }
    };
    const onMeta = () => {
      setDuration(video.duration);
      setLoading(false);
      // Resume from saved progress
      if (videoId) {
        const saved = getProgress(videoId);
        if (saved && saved.seconds > 5 && saved.seconds < video.duration - 10) {
          video.currentTime = saved.seconds;
        }
      }
    };
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("progress", onProgress);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") v.currentTime += 10;
      if (e.key === "ArrowLeft") v.currentTime -= 10;
      if (e.key === "m") { v.muted = !v.muted; setMuted(v.muted); }
      if (e.key === "f") toggleFullscreen();
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pokeControls = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
    pokeControls();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  };

  const skip = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s));
    pokeControls();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  };

  const fmt = (t: number) => {
    if (!t || isNaN(t)) return "0:00";
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={containerRef}
      onMouseMove={pokeControls}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
    >
      <video ref={videoRef} className="w-full h-full object-contain" onClick={togglePlay} playsInline />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="animate-spin text-white/70" size={60} />
        </div>
      )}

      <AnimatePresence>
        {!playing && !loading && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="bg-white/10 backdrop-blur rounded-full p-8 hover:bg-white/20 transition">
              <Play size={60} fill="white" className="text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 pointer-events-none flex flex-col justify-between"
          >
            <div className="pointer-events-auto flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
              <button onClick={onClose} className="text-white hover:text-white/70 transition">
                <X size={28} />
              </button>
              <h3 className="text-white font-semibold text-lg">{title}</h3>
              <div className="w-7" />
            </div>

            <div className="pointer-events-auto p-6 bg-gradient-to-t from-black/90 to-transparent">
              <div onClick={seek} className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group mb-4 hover:h-2 transition-all">
                <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full" style={{ width: `${bufferedPct}%` }} />
                <div className="absolute inset-y-0 left-0 bg-red-600 rounded-full" style={{ width: `${progress}%` }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition"
                  style={{ left: `calc(${progress}% - 8px)` }}
                />
              </div>

              <div className="flex items-center gap-4 text-white">
                <button onClick={togglePlay} className="hover:text-white/70 transition">
                  {playing ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
                </button>
                <button onClick={() => skip(-10)} className="hover:text-white/70 transition">
                  <SkipBack size={24} />
                </button>
                <button onClick={() => skip(10)} className="hover:text-white/70 transition">
                  <SkipForward size={24} />
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button onClick={toggleMute} className="hover:text-white/70 transition">
                    {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    value={muted ? 0 : volume}
                    onChange={changeVolume}
                    className="w-0 group-hover/vol:w-24 transition-all accent-red-600"
                  />
                </div>

                <span className="text-sm text-white/80 ml-2">
                  {fmt(current)} / {fmt(duration)}
                </span>

                <button onClick={toggleFullscreen} className="ml-auto hover:text-white/70 transition">
                  {fullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
