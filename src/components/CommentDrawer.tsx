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
            className="fixed left-0 right-0 bottom-0 z-[301] bg-[#0f0f12] md:max-w-2xl md:mx-auto rounded-t-2xl"
            style={{ height: "78vh", maxHeight: "78vh" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-center px-4 py-3 border-b border-white/10">
              <h2 className="text-base font-bold">Comments</h2>
              <button
                onClick={onClose}
                className="absolute right-3 w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Comments body — scrolls */}
            <div
              className="overflow-y-auto"
              style={{ height: "calc(78vh - 64px)" }}
            >
              <Comments videoId={videoId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
