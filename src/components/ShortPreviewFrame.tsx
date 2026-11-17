"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src?: string;
  poster?: string;
  alt: string;
  autoplay?: boolean;
};

export default function ShortPreviewFrame({ src, poster, alt, autoplay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) {
        setShouldLoad(true);
      }
    }, { rootMargin: "120px", threshold: 0.15 });

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || !shouldLoad) return;
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      video.play().then(() => setHasFrame(true)).catch(() => {});
    } else {
      video.pause();
    }
  }, [autoplay, shouldLoad, inView]);

  const seekToOpeningFrame = (video: HTMLVideoElement) => {
    if (autoplay) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const frameTime = Math.min(0.12, video.duration / 2);
    if (frameTime === 0) {
      setHasFrame(true);
      return;
    }
    video.currentTime = frameTime;
  };

  if (!src) {
    return poster ? <img src={poster} alt={alt} className="absolute inset-0 h-full w-full object-cover" /> : null;
  }

  return (
    <>
      {poster && <img src={poster} alt={alt} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${hasFrame ? "opacity-0" : "opacity-100"}`} />}
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-hidden="true"
        onLoadedMetadata={(event) => seekToOpeningFrame(event.currentTarget)}
        onSeeked={() => { if (!autoplay) setHasFrame(true); }}
        onPlaying={() => setHasFrame(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </>
  );
}
