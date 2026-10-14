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
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed left-0 right-0 bottom-0 top-20 md:top-24 md:left-auto md:right-4 md:bottom-4 md:w-[420px] z-[401] bg-[#0f0f12] border-t md:border border-white/10 rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-2 focus-within:border-white/30 transition">
                <Search size={16} className="text-white/50 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search GIFs"
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40"
                  style={{ fontSize: "16px" }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-white/50 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-2">
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
