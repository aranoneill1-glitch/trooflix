"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

type Gif = {
  id: string;
  title: string;
  preview: string;
  full: string;
  width: number;
  height: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (gifUrl: string) => void;
};

export default function GifPicker({ open, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — empty query shows trending
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/giphy-search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) {
            setError(d.error);
            setGifs([]);
          } else {
            setGifs(d.gifs || []);
          }
        })
        .catch(() => setError("Couldn't load GIFs"))
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[400] bg-black/70"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 h-[75dvh] bg-black/60 rounded-t-3xl z-[401] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/20 overflow-hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Drag handle */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 shrink-0 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white">GIFs</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-white/70 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5">
                <Search size={16} className="text-white/50 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search GIFs"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/45"
                  style={{ fontSize: "16px" }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-white/50 hover:text-white"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 mt-4">
              {loading && gifs.length === 0 && (
                <p className="text-center text-white/50 text-sm py-12">
                  Loading…
                </p>
              )}

              {error && (
                <p className="text-center text-red-400 text-sm py-12">
                  {error}
                </p>
              )}

              {!loading && gifs.length === 0 && !error && (
                <p className="text-center text-white/50 text-sm py-12">
                  {query ? "No results" : "Start typing to search"}
                </p>
              )}

              <div className="columns-2 gap-2 [column-fill:_balance]">
                {gifs.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onPick(g.full);
                      onClose();
                    }}
                    className="mb-2 w-full rounded-lg overflow-hidden hover:opacity-80 transition break-inside-avoid"
                  >
                    <img
                      src={g.preview}
                      alt={g.title}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-white/10 text-center">
              <p className="text-[10px] text-white/40">
                Powered by GIPHY
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
