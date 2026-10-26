"use client";
import { useRef } from "react";

export default function VideoThumbnail({ src, className, poster }: { src: string; className?: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={className}
      preload="metadata"
      muted
      playsInline
      onLoadedData={(e) => {
        // This is the magic fix. It forces the browser to render the video frame instantly.
        const video = e.currentTarget;
        if (video.currentTime === 0) {
          video.currentTime = 0.1;
        }
      }}
    />
  );
}
