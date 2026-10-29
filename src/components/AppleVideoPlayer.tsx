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

    // 1. Force native iOS fullscreen immediately
    // @ts-ignore - webkitEnterFullscreen is a valid iOS Safari method
    if (v.webkitEnterFullscreen) {
      // @ts-ignore
      v.webkitEnterFullscreen();
    } else if (v.requestFullscreen) {
      v.requestFullscreen().catch(() => {});
    }

    // 2. Auto-play
    v.play().catch(() => {});

    // 3. Listen for when the user exits native fullscreen
    const handleFullscreenChange = () => {
      // If we are no longer in fullscreen, close the player and return to feed
      if (!document.fullscreenElement) {
        onClose();
      }
    };

    // iOS specific native exit event
    const handleEndFullscreen = () => {
      onClose();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    v.addEventListener("webkitendfullscreen", handleEndFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      v.removeEventListener("webkitendfullscreen", handleEndFullscreen);
    };
  }, [onClose]);

  return (
    // We render an absolute full-screen black background just in case the native 
    // player takes a split second to load.
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline // Required for the browser to render it, but iOS will override when we call webkitEnterFullscreen
        controls
        className="w-full h-full object-contain"
      />
    </div>
  );
}
