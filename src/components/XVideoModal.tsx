"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MoreHorizontal, Play, Pause, Volume2, VolumeX, MessageCircle, Heart, Bookmark, Share } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import TextOverlayRenderer from "@/components/TextOverlay";

export default function XVideoModal({
  video,
  author,
  onClose,
  onOpenComments
}: {
  video: any;
  author: any;
  onClose: () => void;
  onOpenComments: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Auto-play on open
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {
        // Browser blocked unmuted autoplay, force mute and try again
        if (videoRef.current) {
          videoRef.current.muted = true;
          setMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(p || 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] bg-black flex flex-col justify-center"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center pointer-events-auto text-white">
          <X size={20} />
        </button>
        <button className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center pointer-events-auto text-white">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Video Area */}
      <div className="relative w-full h-full flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={video.videoUrl ?? video.bitchuteUrl ?? ""}
          className="w-full h-full object-contain"
          loop
          playsInline
          onTimeUpdate={onTimeUpdate}
        />
        <TextOverlayRenderer overlays={video.textOverlays} />
        
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white">
              <Play size={30} fill="white" className="ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Overlay (Floating Text & Actions) */}
      <div className="absolute bottom-12 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-24 pb-4 px-4 pointer-events-none">

        {/* Author Row */}
        <div className="flex items-center gap-2 mb-2 pointer-events-auto">
          {author.avatar ? (
            <img src={author.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold flex-shrink-0">
              {author.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white flex items-center gap-1 truncate">
              {author.name} {author.verified && <VerifiedBadge size={14} />}
            </p>
            <p className="text-xs text-white/70 truncate">{author.handle}</p>
          </div>
        </div>

        {/* Caption */}
        {video.description && (
          <p className="text-sm text-white mb-3 line-clamp-3 pointer-events-auto">
            {video.description}
          </p>
        )}

        {/* Pill Action Bar */}
        <div className="flex items-center justify-around bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 pointer-events-auto">
          <button onClick={onOpenComments} className="flex items-center gap-1.5 text-white hover:text-white/80 transition">
            <MessageCircle size={20} />
          </button>
          <button className="flex items-center gap-1.5 text-white hover:text-white/80 transition">
            <Share size={20} />
          </button>
          <button className="flex items-center gap-1.5 text-white hover:text-white/80 transition">
            <Heart size={20} />
            <span className="text-xs font-semibold">1</span>
          </button>
          <button className="flex items-center gap-1.5 text-white hover:text-white/80 transition">
            <Bookmark size={20} />
          </button>
          <button className="flex items-center gap-1.5 text-white hover:text-white/80 transition">
            <Share size={20} />
          </button>
        </div>
      </div>

      {/* Video Controls (Very Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2 bg-black text-white">
        <button onClick={togglePlay} className="flex-shrink-0">
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>
        <button onClick={toggleMute} className="flex-shrink-0">
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </motion.div>
  );
}
