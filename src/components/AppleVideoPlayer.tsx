"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import VideoIntro from "@/components/VideoIntro";

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
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const v = videoRef.current;
    if (!v) return;

    // 1. Start buffering the video immediately in the background
    v.play().catch(() => {});

    // 2. Listen for when the user exits native fullscreen to close the player
    const handleEndFullscreen = () => {
      onClose();
    };

    v.addEventListener("webkitendfullscreen", handleEndFullscreen);
    document.addEventListener("fullscreenchange", handleEndFullscreen);

    return () => {
      v.removeEventListener("webkitendfullscreen", handleEndFullscreen);
      document.removeEventListener("fullscreenchange", handleEndFullscreen);
    };
  }, [mounted, onClose]);

  const handleIntroDone = () => {
    setShowIntro(false);
    const v = videoRef.current;
    if (!v) return;

    // 3. Now that the intro is done, trigger native fullscreen.
    // Because the video has been buffering for 1.5s, it will open instantly.
    // @ts-ignore
    if (v.webkitEnterFullscreen) {
      // @ts-ignore
      v.webkitEnterFullscreen();
    } else if (v.requestFullscreen) {
      v.requestFullscreen().catch(() => {});
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        controls
        className="w-full h-full object-contain"
      />
      
      {/* Play the intro on top of the buffering video */}
      {showIntro && (
        <div className="absolute inset-0 z-[10000]">
          <VideoIntro onDone={handleIntroDone} />
        </div>
      )}
    </div>,
    document.body
  );
}
