"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Comments from "@/components/Comments";

type Props = {
  videoId: number | null;
  title?: string;
  onClose: () => void;
};

export default function CommentDrawer({ videoId, title, onClose }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (videoId === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [videoId, onClose]);

  return (
    <AnimatePresence>
      {videoId !== null && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[300] bg-black/70"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="fixed left-0 right-0 bottom-0 z-[301] bg-[#0f0f12] border-t border-white/10 rounded-t-2xl md:max-w-2xl md:mx-auto"
            style={{ height: "82vh", maxHeight: "82vh" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <div className="min-w-0">
                <h2 className="text-base font-bold">Comments</h2>
                {title && (
                  <p className="text-xs text-white/50 truncate">{title}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Comments body — scrolls */}
            <div
              className="overflow-y-auto px-2 pb-6"
              style={{ height: "calc(82vh - 88px)" }}
            >
              <Comments videoId={videoId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
