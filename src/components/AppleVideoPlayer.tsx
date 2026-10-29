"use client";

import { useEffect, useRef } from "react";

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
    const v = videoRef.current;
    if (!v) return;

    // Auto-play in the background so it's ready when native fullscreen opens
    v.play().catch(() => {});

    // Listen for when the user exits native fullscreen to close the player
    const handleEndFullscreen = () => {
      onClose();
    };

    v.addEventListener("webkitendfullscreen", handleEndFullscreen);
    document.addEventListener("fullscreenchange", handleEndFullscreen);

    // Give it a tiny delay to ensure the DOM is painted before we try to go fullscreen
    const timer = setTimeout(() => {
      // @ts-ignore
      if (v.webkitEnterFullscreen) {
        // @ts-ignore
        v.webkitEnterFullscreen();
      } else if (v.requestFullscreen) {
        v.requestFullscreen().catch(() => {});
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      v.removeEventListener("webkitendfullscreen", handleEndFullscreen);
      document.removeEventListener("fullscreenchange", handleEndFullscreen);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        controls
        className="w-full h-full object-contain"
      />
    </div>
  );
}
