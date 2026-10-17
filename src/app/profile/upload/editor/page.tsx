"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fontStyle, type TextOverlay } from "@/components/TextOverlay";

export default function EditorPage() {
  const router = useRouter();

  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [duration, setDuration] = useState<number | null>(null);

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [editingOverlay, setEditingOverlay] = useState<string | null>(null);
  const [showTextSheet, setShowTextSheet] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setVideoUrl(params.get("v") || "");
    setPosterUrl(params.get("p") || "");
    const d = params.get("d");
    setDuration(d ? Number(d) : null);
    const t = params.get("t");
    if (t) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) setTextOverlays(parsed);
      } catch {}
    }
  }, []);

  const goNext = () => {
    const params = new URLSearchParams({
      v: videoUrl,
      p: posterUrl,
      d: duration !== null ? String(Math.round(duration)) : "",
      t: JSON.stringify(textOverlays),
    });
    router.push(`/profile/upload/details?${params.toString()}`);
  };

  const addTextOverlay = () => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setTextOverlays((prev) => [
      ...prev,
      { id, text: "Tap to edit", x: 0.5, y: 0.4, size: "md", color: "#ffffff", font: "classic" },
    ]);
    setEditingOverlay(id);
    setShowTextSheet(true);
  };

  const removeOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    if (editingOverlay === id) setEditingOverlay(null);
  };

  const startDrag = (e: React.PointerEvent, o: TextOverlay) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingOverlay(o.id);
    dragRef.current = {
      id: o.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: o.x,
      origY: o.y,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) d.moved = true;
    const x = Math.max(0.05, Math.min(0.95, d.origX + dx));
    const y = Math.max(0.05, Math.min(0.95, d.origY + dy));
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === d.id ? { ...o, x, y } : o))
    );
  };

  const endDrag = () => {
    if (dragRef.current && !dragRef.current.moved) {
      setShowTextSheet(true);
    }
    dragRef.current = null;
  };

  if (!videoUrl) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Missing video. Go back and upload.</p>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          ref={previewRef}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative bg-black select-none h-full"
          style={{ aspectRatio: "9 / 16", maxWidth: "100vw" }}
        >
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
          />

          {textOverlays.map((o) => {
            const fs = fontStyle(o.font);
            const sizeClass =
              o.size === "sm" ? "text-sm" : o.size === "lg" ? "text-2xl" : "text-lg";
            return (
              <div
                key={o.id}
                onPointerDown={(e) => startDrag(e, o)}
                className={`absolute whitespace-pre-wrap leading-tight cursor-move select-none ${sizeClass} ${editingOverlay === o.id ? "ring-2 ring-red-500/60 rounded px-1" : ""}`}
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  color: o.color || "#ffffff",
                  textShadow: "0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
                  maxWidth: "90%",
                  wordBreak: "break-word",
                  touchAction: "none",
                  ...fs,
                }}
              >
                {o.text}
              </div>
            );
          })}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 pointer-events-none">
          <button
            onClick={() => router.push("/profile/upload")}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 flex items-center justify-center transition pointer-events-auto"
            aria-label="Close"
          >
            <X size={22} />
          </button>

          <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur flex items-center gap-2 pointer-events-auto">
            <span className="text-xs font-semibold text-white/80">Editor</span>
          </div>

          <button
            onClick={goNext}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition pointer-events-auto"
            aria-label="Next"
          >
            <span className="text-xl leading-none">→</span>
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent pt-6 pb-3 px-2">
        <div className="flex justify-around items-center mb-2">
          <button
            onClick={addTextOverlay}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10 transition"
          >
            <span className="text-lg font-serif">Aa</span>
            <span className="text-[10px] text-white/80">Text</span>
          </button>
        </div>
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-xs text-white/50">Add text to your reel</span>
          <button
            onClick={goNext}
            className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-sm font-semibold flex items-center gap-1.5"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Text controls sheet */}
      <AnimatePresence>
        {showTextSheet && editingOverlay && (() => {
          const o = textOverlays.find((x) => x.id === editingOverlay);
          if (!o) return null;
          const set = (patch: Partial<TextOverlay>) =>
            setTextOverlays((prev) =>
              prev.map((x) => (x.id === o.id ? { ...x, ...patch } : x))
            );
          const FONTS: { key: TextOverlay["font"]; label: string }[] = [
            { key: "classic", label: "Classic" },
            { key: "strong", label: "Strong" },
            { key: "serif", label: "Serif" },
            { key: "mono", label: "Typewriter" },
            { key: "neon", label: "Neon" },
            { key: "outline", label: "Outline" },
          ];
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTextSheet(false)}
                className="fixed inset-0 z-[400] bg-black/60"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className="fixed left-0 right-0 bottom-0 z-[401] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4 max-h-[75vh] overflow-y-auto"
              >
                <div className="flex justify-center pt-2.5">
                  <div className="w-10 h-1 rounded-full bg-white/25" />
                </div>

                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                  <h2 className="text-base font-bold">Text</h2>
                  <button
                    onClick={() => setShowTextSheet(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                      Text
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={o.text}
                        onChange={(e) => set({ text: e.target.value })}
                        maxLength={80}
                        autoFocus
                        className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600"
                      />
                      <button
                        onClick={() => setShowTextSheet(false)}
                        className="px-4 rounded bg-red-600 hover:bg-red-500 text-sm font-bold"
                      >
                        OK
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                      Font
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {FONTS.map((f) => {
                        const fs = fontStyle(f.key);
                        return (
                          <button
                            key={f.key}
                            onClick={() => set({ font: f.key })}
                            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition ${o.font === f.key ? "bg-red-600 text-white" : "bg-white/10 text-white/70 hover:text-white"}`}
                            style={fs}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                      Size — {o.size.toUpperCase()}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={1}
                      value={o.size === "sm" ? 0 : o.size === "lg" ? 2 : 1}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        set({ size: n === 0 ? "sm" : n === 2 ? "lg" : "md" });
                      }}
                      className="w-full accent-red-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                      Color
                    </label>
                    <div className="flex gap-1.5">
                      {["#ffffff", "#000000", "#dc2626", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].map((c) => (
                        <button
                          key={c}
                          onClick={() => set({ color: c })}
                          className={`w-7 h-7 rounded-full border-2 transition ${o.color === c ? "border-white" : "border-white/20"}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      removeOverlay(o.id);
                      setShowTextSheet(false);
                    }}
                    className="w-full py-2 rounded-lg bg-red-950/40 border border-red-600/40 text-red-300 text-sm font-semibold hover:bg-red-950/60 transition"
                  >
                    Remove this text
                  </button>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </main>
  );
}
