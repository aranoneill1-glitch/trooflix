"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
  textOverlays?: any[];
  poster?: string;
  feedVideos?: any[];
}

export default function AppleVideoPlayer({ 
  src, 
  onClose,
  poster
}: AppleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto-play when the player opens
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
    >
      {/* Floating Close Button - z-50 to sit above the video */}
      <button 
        onClick={onClose}
        className="absolute top-12 right-6 z-50 p-2.5 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition shadow-lg"
      >
        <X size={24} />
      </button>

      {/* NATIVE APPLE VIDEO PLAYER */}
      {/* By NOT using playsInline, iOS Safari will automatically hand off 
          the video to the native Apple player when fullscreen is triggered. */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        autoPlay
        controlsList="nodownload"
        className="w-full h-full object-contain"
      />
    </motion.div>
  );
}
