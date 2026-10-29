"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

  // Ensure we only render the portal on the client side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const v = videoRef.current;
    if (!v) return;

    // 1. Play the video immediately
    v.play().catch(() => {});

    // 2. IMMEDIATELY trigger native fullscreen (synchronously, no delay)
    // We do this right on mount so iOS registers it as part of the original tap.
    // @ts-ignore
    if (v.webkitEnterFullscreen) {
      // @ts-ignore
      v.webkitEnterFullscreen();
    } else if (v.requestFullscreen) {
      v.requestFullscreen().catch(() => {});
    }

    // 3. Listen for when the user exits native fullscreen to close the player
    const handleEndFullscreen = () => {
      onClose();
    };

    // iOS event and standard event
    v.addEventListener("webkitendfullscreen", handleEndFullscreen);
    document.addEventListener("fullscreenchange", handleEndFullscreen);

    return () => {
      v.removeEventListener("webkitendfullscreen", handleEndFullscreen);
      document.removeEventListener("fullscreenchange", handleEndFullscreen);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  // Use a portal to attach the video directly to the document body.
  // This bypasses any layout issues from parent containers.
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
    </div>,
    document.body
  );
}
