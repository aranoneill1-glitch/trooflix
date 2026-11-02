"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import VideoIntro from "@/components/VideoIntro";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";

interface AppleVideoPlayerProps {
  src: string;
  onClose: () => void;
  poster?: string;
  title?: string;
  creatorName?: string;
  creatorPhoto?: string;
  views?: string;
  timeAgo?: string;
  chapters?: { title: string; time: number }[];
  textOverlays?: any[];
  feedVideos?: any[];
}

export default function AppleVideoPlayer({ src, onClose, poster }: AppleVideoPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <CustomVideoPlayer src={src} poster={poster} onClose={onClose} />
      
      {showIntro && (
        <div className="absolute inset-0 z-[10000]">
          <VideoIntro onDone={() => setShowIntro(false)} />
        </div>
      )}
    </div>,
    document.body
  );
}
