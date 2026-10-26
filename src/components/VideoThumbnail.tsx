"use client";
import { useEffect, useRef } from "react";

export default function VideoThumbnail({ src, className, poster }: { src: string; className?: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      // Force the browser to seek slightly into the video to render the actual frame
      if (video.currentTime < 0.1) {
        video.currentTime = 0.1;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={className}
      preload="metadata"
      muted
      playsInline
    />
  );
}
