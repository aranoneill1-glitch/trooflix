"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Check, Loader2, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = {
  src: string;
  title?: string;
  onClose: () => void;
  onPick: (blob: Blob) => void;
  onUploadImage?: () => void;
};

type Frame = { time: number; url: string };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clampPan(x: number, y: number, zoomLevel: number, width: number, height: number) {
  const maxX = (width * (zoomLevel - 1)) / 2;
  const maxY = (height * (zoomLevel - 1)) / 2;
  return {
    x: Math.min(Math.max(x, -maxX), maxX),
    y: Math.min(Math.max(y, -maxY), maxY),
  };
}

function getCrop(video: HTMLVideoElement, container: HTMLDivElement, zoomLevel: number, panX: number, panY: number) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const rect = container.getBoundingClientRect();
  const cw = rect.width;
  const ch = rect.height;
  if (!cw || !ch) return null;

  const aspect = vw / vh;
  let contentW: number, contentH: number, offX = 0, offY = 0;
  if (cw / ch > aspect) {
    contentH = ch;
    contentW = ch * aspect;
    offX = (cw - contentW) / 2;
  } else {
    contentW = cw;
    contentH = cw / aspect;
    offY = (ch - contentH) / 2;
  }

  const cx = cw / 2;
  const cy = ch / 2;
  const visibleLeft = cx + (-cx - panX) / zoomLevel;
  const visibleTop = cy + (-cy - panY) / zoomLevel;
  const visibleW = cw / zoomLevel;
  const visibleH = ch / zoomLevel;

  const sx = ((visibleLeft - offX) / contentW) * vw;
  const sy = ((visibleTop - offY) / contentH) * vh;
  const sw = (visibleW / contentW) * vw;
  const sh = (visibleH / contentH) * vh;

  const nx = Math.min(Math.max(sx, 0), vw - 1);
  const ny = Math.min(Math.max(sy, 0), vh - 1);
  return { sx: nx, sy: ny, sw: Math.min(sw, vw - nx), sh: Math.min(sh, vh - ny) };
}

