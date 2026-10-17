"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, Play, Pause } from "lucide-react";
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
  const [showTimeline, setShowTimeline] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const swipeRef = useRef<{ startY: number; fired: boolean } | null>(null);

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
      ts: String(trimStart),
      te: String(trimEnd),
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

  // ---- Swipe up gesture ----
  const onSwipeStart = (e: React.TouchEvent) => {
    // Don't capture swipes that start on a text overlay
    const target = e.target as HTMLElement;
    if (target.closest("[data-text-overlay]")) return;
    swipeRef.current = { startY: e.touches[0].clientY, fired: false };
  };

  const onSwipeMove = (e: React.TouchEvent) => {
    if (!swipeRef.current || swipeRef.current.fired) return;
    const deltaY = swipeRef.current.startY - e.touches[0].clientY;
    if (deltaY > 60) {
      swipeRef.current.fired = true;
      setShowTimeline(true);
    }
  };

  const onSwipeEnd = () => {
    swipeRef.current = null;
  };

  const seekVideo = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
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
          onTouchStart={onSwipeStart}
          onTouchMove={onSwipeMove}
          onTouchEnd={onSwipeEnd}
          className="relative bg-black select-none h-full"
          style={{ aspectRatio: "9 / 16", maxWidth: "100vw" }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setVideoDuration(v.duration || 0);
              if (trimEnd === 0) setTrimEnd(v.duration || 0);
            }}
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime);
            }}
          />

          {textOverlays.map((o) => {
            const fs = fontStyle(o.font);
            const sizeClass =
              o.size === "sm" ? "text-sm" : o.size === "lg" ? "text-2xl" : "text-lg";
            return (
              <div
                key={o.id}
                data-text-overlay
                onPointerDown={(e) => startDrag(e, o)}
                className={`absolute whitespace-nowrap leading-tight cursor-move select-none px-2 py-0.5 ${sizeClass} ${editingOverlay === o.id ? "ring-2 ring-red-500/60 rounded" : ""}`}
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  color: o.color || "#ffffff",
                  textShadow: "0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
                  maxWidth: "80vw",
                  touchAction: "none",
                  whiteSpace: "pre",
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

      {/* ---- Timeline panel (swipe up) ---- */}
      <AnimatePresence>
        {showTimeline && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-0 z-[500] bg-black flex flex-col"
          >
            {/* Top controls */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <button
                onClick={() => setShowTimeline(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                aria-label="Close timeline"
              >
                <ChevronDown size={22} />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold">Trim</p>
              </div>
              <button
                onClick={goNext}
                className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-sm font-semibold"
              >
                Next →
              </button>
            </div>

            {/* Preview area — mini video */}
            <div className="flex-1 flex items-center justify-center p-4 bg-black overflow-hidden">
              <div
                className="relative bg-black"
                style={{ aspectRatio: "9 / 16", height: "100%", maxWidth: "100vw" }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  muted
                  loop
                  autoPlay
                  playsInline
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                />
              </div>
            </div>

            {/* Time indicator */}
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-white/70">
              <span className="tabular-nums">{formatTime(currentTime)}</span>
              <span className="text-white/30">/</span>
              <span className="tabular-nums">{formatTime(videoDuration)}</span>
            </div>

            {/* Timeline tracks */}
            <div className="px-4 pb-4 space-y-2">
              {/* Video track with trim handles */}
              <div className="relative">
                <div
                  className="relative h-16 rounded-md overflow-hidden bg-white/10"
                  style={{
                    backgroundImage: posterUrl ? `url(${posterUrl})` : undefined,
                    backgroundSize: "auto 100%",
                    backgroundRepeat: "repeat-x",
                  }}
                >
                  {/* Progress playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                    style={{ left: `${(currentTime / (videoDuration || 1)) * 100}%` }}
                  />
                  {/* Trim shading before start */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-black/70 z-10 pointer-events-none"
                    style={{ width: `${(trimStart / (videoDuration || 1)) * 100}%` }}
                  />
                  {/* Trim shading after end */}
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-black/70 z-10 pointer-events-none"
                    style={{ width: `${((videoDuration - trimEnd) / (videoDuration || 1)) * 100}%` }}
                  />
                </div>

                {/* Left trim handle */}
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 1}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const v = Math.min(Number(e.target.value), trimEnd - 0.5);
                    setTrimStart(v);
                    seekVideo(v);
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  style={{ zIndex: 15 }}
                />

                {/* Right trim handle */}
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 1}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const v = Math.max(Number(e.target.value), trimStart + 0.5);
                    setTrimEnd(v);
                    seekVideo(v);
                  }}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  style={{ zIndex: 16 }}
                />

                {/* Visual trim handles (decorative) */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white rounded-l pointer-events-none z-20"
                  style={{ left: `${(trimStart / (videoDuration || 1)) * 100}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white rounded-r pointer-events-none z-20"
                  style={{ left: `${(trimEnd / (videoDuration || 1)) * 100}%` }}
                />
              </div>

              {/* Text track */}
              {textOverlays.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Text</p>
                  {textOverlays.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => {
                        setEditingOverlay(o.id);
                        setShowTimeline(false);
                        setShowTextSheet(true);
                      }}
                      className="h-8 rounded-md bg-purple-600 hover:bg-purple-500 flex items-center px-2 cursor-pointer transition"
                    >
                      <span className="text-xs font-semibold text-white truncate">
                        {o.text || "Untitled"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-white/40 text-center pt-1">
                Drag the white handles to trim · Tap text bars to edit
              </p>
            </div>

            {/* Bottom action bar */}
            <div className="flex justify-around py-3 border-t border-white/10">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                  }
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/5 transition"
              >
                <Play size={22} className="text-white" />
                <span className="text-[10px] text-white/80">Play</span>
              </button>
              <button
                onClick={() => {
                  setShowTimeline(false);
                  addTextOverlay();
                }}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/5 transition"
              >
                <span className="text-lg font-serif text-white">Aa</span>
                <span className="text-[10px] text-white/80">Text</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
