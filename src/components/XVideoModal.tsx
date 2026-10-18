"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import TextOverlayRenderer from "@/components/TextOverlay";

export default function XVideoModal({
  video,
  onClose,
}: {
  video: any;
  author?: any;
  onClose: () => void;
  onOpenComments?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

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
          onClick={(e) => {
            const v = e.currentTarget;
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
        />
        <TextOverlayRenderer overlays={video.textOverlays} />
      </div>
    </motion.div>
  );
}