export default function VideoFramePicker({ src, title, onClose, onPick, onUploadImage }: Props) {
  const proxySrc = "/api/proxy-video?url=" + encodeURIComponent(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Build a filmstrip by seeking a hidden copy of the video.
  useEffect(() => {
    let cancelled = false;
    const hidden = document.createElement("video");
    hidden.src = proxySrc;
    hidden.crossOrigin = "anonymous";
    hidden.muted = true;
    hidden.playsInline = true;
    hidden.preload = "auto";

    const waitFor = (event: string, ms: number) =>
      new Promise<boolean>((resolve) => {
        let done = false;
        const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
        hidden.addEventListener(event, () => finish(true), { once: true });
        hidden.addEventListener("error", () => finish(false), { once: true });
        setTimeout(() => finish(false), ms);
      });

    (async () => {
      const ready = await waitFor("loadedmetadata", 12000);
      if (cancelled || !ready || !Number.isFinite(hidden.duration) || hidden.duration <= 0) {
        setLoadingFrames(false);
        return;
      }

      const count = Math.min(12, Math.max(5, Math.floor(hidden.duration / 4)));
      const collected: Frame[] = [];

      for (let i = 0; i < count; i++) {
        if (cancelled) break;
        const time = (hidden.duration * (i + 1)) / (count + 1);
        const seeked = new Promise<boolean>((resolve) => {
          let done = false;
          const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
          hidden.addEventListener("seeked", () => finish(true), { once: true });
          hidden.addEventListener("error", () => finish(false), { once: true });
          setTimeout(() => finish(false), 6000);
          try { hidden.currentTime = time; } catch { finish(false); }
        });
        const ok = await seeked;
        if (cancelled) break;
        if (ok) {
          try {
            const canvas = document.createElement("canvas");
            const vw = hidden.videoWidth || 320;
            const vh = hidden.videoHeight || 568;
            canvas.width = 120;
            canvas.height = Math.round(120 * (vh / vw));
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(hidden, 0, 0, canvas.width, canvas.height);
              collected.push({ time, url: canvas.toDataURL("image/jpeg", 0.6) });
              setFrames([...collected]);
            }
          } catch {}
        }
      }
      if (!cancelled) setLoadingFrames(false);
      try { hidden.removeAttribute("src"); hidden.load(); } catch {}
    })();

    return () => { cancelled = true; try { hidden.removeAttribute("src"); hidden.load(); } catch {} };
  }, [proxySrc]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setPlaying(true);
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seekTo = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    setCurrent(time);
  };

  const setZoomLevel = (next: number) => {
    const z = Math.min(4, Math.max(1, next));
    setZoom(z);
    const rect = containerRef.current?.getBoundingClientRect();
    setPan((p) => clampPan(p.x, p.y, z, rect?.width || 300, rect?.height || 500));
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const captureCurrentFrame = () => {
    const v = videoRef.current;
    const container = containerRef.current;
    if (!v || !container || working) return;
    setWorking(true);
    setError("");
    try {
      const crop = getCrop(v, container, zoom, pan.x, pan.y);
      if (!crop) throw new Error("Video not ready yet.");

      const targetAspect = crop.sw / crop.sh;
      const maxSide = 1280;
      let width = maxSide;
      let height = Math.round(maxSide / targetAspect);
      if (height > maxSide) {
        height = maxSide;
        width = Math.round(maxSide * targetAspect);
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(v, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          setWorking(false);
          if (blob) onPick(blob);
          else setError("Could not capture this frame. Try another one.");
        },
        "image/jpeg",
        0.88
      );
    } catch (e: any) {
      setWorking(false);
      setError(e?.message || "Could not capture this frame.");
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      pinchRef.current = {
        distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        zoom,
      };
      dragRef.current = null;
      return;
    }
    if (zoom <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (activePointers.current.size === 2 && pinchRef.current) {
      const pts = Array.from(activePointers.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setZoomLevel((pinchRef.current.zoom * distance) / pinchRef.current.distance);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    setPan(clampPan(
      drag.panX + (e.clientX - drag.startX),
      drag.panY + (e.clientY - drag.startY),
      zoom,
      rect?.width || 300,
      rect?.height || 500
    ));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    dragRef.current = null;
    pinchRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-[#0a0a0c]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 border-b border-white/10 shrink-0">
        <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white">
          <X size={20} />
        </button>
        <div className="min-w-0 text-center px-3">
          <p className="text-sm font-bold text-white truncate">{title || "Choose a preview"}</p>
          <p className="text-[10px] text-white/45 uppercase tracking-widest">Select a frame</p>
        </div>
        <button onClick={captureCurrentFrame} disabled={working} aria-label="Set frame" className="p-2 rounded-full bg-[#E53945] hover:bg-[#d12e39] text-white disabled:opacity-50">
          {working ? <Loader2 size={18} className="animate-spin" /> : <Check size={20} />}
        </button>
      </div>

      {/* Video */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 flex items-center justify-center bg-black overflow-hidden touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => setZoomLevel(zoom + (e.deltaY < 0 ? 0.25 : -0.25))}
      >
        <video
          ref={videoRef}
          src={proxySrc}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
          className="h-full max-h-full w-full object-contain"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        />
        {!playing && zoom <= 1 && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md">
              <Play size={26} fill="currentColor" className="ml-1" />
            </span>
          </button>
        )}
        {!playing && zoom > 1 && (
          <button onClick={togglePlay} aria-label="Play" className="absolute bottom-3 left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md">
            <Play size={16} fill="currentColor" className="ml-0.5" />
          </button>
        )}
        {playing && (
          <button onClick={togglePlay} aria-label="Pause" className="absolute bottom-3 left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md">
            <Pause size={18} fill="currentColor" />
          </button>
        )}
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
          {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Scrubber + filmstrip */}
      <div className="shrink-0 border-t border-white/10 bg-[#111114] px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <button onClick={() => setZoomLevel(zoom - 0.25)} aria-label="Zoom out" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ZoomOut size={15} />
          </button>
          <button onClick={() => setZoomLevel(zoom + 0.25)} aria-label="Zoom in" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ZoomIn size={15} />
          </button>
          <button onClick={resetZoom} aria-label="Reset zoom" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <RotateCcw size={14} />
          </button>
          <span className="text-[10px] text-white/40 whitespace-nowrap">Pinch / drag to zoom &amp; pan</span>
        </div>

        <div className="mb-2 flex items-center gap-3">
          <span className="text-[11px] font-semibold tabular-nums text-white/60 w-10">{formatTime(current)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={current}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-[#E53945]"
          />
          <span className="text-[11px] font-semibold tabular-nums text-white/40 w-10 text-right">{formatTime(duration)}</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {loadingFrames && (
            <div className="flex items-center gap-2 py-4 text-[11px] text-white/45">
              <Loader2 size={13} className="animate-spin" /> Building frames…
            </div>
          )}
          {frames.map((frame) => (
            <button
              key={frame.time}
              onClick={() => seekTo(frame.time)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md ring-1 transition ${Math.abs(current - frame.time) < 0.7 ? "ring-2 ring-white" : "ring-white/10"}`}
            >
              <img src={frame.url} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold text-white drop-shadow">{formatTime(frame.time)}</span>
            </button>
          ))}
        </div>

        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}

        {onUploadImage && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 w-full py-2.5 text-center text-xs font-bold text-white/70 bg-white/5 hover:bg-white/10 rounded-xl transition flex items-center justify-center gap-2"
          >
            <ImageIcon size={14} /> Upload an image instead
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
