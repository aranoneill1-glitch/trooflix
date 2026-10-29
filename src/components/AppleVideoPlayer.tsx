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
  title = "Untitled Video", 
  onClose,
  poster
}: AppleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play on mount
  useEffect(() => {
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
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 z-50 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition"
      >
        <X size={24} />
      </button>

      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    </motion.div>
  );
}
