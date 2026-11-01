"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Comments from "@/components/Comments";

type Props = {
  videoId: number | null;
  open: boolean;
  onClose: () => void;
};

export default function CommentSheet({ videoId, open, onClose }: Props) {
  const [count, setCount] = useState(0);
  const [sortState, setSortState] = useState<{sort: string, setter: ((s: any) => void) | null}>({ sort: "newest", setter: null });

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && videoId !== null && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 h-[75dvh] bg-[#0a0303] rounded-t-3xl z-[410] flex flex-col shadow-2xl border-t border-white/10"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Drag handle */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 shrink-0 border-b border-white/5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Comments</h2>
                <span className="text-white/40 font-bold">·</span>
                <span className="text-white/60 text-sm font-bold">{count}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={sortState.sort}
                  onChange={(e) => sortState.setter && sortState.setter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#E53945]"
                >
                  <option value="newest">For you first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="top">Top comments</option>
                </select>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-white/70 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body — reuse existing Comments component */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 mt-4">
              <Comments 
                videoId={videoId} 
                onMetaChange={(c, s, setter) => {
                  setCount(c);
                  setSortState({ sort: s, setter: setter });
                }} 
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
