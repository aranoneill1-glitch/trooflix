"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronLeft, Loader2, Pause, Play, Scissors, Type, Smile,
  Pencil, SlidersHorizontal, Sparkles, Trash2, X, RotateCcw,
} from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (result: { file: File; duration: number; posterBlob?: Blob | null }) => void;
};

type Overlay = {
  id: string;
  kind: "text" | "emoji" | "shape";
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  fontId: string;
  bg: boolean;
  shape: "rect" | "circle" | null;
  start: number;
  end: number;
};

type Stroke = { color: string; width: number; points: { x: number; y: number }[] };

type Tool = "trim" | "text" | "stickers" | "draw" | "filter" | "adjust" | "captions";
type Caption = { id: string; start: number; end: number; text: string };

const FONTS = [
  { id: "default", label: "Default", css: "700", family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { id: "modern", label: "Modern", css: "800", family: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { id: "typewriter", label: "Typewriter", css: "600", family: "'Courier New', Courier, monospace" },
  { id: "serif", label: "Serif", css: "700", family: "Georgia, 'Times New Roman', serif" },
  { id: "neon", label: "Neon", css: "800", family: "Impact, 'Arial Black', sans-serif" },
  { id: "handwriting", label: "Handwriting", css: "600", family: "'Comic Sans MS', 'Segoe Print', cursive" },
  { id: "bold", label: "Bold", css: "900", family: "'Arial Black', Impact, sans-serif" },
  { id: "italic", label: "Italic", css: "italic 700", family: "Georgia, serif" },
];

const FILTERS = [
  { id: "normal", label: "Normal", css: "" },
  { id: "clarendon", label: "Clarendon", css: "contrast(1.2) saturate(1.35)" },
  { id: "gingham", label: "Gingham", css: "contrast(0.9) saturate(1.05) sepia(0.1)" },
  { id: "moon", label: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { id: "lark", label: "Lark", css: "contrast(1.05) saturate(1.2) brightness(1.05)" },
  { id: "earlybird", label: "Earlybird", css: "sepia(0.25) contrast(1.1) saturate(1.1)" },
  { id: "juno", label: "Juno", css: "saturate(1.4) contrast(1.05) sepia(0.1)" },
  { id: "aden", label: "Aden", css: "sepia(0.2) contrast(0.95) brightness(1.1)" },
  { id: "lofi", label: "Lo-fi", css: "saturate(0.7) contrast(1.2)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.45) contrast(0.9) saturate(0.8)" },
  { id: "nashionville", label: "Nashville", css: "sepia(0.2) saturate(1.2) contrast(1.05) hue-rotate(-8deg)" },
  { id: "vesper", label: "Vesper", css: "grayscale(0.6) contrast(1.25) saturate(0.7)" },
];

const COLORS = ["#ffffff", "#000000", "#ff3b5c", "#ffd93d", "#4ade80", "#60a5fa", "#c084fc", "#ff8a3d"];
const EMOJIS = ["❤️", "🔥", "✨", "😂", "😍", "👏", "💯", "🎉", "👀", "💜", "⭐", "🚀", "🌊", "🎵", "💥", "🥹", "🙌", "😎", "💪", "🫶", "😭", "🤣", "😇", "🥰"];

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function VideoEditor({ file, onCancel, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const exportingRef = useRef(false);
  const pinchRef = useRef<{ distance: number; scale: number; rotation: number; cx: number; cy: number; r0: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const drawingRef = useRef(false);

  const [src, setSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [dragging, setDragging] = useState<"start" | "end" | "playhead" | null>(null);
  const [tool, setTool] = useState<Tool>("trim");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);

  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [filterId, setFilterId] = useState("normal");
  const [filterStrength, setFilterStrength] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturate, setSaturate] = useState(1);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [drawWidth, setDrawWidth] = useState(6);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [captionText, setCaptionText] = useState("");

  useEffect(() => { exportingRef.current = exporting; }, [exporting]);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      setDuration(d); setStart(0); setEnd(d); setCurrentTime(0);
    };
    const onTime = () => {
      const t = v.currentTime;
      setCurrentTime(t);
      if (!exportingRef.current && playing && t >= end - 0.05) { v.currentTime = start; v.play().catch(() => {}); }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [src, start, end, playing]);

  useEffect(() => {
    if (!src || !duration || duration <= 0) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src; video.muted = true; video.playsInline = true;
    const count = 14;
    const out: string[] = new Array(count).fill("");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const capture = (i: number) => new Promise<void>((resolve) => {
      if (cancelled || !ctx) return resolve();
      const t = duration * (i / Math.max(1, count - 1));
      const onSeeked = () => {
        try {
          const w = 110;
          const h = Math.max(60, Math.round((video.videoHeight / Math.max(1, video.videoWidth)) * w));
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          out[i] = canvas.toDataURL("image/jpeg", 0.45);
        } catch {}
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      try { video.currentTime = Math.min(duration - 0.01, Math.max(0, t)); } catch { video.removeEventListener("seeked", onSeeked); resolve(); }
      setTimeout(() => { video.removeEventListener("seeked", onSeeked); resolve(); }, 2500);
    });
    video.onloadedmetadata = async () => {
      for (let i = 0; i < count; i++) { if (cancelled) break; await capture(i); if (!cancelled) setThumbs([...out]); }
    };
    return () => { cancelled = true; };
  }, [src, duration]);

  const filterPresent = filterId !== "normal";
  const cssFilter = useMemo(() => {
    const base = FILTERS.find(f => f.id === filterId)?.css || "";
    const bits = [`brightness(${brightness})`, `contrast(${contrast})`, `saturate(${saturate})`];
    if (base) bits.push(base);
    return bits.join(" ");
  }, [filterId, brightness, contrast, saturate]);

  const activeOverlays = useCallback((t: number) => overlays.filter(o => (o.text.trim() || o.kind === "shape") && t >= o.start && t <= o.end), [overlays]);
  const activeCaption = useCallback((t: number) => {
    for (let i = captions.length - 1; i >= 0; i--) if (t >= captions[i].start && t <= captions[i].end && captions[i].text.trim()) return captions[i];
    return null;
  }, [captions]);

  const fontFor = (id: string) => FONTS.find(f => f.id === id) || FONTS[0];

  const drawOverlays = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    for (const o of activeOverlays(t)) {
      ctx.save();
      ctx.translate(o.x * w, o.y * h);
      ctx.rotate((o.rotation * Math.PI) / 180);
      ctx.scale(o.scale, o.scale);
      const font = fontFor(o.fontId);
      const size = (o.kind === "emoji" ? 0.12 : 0.075) * h;
      if (o.kind === "shape" && o.shape) {
        ctx.fillStyle = o.color;
        if (o.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-size / 2, -size / 2, size, size * 0.62);
      } else {
        ctx.font = `${font.css} ${size}px ${font.family}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const m = ctx.measureText(o.text);
        const tw = Math.min(w * 0.92, m.width + size * 0.7);
        const th = size * 1.5;
        if (o.bg) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          const r = 8;
          ctx.beginPath();
          ctx.moveTo(-tw / 2 + r, -th / 2);
          ctx.lineTo(tw / 2 - r, -th / 2);
          ctx.quadraticCurveTo(tw / 2, -th / 2, tw / 2, -th / 2 + r);
          ctx.lineTo(tw / 2, th / 2 - r);
          ctx.quadraticCurveTo(tw / 2, th / 2, tw / 2 - r, th / 2);
          ctx.lineTo(-tw / 2 + r, th / 2);
          ctx.quadraticCurveTo(-tw / 2, th / 2, -tw / 2, th / 2 - r);
          ctx.lineTo(-tw / 2, -th / 2 + r);
          ctx.quadraticCurveTo(-tw / 2, -th / 2, -tw / 2 + r, -th / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.lineWidth = Math.max(2, size * 0.08);
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.strokeText(o.text, 0, 0);
        ctx.fillStyle = o.color;
        ctx.fillText(o.text, 0, 0);
      }
      ctx.restore();
    }
  };

  const drawStrokes = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    for (const s of strokes) {
      if (!s.points.length) continue;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      s.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x * w, p.y * h); else ctx.lineTo(p.x * w, p.y * h); });
      if (s.points.length === 1) { ctx.lineTo(s.points[0].x * w + 0.5, s.points[0].y * h + 0.5); }
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawCaption = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);
    if (!lines.length) return;
    const fs = Math.max(18, Math.round(h * 0.045));
    ctx.font = `700 ${fs}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lh = fs * 1.25;
    const blockH = lines.length * lh;
    const cy = h * 0.84;
    const mw = Math.max(...lines.map(l => ctx.measureText(l).width));
    const bw = Math.min(w * 0.9, mw + fs);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect((w - bw) / 2, cy - blockH / 2 - fs * 0.3, bw, blockH + fs * 0.6);
    ctx.fillStyle = "#fff";
    lines.forEach((l, i) => ctx.fillText(l, w / 2, cy - blockH / 2 + lh * (i + 0.5)));
  };

  useEffect(() => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || !src) return;
    const draw = () => {
      try {
        const ctx = canvas.getContext("2d");
        if (ctx && v.readyState >= 2) {
          const w = canvas.width, h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.filter = cssFilter;
          ctx.drawImage(v, 0, 0, w, h);
          ctx.filter = "none";
          drawOverlays(ctx, w, h, v.currentTime);
          drawStrokes(ctx, w, h, v.currentTime);
          const cap = activeCaption(v.currentTime);
          if (cap) drawCaption(ctx, w, h, cap.text);
        }
      } catch {}
      if (!exportingRef.current) rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [src, cssFilter, overlays, strokes, captions]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { if (v.currentTime < start || v.currentTime >= end - 0.05) v.currentTime = start; v.play().catch(() => {}); }
    else v.pause();
  };
  const seekTo = (t: number) => { const nt = clamp(t, 0, duration); setCurrentTime(nt); if (videoRef.current) videoRef.current.currentTime = nt; };

  const pxToTime = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return 0;
    const r = el.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1) * duration;
  };
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const t = pxToTime(e.clientX);
      const gap = Math.min(0.4, duration * 0.02);
      if (dragging === "start") { setStart(Math.min(t, end - gap)); if (videoRef.current) videoRef.current.currentTime = Math.min(t, end - gap); }
      else if (dragging === "end") { setEnd(Math.max(t, start + gap)); if (videoRef.current) videoRef.current.currentTime = Math.max(t, start + gap); }
      else { const nt = clamp(t, start, end); setCurrentTime(nt); if (videoRef.current) videoRef.current.currentTime = nt; }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging, start, end, duration]);

  // Canvas gestures: drag / pinch / rotate overlays, or draw
  const onCanvasDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);

    if (tool === "draw") {
      drawingRef.current = true;
      setStrokes(prev => [...prev, { color: drawColor, width: drawWidth, points: [{ x: nx, y: ny }] }]);
      return;
    }

    if (pointersRef.current.size === 2 && selectedId) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const sel = overlays.find(o => o.id === selectedId);
      pinchRef.current = { distance: dist, scale: sel?.scale || 1, rotation: sel?.rotation || 0, cx: nx, cy: ny, r0: angle };
      dragRef.current = null;
      return;
    }

    const t = videoRef.current?.currentTime || 0;
    const hit = activeOverlays(t).slice().reverse().find(o => Math.abs(o.x - nx) < 0.18 && Math.abs(o.y - ny) < 0.18);
    if (hit) {
      setSelectedId(hit.id);
      dragRef.current = { startX: e.clientX, startY: e.clientY, x: hit.x, y: hit.y };
    } else {
      setSelectedId(null);
    }
  };
  const onCanvasMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (drawingRef.current) {
      setStrokes(prev => {
        if (!prev.length) return prev;
        const copy = [...prev];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, points: [...last.points, { x: nx, y: ny }] };
        return copy;
      });
      return;
    }

    if (pointersRef.current.size === 2 && pinchRef.current && selectedId) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].x);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const scale = clamp((pinchRef.current.scale * dist) / Math.max(1, pinchRef.current.distance), 0.4, 3);
      const rotation = pinchRef.current.rotation + ((angle - pinchRef.current.r0) * 180) / Math.PI;
      setOverlays(prev => prev.map(o => o.id === selectedId ? { ...o, scale, rotation } : o));
      return;
    }

    const d = dragRef.current;
    if (d && selectedId) {
      setOverlays(prev => prev.map(o => o.id === selectedId
        ? { ...o, x: clamp(d.x + (e.clientX - d.startX) / rect.width, 0.03, 0.97), y: clamp(d.y + (e.clientY - d.startY) / rect.height, 0.03, 0.97) }
        : o));
    }
  };
  const onCanvasUp = () => { drawRef.current = null; pointersRef.current.clear(); pinchRef.current = null; drawingRef.current = false; };
  const drawRef = useRef<null>(null);

  const addOverlay = (kind: Overlay["kind"], text: string, shape: Overlay["shape"] = null) => {
    const t = clamp(videoRef.current?.currentTime || currentTime, start, Math.max(start, end - 0.5));
    const o: Overlay = {
      id: uid(), kind, text, x: 0.5, y: 0.5, scale: 1, rotation: 0,
      color: "#ffffff", fontId: "default", bg: kind === "text", shape,
      start: t, end: Math.min(end, t + 3),
    };
    setOverlays(prev => [...prev, o]);
    setSelectedId(o.id);
  };
  const updateSelected = (patch: Partial<Overlay>) => setOverlays(prev => prev.map(o => o.id === selectedId ? { ...o, ...patch } : o));
  const deleteSelected = () => { setOverlays(prev => prev.filter(o => o.id !== selectedId)); setStrokes([]); setSelectedId(null); };

  const exportVideo = async () => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const hasEdits = start > 0.05 || end < duration - 0.05 || overlays.length > 0 || strokes.length > 0 ||
      captions.length > 0 || filterPresent || brightness !== 1 || contrast !== 1 || saturate !== 1;

    if (!hasEdits) { onApply({ file, duration, posterBlob: await capturePoster() }); return; }

    exportingRef.current = true;
    setExporting(true);
    setExportProgress(0);
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let timer: any = null;

    try {
      if (typeof MediaRecorder === "undefined") throw new Error("Export not supported");
      const mimes = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      let mime = "";
      for (const m of mimes) if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }

      const canvas = document.createElement("canvas");
      const cw = Math.min(1080, v.videoWidth || 720);
      canvas.width = cw;
      canvas.height = Math.round(cw * ((v.videoHeight || 1280) / (v.videoWidth || 720)));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const vs = (v as any).captureStream ? (v as any).captureStream() : null;
      const audioTracks = vs && vs.getAudioTracks ? vs.getAudioTracks() : [];
      const cstream = canvas.captureStream(30);
      stream = new MediaStream([...cstream.getVideoTracks(), ...audioTracks]);

      const chunks: Blob[] = [];
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
      const done = new Promise<Blob>((resolve, reject) => {
        if (!recorder) return reject(new Error("Export failed"));
        recorder!.onerror = () => reject(new Error("Export failed"));
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mime || recorder!.mimeType || "video/webm" }));
      });

      const poster = await capturePoster();
      const es = Math.max(0, Math.min(start, Math.max(0, duration - 0.1)));
      const ee = Math.max(es + 0.1, Math.min(end, duration));
      v.pause();
      v.currentTime = es;
      await new Promise<void>(res => { const h = () => { v.removeEventListener("seeked", h); res(); }; v.addEventListener("seeked", h); setTimeout(res, 1500); });

      const draw = () => {
        try {
          const w = canvas.width, h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.filter = cssFilter;
          ctx.drawImage(v, 0, 0, w, h);
          ctx.filter = "none";
          drawOverlays(ctx, w, h, v.currentTime);
          drawStrokes(ctx, w, h, v.currentTime);
          const cap = activeCaption(v.currentTime);
          if (cap) drawCaption(ctx, w, h, cap.text);
        } catch {}
        if (!v.paused && !v.ended && v.currentTime < ee - 0.02) raf = requestAnimationFrame(draw);
      };
      recorder.start(250);
      draw();
      await v.play().catch(() => { throw new Error("Could not play for export"); });
      timer = setInterval(() => setExportProgress(Math.round(clamp(((v.currentTime - es) / Math.max(0.1, ee - es)) * 100, 0, 100))), 200);
      await new Promise<void>(resolve => {
        let fin = false;
        const finish = () => { if (fin) return; fin = true; v.removeEventListener("ended", onEnded); clearInterval(stop); resolve(); };
        const onEnded = () => finish();
        v.addEventListener("ended", onEnded);
        const stop = setInterval(() => { if (v.currentTime >= ee - 0.03 || v.ended) { try { v.pause(); } catch {} finish(); } }, 60);
        setTimeout(() => { try { v.pause(); } catch {} finish(); }, Math.max(8000, (ee - es + 8) * 1000));
      });
      if (timer) clearInterval(timer);
      setExportProgress(100);
      if (recorder.state !== "inactive") recorder.stop();
      const blob = await done;
      const type = blob.type || mime || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const name = (file.name.replace(/\.[^.]+$/, "") || "video") + "_edited." + ext;
      onApply({ file: new File([blob], name, { type }), duration: ee - es, posterBlob: poster });
    } catch (e) {
      console.error(e);
      alert("Could not export with edits in this browser. Uploading original video instead. Chrome on desktop works best.");
      onApply({ file, duration, posterBlob: await capturePoster() });
    } finally {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
      try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch {}
      try { stream?.getTracks().forEach(t => t.stop()); } catch {}
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const capturePoster = async (): Promise<Blob | null> => {
    const v = videoRef.current;
    if (!v) return null;
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.filter = cssFilter; ctx.drawImage(v, 0, 0, c.width, c.height); ctx.filter = "none";
      drawOverlays(ctx, c.width, c.height, v.currentTime);
      drawStrokes(ctx, c.width, c.height, v.currentTime);
      const cap = activeCaption(v.currentTime);
      if (cap) drawCaption(ctx, c.width, c.height, cap.text);
      return await new Promise(res => c.toBlob(res, "image/jpeg", 0.85));
    } catch { return null; }
  };

  const selected = overlays.find(o => o.id === selectedId) || null;
  const span = Math.max(0.1, end - start);
  const sp = duration ? (start / duration) * 100 : 0;
  const ep = duration ? (end / duration) * 100 : 100;
  const pp = duration ? (currentTime / duration) * 100 : 0;

  const TOOLS: { id: Tool; label: string; icon: any }[] = [
    { id: "trim", label: "Trim", icon: Scissors },
    { id: "text", label: "Text", icon: Type },
    { id: "stickers", label: "Stickers", icon: Smile },
    { id: "draw", label: "Draw", icon: Pencil },
    { id: "filter", label: "Filter", icon: Sparkles },
    { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
    { id: "captions", label: "Captions", icon: Type },
  ];

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 h-[56px] shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button onClick={onCancel} disabled={exporting} className="w-10 h-10 flex items-center justify-center disabled:opacity-40" aria-label="Back"><ChevronLeft size={28} /></button>
        <span className="text-sm font-semibold">Edit</span>
        <button onClick={exportVideo} disabled={exporting || duration <= 0} className="h-8 px-5 rounded-lg bg-[#0095f6] hover:bg-[#1aa3ff] text-sm font-bold disabled:opacity-40 flex items-center gap-1.5">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : null}
          {exporting ? "Saving" : "Next"}
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-3">
        <div className="relative w-full max-w-[400px] aspect-[9/16] max-h-[48vh] bg-[#111] overflow-hidden rounded-sm">
          <canvas
            ref={canvasRef}
            width={720}
            height={1280}
            className="w-full h-full object-contain touch-none"
            onPointerDown={onCanvasDown}
            onPointerMove={onCanvasMove}
            onPointerUp={onCanvasUp}
            onPointerCancel={onCanvasUp}
          />
          <video ref={videoRef} src={src} playsInline preload="auto" className="hidden" />
          <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" aria-label={playing ? "Pause" : "Play"}>
            <span className={`w-14 h-14 rounded-full bg-black/35 flex items-center justify-center transition-opacity ${playing ? "opacity-0" : "opacity-100"}`}>
              {playing ? <Pause size={26} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
            </span>
          </button>
          <div className="absolute top-2 left-2 text-[10px] font-semibold bg-black/45 px-2 py-0.5 rounded">{fmt(currentTime)}</div>
        </div>
      </div>

      {/* Tool options */}
      <div className="shrink-0 h-[112px] border-t border-white/10 bg-black px-3 py-2 overflow-y-auto">
        {tool === "trim" && <p className="text-xs text-white/50 text-center pt-8">Drag the white handles on the timeline below to trim your video.</p>}

        {tool === "text" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={textDraft} onChange={e => setTextDraft(e.target.value)} placeholder="Type a caption…" className="flex-1 min-w-0 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <button onClick={() => { addOverlay("text", textDraft.trim() || "Your text"); setTextDraft(""); }} className="px-3 rounded-lg bg-white text-black text-xs font-bold">Add</button>
            </div>
            <div className="flex gap-2 items-center overflow-x-auto pb-1">
              <button onClick={() => setFontPickerOpen(true)} className="shrink-0 w-9 h-9 rounded-md bg-white/10 text-sm font-bold">Aa</button>
              <div className="flex gap-1.5">
                {COLORS.map(c => <button key={c} onClick={() => selected ? updateSelected({ color: c }) : null} className="w-6 h-6 rounded-full border border-white/20 shrink-0" style={{ background: c }} />)}
              </div>
              {selected && (
                <>
                  <button onClick={() => updateSelected({ bg: !selected.bg })} className={`shrink-0 px-2 py-1 rounded text-[10px] font-semibold ${selected.bg ? "bg-white text-black" : "bg-white/10"}`}>BG</button>
                  <button onClick={deleteSelected} className="shrink-0 text-red-400"><Trash2 size={15} /></button>
                </>
              )}
            </div>
            <p className="text-[10px] text-white/40">Drag text on the video. Pinch with two fingers to resize and rotate.</p>
          </div>
        )}

        {fontPickerOpen && (
          <div className="fixed inset-0 z-[600] bg-black/85 flex items-end" onClick={() => setFontPickerOpen(false)}>
            <div className="w-full bg-[#161616] rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Font style</h3><button onClick={() => setFontPickerOpen(false)}><X size={20} /></button></div>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map(f => (
                  <button key={f.id} onClick={() => { if (selectedId) updateSelected({ fontId: f.id }); setFontPickerOpen(false); }} className={`p-4 rounded-xl bg-white/5 border ${selected?.fontId === f.id ? "border-white" : "border-white/10"}`}>
                    <span className="text-xl text-white" style={{ font: `${f.css} 20px ${f.family}` }}>Aa</span>
                    <span className="block text-[10px] text-white/45 mt-1">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tool === "stickers" && (
          <div className="grid grid-cols-10 gap-1.5 py-2">
            {EMOJIS.map(e => <button key={e} onClick={() => addOverlay("emoji", e)} className="text-xl">{e}</button>)}
          </div>
        )}

        {tool === "draw" && (
          <div className="space-y-2">
            <div className="flex gap-2">{COLORS.map(c => <button key={c} onClick={() => setDrawColor(c)} className={`w-7 h-7 rounded-full border-2 ${drawColor === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />)}</div>
            <div className="flex items-center gap-2"><span className="text-[10px] text-white/50">Size</span><input type="range" min={2} max={24} value={drawWidth} onChange={e => setDrawWidth(parseInt(e.target.value))} className="flex-1" /></div>
            <div className="flex justify-between"><button onClick={() => setStrokes([])} className="text-[11px] text-red-400 flex items-center gap-1"><Trash2 size={12} /> Clear</button><button onClick={() => setStrokes(prev => prev.slice(0, -1))} className="text-[11px] text-white/60 flex items-center gap-1"><RotateCcw size={12} /> Undo stroke</button></div>
          </div>
        )}

        {tool === "filter" && (
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilterId(f.id)} className={`shrink-0 flex flex-col items-center gap-1 w-16 ${filterId === f.id ? "text-white" : "text-white/45"}`}>
                  <span className="w-14 h-14 rounded-md bg-white/10 overflow-hidden flex items-center justify-center text-[9px] font-bold border border-white/10">{f.label.slice(0, 5)}</span>
                  <span className="text-[9px] truncate w-full text-center">{f.label}</span>
                </button>
              ))}
            </div>
            {filterPresent && <div className="flex items-center gap-2"><span className="text-[10px] text-white/50">Strength</span><input type="range" min={0} max={1} step={0.05} value={filterStrength} onChange={e => setFilterStrength(parseFloat(e.target.value))} className="flex-1" /></div>}
          </div>
        )}

        {tool === "adjust" && (
          <div className="space-y-2">
            {([["Brightness", brightness, setBrightness], ["Contrast", contrast, setContrast], ["Saturation", saturate, setSaturate]] as const).map(([label, val, setter]) => (
              <label key={label as string} className="flex items-center gap-2 text-[11px] text-white/60"><span className="w-20">{label}</span><input type="range" min={0.3} max={2} step={0.05} value={val} onChange={e => setter(parseFloat(e.target.value))} className="flex-1" /><span className="w-8 text-right">{Number(val).toFixed(1)}</span></label>
            ))}
            <button onClick={() => { setBrightness(1); setContrast(1); setSaturate(1); }} className="text-[10px] text-[#7dd3fc]">Reset</button>
          </div>
        )}

        {tool === "captions" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={captionText} onChange={e => setCaptionText(e.target.value)} placeholder="Caption text…" className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
              <button onClick={() => { const t = currentTime; setCaptions(prev => [...prev, { id: uid(), start: t, end: Math.min(end, t + 3), text: captionText.trim() || "Caption" }]); setCaptionText(""); }} className="px-3 rounded-lg bg-white text-black text-xs font-bold">Add</button>
            </div>
            <div className="flex gap-2 overflow-x-auto">{captions.map(c => <button key={c.id} onClick={() => seekTo(c.start)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] ${c.text.slice(0, 18)}`}>{c.text.slice(0, 18)}</button>)}</div>
          </div>
        )}
      </div>

      {/* Tool bar */}
      <div className="shrink-0 flex justify-around border-t border-white/10 py-1.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)" }}>
        {TOOLS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTool(t.id)} className={`flex flex-col items-center gap-0.5 min-w-[52px] ${tool === t.id ? "text-white" : "text-white/45"}`}>
            <Icon size={19} />
            <span className="text-[9px] font-medium">{t.label}</span>
          </button>
        ); })}
      </div>

      {/* Timeline */}
      <div className="shrink-0 px-3 pb-2">
        <div
          ref={timelineRef}
          className="relative h-11 rounded-sm overflow-hidden bg-black/50 border border-white/10 touch-none select-none"
          onPointerDown={(e) => {
            const t = pxToTime(e.clientX);
            const target = Math.abs(t - start) < 0.35 ? "start" : Math.abs(t - end) < 0.35 ? "end" : "playhead";
            setDragging(target);
            (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            if (target === "playhead") seekTo(t);
          }}
        >
          <div className="absolute inset-0 flex">
            {(thumbs.length ? thumbs : Array.from({ length: 14 }).map(() => "")).map((t, i) => <div key={i} className="flex-1 h-full border-r border-black/40 bg-white/5">{t ? <img src={t} alt="" className="w-full h-full object-cover opacity-80" /> : null}</div>)}
          </div>
          <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${sp}%` }} />
          <div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${100 - ep}%` }} />
          <div className="absolute inset-y-0 border-y-2 border-white" style={{ left: `${sp}%`, width: `${ep - sp}%` }} />
          {(["start", "end"] as const).map(h => <div key={h} className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center z-20" style={{ left: h === "start" ? `${sp}%` : `${ep}%` }} onPointerDown={(e) => { e.stopPropagation(); setDragging(h); }}><div className="w-2 h-8 bg-white rounded-sm" /></div>)}
          <div className="absolute inset-y-0 w-[2px] bg-white z-10" style={{ left: `${pp}%` }} />
          {overlays.map(o => <div key={o.id} className="absolute bottom-0 h-2 bg-[#c084fc] z-10 pointer-events-none" style={{ left: `${(o.start / duration) * 100}%`, width: `${((o.end - o.start) / duration) * 100}%` }} />)}
          {captions.map(c => <div key={c.id} className="absolute top-0 h-1.5 bg-[#4ade80] z-10 pointer-events-none" style={{ left: `${(c.start / duration) * 100}%`, width: `${((c.end - c.start) / duration) * 100}%` }} />)}
        </div>
        <div className="flex justify-between text-[9px] text-white/35 mt-1"><span>0:00</span><span>{fmt(duration)}</span></div>
      </div>

      {exporting && <div className="absolute inset-0 z-[700] bg-black/80 flex items-center justify-center"><div className="w-64 text-center"><p className="text-sm font-bold mb-3">Saving your video…</p><div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#0095f6]" style={{ width: `${exportProgress}%` }} /></div><p className="text-xs mt-2">{exportProgress}%</p></div></div>}
    </div>
  );
}
