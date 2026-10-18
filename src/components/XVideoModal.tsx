"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import TextOverlayRenderer from "@/components/TextOverlay";

export default function XVideoModal({
  video,
  startTime = 0,
  onClose,
}: {
  video: any;
  startTime?: number;
  author?: any;
  onClose: () => void;
  onOpenComments?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  // Pause all other videos on the page
  useEffect(() => {
    const all = document.querySelectorAll<HTMLVideoElement>("video");
    all.forEach((el) => {
      if (el !== videoRef.current && !el.paused) el.pause();
    });
  }, []);

  // Auto-play with sound on open
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => {
      // Browser blocked unmuted autoplay — fall back to muted
      if (videoRef.current) {
        videoRef.current.muted = true;
        setMuted(true);
        videoRef.current.play().catch(() => {});
      }
    });
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Seek to a position given a client X coordinate
  const seekFromClientX = (clientX: number) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setProgress(ratio);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
    >
      {/* Back arrow */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur hover:bg-black/70 flex items-center justify-center text-white transition"
        aria-label="Back"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Video only — no overlays, no action bar */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={video.videoUrl ?? video.bitchuteUrl ?? ""}
          className="w-full h-full object-contain"
          loop
          playsInline
          muted={muted}
          onLoadedMetadata={(e) => {
            // Seek to where the feed video was
            if (startTime > 0) {
              const v = e.currentTarget;
              const target = Math.min(startTime, v.duration - 0.1 || startTime);
              v.currentTime = target;
            }
          }}
          onTimeUpdate={(e) => {
            if (scrubbing) return;
            const v = e.currentTarget;
            if (v.duration && isFinite(v.duration)) {
              setProgress(v.currentTime / v.duration);
            }
          }}
          onClick={(e) => {
            const v = e.currentTarget;
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
        />
        <TextOverlayRenderer overlays={video.textOverlays} />

        {/* Seek bar — bottom of screen */}
        <div
          ref={progressBarRef}
          onClick={(e) => { e.stopPropagation(); seekFromClientX(e.clientX); }}
          onTouchStart={(e) => { e.stopPropagation(); setScrubbing(true); seekFromClientX(e.touches[0].clientX); }}
          onTouchMove={(e) => { e.stopPropagation(); if (scrubbing) seekFromClientX(e.touches[0].clientX); }}
          onTouchEnd={(e) => { e.stopPropagation(); setScrubbing(false); }}
          onMouseDown={(e) => { e.stopPropagation(); setScrubbing(true); seekFromClientX(e.clientX); }}
          onMouseMove={(e) => { if (scrubbing) { e.stopPropagation(); seekFromClientX(e.clientX); } }}
          onMouseUp={() => setScrubbing(false)}
          onMouseLeave={() => setScrubbing(false)}
          className="absolute bottom-0 left-0 right-0 z-40 h-6 flex items-end cursor-pointer pb-[env(safe-area-inset-bottom)]"
          style={{ pointerEvents: "auto" }}
        >
          <div className="w-full h-[3px] bg-white/25 relative">
            <div
              className="h-full bg-white"
              style={{
                width: `${progress * 100}%`,
                transition: scrubbing ? "none" : "width 0.2s linear",
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
