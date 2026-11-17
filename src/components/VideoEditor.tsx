"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, ChevronLeft, ChevronRight, Loader2, Pause, Play, Plus, Scissors,
  Sparkles, Subtitles, Trash2, Type, X, Music2, Gauge, SlidersHorizontal,
  Smile, Square, Circle, ZoomIn, ZoomOut, Undo2, Redo2, Volume2, Image as ImageIcon,
} from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (result: { file: File; duration: number; posterBlob?: Blob | null }) => void;
};

type SubtitleCue = { id: string; start: number; end: number; text: string };
type Overlay = {
  id: string;
  kind: "text" | "emoji" | "shape";
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  bg: boolean;
  shape: "rect" | "circle" | null;
  start: number;
  end: number;
};

type Tool = "trim" | "text" | "filters" | "audio" | "speed" | "stickers" | "subtitles";

const FILTERS = [
  { id: "none", label: "Original", css: "" },
  { id: "cinematic", label: "Cinematic", css: "contrast(1.15) saturate(0.88) sepia(0.08)" },
  { id: "vibrant", label: "Vibrant", css: "saturate(1.45) contrast(1.08)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.12)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.38) saturate(0.82) contrast(0.95)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.9)" },
  { id: "warm", label: "Warm", css: "sepia(0.18) saturate(1.2) hue-rotate(-6deg)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(168deg) contrast(1.05)" },
];

const EMOJIS = ["❤️", "🔥", "✨", "😂", "😍", "👏", "💯", "🎉", "👀", "💜", "⭐", "🚀", "🌊", "🎵", "💥", "🥹", "🙌", "😎", "💪", "🫶"];

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmt(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const d = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${d}`;
}

export default function VideoEditor({ file, onCancel, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const exportingRef = useRef(false);

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
  const [zoom, setZoom] = useState(1);

  // Text / stickers
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [dragOverlayId, setDragOverlayId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");

  // Filters
  const [filterId, setFilterId] = useState("none");
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturate, setSaturate] = useState(1);

  // Audio
  const [musicSrc, setMusicSrc] = useState("");
  const [musicName, setMusicName] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [originalVolume, setOriginalVolume] = useState(1);

  // Speed / reverse
  const [speed, setSpeed] = useState(1);
  const [reversed, setReversed] = useState(false);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const [undoStack, setUndoStack] = useState<Overlay[][]>([]);
  const [redoStack, setRedoStack] = useState<Overlay[][]>([]);

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
      setDuration(d);
      setStart(0);
      setEnd(d);
      setCurrentTime(0);
    };
    const onTime = () => {
      const t = v.currentTime;
      setCurrentTime(t);
      if (!exportingRef.current && playing && t >= end - 0.05) {
        v.currentTime = start;
        v.play().catch(() => {});
      }
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

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);

  // Thumbnail filmstrip
  useEffect(() => {
    if (!src || !duration || duration <= 0) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    const count = 14;
    const out: string[] = new Array(count).fill("");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const captureAt = (i: number) => new Promise<void>((resolve) => {
      if (cancelled || !ctx) return resolve();
      const t = duration * (i / Math.max(1, count - 1));
      const onSeeked = () => {
        try {
          const w = 120;
          const h = Math.max(68, Math.round((video.videoHeight / Math.max(1, video.videoWidth)) * w));
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          out[i] = canvas.toDataURL("image/jpeg", 0.45);
        } catch {}
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      try { video.currentTime = Math.min(duration - 0.01, Math.max(0, t)); } catch { video.removeEventListener("seeked", onSeeked); resolve(); }
    });
    video.onloadedmetadata = async () => {
      for (let i = 0; i < count; i++) {
        if (cancelled) break;
        await captureAt(i);
        if (!cancelled) setThumbs([...out]);
      }
    };
    return () => { cancelled = true; };
  }, [src, duration]);

  const filterCss = useMemo(() => {
    const preset = FILTERS.find(f => f.id === filterId)?.css || "";
    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) ${preset}`.trim();
  }, [filterId, brightness, contrast, saturate]);

  const activeOverlays = useCallback((t: number) =>
    overlays.filter(o => o.text.trim() || o.kind === "shape")
      .filter(o => t >= o.start && t <= o.end),
  [overlays]);

  const activeCueAt = useCallback((t: number) => {
    for (let i = subtitles.length - 1; i >= 0; i--) {
      const s = subtitles[i];
      if (t >= s.start && t <= s.end && s.text.trim()) return s;
    }
    return null;
  }, [subtitles]);

  // Canvas draw loop (preview)
  useEffect(() => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || !src) return;
    const draw = () => {
      try {
        const w = canvas.width;
        const h = canvas.height;
        const ctx = canvas.getContext("2d");
        if (ctx && v.readyState >= 2) {
          ctx.clearRect(0, 0, w, h);
          ctx.filter = filterCss;
          ctx.drawImage(v, 0, 0, w, h);
          ctx.filter = "none";
          drawOverlays(ctx, w, h, v.currentTime);
          const cue = activeCueAt(v.currentTime);
          if (cue) drawCaption(ctx, w, h, cue.text);
        }
      } catch {}
      if (!exportingRef.current) rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [src, filterCss, overlays, subtitles]);

  const drawOverlays = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    for (const o of activeOverlays(t)) {
      ctx.save();
      const px = o.x * w;
      const py = o.y * h;
      const size = Math.max(10, o.size * h);
      if (o.kind === "shape" && o.shape) {
        ctx.fillStyle = o.color;
        if (o.shape === "circle") {
          ctx.beginPath();
          ctx.arc(px, py, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(px - size / 2, py - size / 2, size, size * 0.62);
        }
      } else {
        ctx.font = `800 ${size}px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const metrics = ctx.measureText(o.text);
        const tw = Math.min(w * 0.9, metrics.width + size * 0.7);
        const th = size * 1.45;
        if (o.bg) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          const r = 10;
          ctx.beginPath();
          ctx.moveTo(px - tw / 2 + r, py - th / 2);
          ctx.lineTo(px + tw / 2 - r, py - th / 2);
          ctx.quadraticCurveTo(px + tw / 2, py - th / 2, px + tw / 2, py - th / 2 + r);
          ctx.lineTo(px + tw / 2, py + th / 2 - r);
          ctx.quadraticCurveTo(px + tw / 2, py + th / 2, px + tw / 2 - r, py + th / 2);
          ctx.lineTo(px - tw / 2 + r, py + th / 2);
          ctx.quadraticCurveTo(px - tw / 2, py + th / 2, px - tw / 2, py + th / 2 - r);
          ctx.lineTo(px - tw / 2, py - th / 2 + r);
          ctx.quadraticCurveTo(px - tw / 2, py - th / 2, px - tw / 2 + r, py - th / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.lineWidth = Math.max(2, size * 0.07);
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.strokeText(o.text, px, py);
        ctx.fillStyle = o.color;
        ctx.fillText(o.text, px, py);
      }
      ctx.restore();
    }
  };

  const drawCaption = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);
    if (!lines.length) return;
    const fontSize = Math.max(18, Math.round(h * 0.045));
    ctx.font = `700 ${fontSize}px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lh = fontSize * 1.25;
    const blockH = lines.length * lh;
    const cy = h * 0.82;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const boxW = Math.min(w * 0.9, maxW + fontSize);
    const boxH = blockH + fontSize * 0.6;
    const yTop = cy - boxH / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect((w - boxW) / 2, yTop, boxW, boxH);
    ctx.fillStyle = "#fff";
    lines.forEach((line, i) => ctx.fillText(line, w / 2, cy - blockH / 2 + lh * (i + 0.5)));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < start || v.currentTime >= end - 0.05) v.currentTime = start;
      v.play().catch(() => {});
    } else v.pause();
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    const nt = clamp(t, 0, duration);
    setCurrentTime(nt);
    if (v) v.currentTime = nt;
  };

  const pxToTime = (clientX: number, el?: HTMLDivElement) => {
    const target = el || timelineRef.current;
    if (!target || duration <= 0) return 0;
    const rect = target.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration / zoom;
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const t = pxToTime(e.clientX);
      const gap = Math.min(0.4, duration * 0.02);
      if (dragging === "start") {
        const ns = Math.min(t, end - gap);
        setStart(Math.max(0, ns));
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, ns);
      } else if (dragging === "end") {
        const ne = Math.max(t, start + gap);
        setEnd(Math.min(duration, ne));
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, ne);
      } else if (dragging === "playhead") {
        const nt = clamp(t, start, end);
        setCurrentTime(nt);
        if (videoRef.current) videoRef.current.currentTime = nt;
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, start, end, duration, zoom]);

  // Overlay dragging on canvas
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const candidates = activeOverlays(videoRef.current?.currentTime || 0).reverse();
    const hit = candidates.find(o => Math.abs(o.x - nx) < 0.16 && Math.abs(o.y - ny) < 0.16);
    if (hit) {
      setSelectedOverlayId(hit.id);
      setDragOverlayId(hit.id);
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    }
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragOverlayId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = clamp((e.clientX - rect.left) / rect.width, 0.05, 0.95);
    const ny = clamp((e.clientY - rect.top) / rect.height, 0.05, 0.95);
    setOverlays(prev => prev.map(o => o.id === dragOverlayId ? { ...o, x: nx, y: ny } : o));
  };
  const onCanvasPointerUp = () => setDragOverlayId(null);

  const pushHistory = () => {
    setUndoStack(prev => [...prev.slice(-19), overlays.map(o => ({ ...o }))]);
    setRedoStack([]);
  };
  const undo = () => {
    const prev = undoStack[undoStack.length - 1];
    if (!prev) return;
    setRedoStack(r => [...r, overlays.map(o => ({ ...o }))]);
    setOverlays(prev);
    setUndoStack(s => s.slice(0, -1));
  };
  const redo = () => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setUndoStack(s => [...s, overlays.map(o => ({ ...o }))]);
    setOverlays(next);
    setRedoStack(s => s.slice(0, -1));
  };

  const addOverlay = (kind: Overlay["kind"], text: string, shape: Overlay["shape"] = null) => {
    pushHistory();
    const t = clamp(videoRef.current?.currentTime || currentTime, start, Math.max(start, end - 0.5));
    const o: Overlay = {
      id: uid(), kind, text, x: 0.5, y: 0.5,
      color: "#ffffff", size: kind === "emoji" ? 0.11 : 0.07,
      bg: kind === "text", shape,
      start: t, end: Math.min(end, t + 3),
    };
    setOverlays(prev => [...prev, o]);
    setSelectedOverlayId(o.id);
  };

  const updateSelectedOverlay = (patch: Partial<Overlay>) => {
    setOverlays(prev => prev.map(o => o.id === selectedOverlayId ? { ...o, ...patch } : o));
  };

  const deleteSelectedOverlay = () => {
    if (!selectedOverlayId) return;
    pushHistory();
    setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  // Audio
  const onMusicFile = (f?: File) => {
    if (!f) return;
    if (musicSrc) URL.revokeObjectURL(musicSrc);
    const url = URL.createObjectURL(f);
    setMusicSrc(url);
    setMusicName(f.name);
    if (musicRef.current) { musicRef.current.src = url; musicRef.current.loop = true; }
  };

  // Subtitles
  const selectedCue = subtitles.find(s => s.id === selectedCueId) || null;
  const addSubtitleCue = () => {
    const t = clamp(currentTime || start, start, Math.max(start, end - 0.5));
    const cue: SubtitleCue = { id: uid(), start: t, end: Math.min(end, t + 2.5), text: "" };
    setSubtitles(prev => [...prev, cue].sort((a, b) => a.start - b.start));
    setSelectedCueId(cue.id);
    setSubtitleDraft("");
    setTool("subtitles");
  };
  const updateSelectedCue = (patch: Partial<SubtitleCue>) => {
    if (!selectedCueId) return;
    setSubtitles(prev => prev.map(s => s.id === selectedCueId ? { ...s, ...patch } : s).sort((a, b) => a.start - b.start));
  };
  const deleteSelectedCue = () => {
    if (!selectedCueId) return;
    setSubtitles(prev => prev.filter(s => s.id !== selectedCueId));
    setSelectedCueId(null);
  };
  const autoDetectSubtitles = async () => {
    if (transcribing) return;
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/subtitles/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to detect subtitles.");
      const cues: SubtitleCue[] = (Array.isArray(data?.cues) ? data.cues : [])
        .map((c: any) => ({
          id: String(c?.id || uid()),
          start: clamp(Number(c?.start) || 0, 0, duration),
          end: clamp(Number(c?.end) || 0, 0, duration),
          text: String(c?.text || "").trim(),
        }))
        .filter((c: SubtitleCue) => c.text && c.end > c.start + 0.05)
        .sort((a: SubtitleCue, b: SubtitleCue) => a.start - b.start);
      if (!cues.length) throw new Error("No speech detected. Try a clip with clearer audio.");
      setSubtitles(cues);
      setSelectedCueId(cues[0].id);
      seekTo(cues[0].start);
    } catch (e: any) {
      setTranscribeError(e?.message || "Failed to detect subtitles.");
    } finally {
      setTranscribing(false);
    }
  };

  const capturePoster = async (): Promise<Blob | null> => {
    const v = videoRef.current;
    if (!v) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.filter = filterCss;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      drawOverlays(ctx, canvas.width, canvas.height, v.currentTime);
      const cue = activeCueAt(v.currentTime);
      if (cue) drawCaption(ctx, canvas.width, canvas.height, cue.text);
      return await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.85));
    } catch { return null; }
  };

  // Capture reversed frame sequence (JPEG blobs) for short clips
  const captureReverseFrames = async (): Promise<Blob[]> => {
    const v = videoRef.current;
    if (!v) return [];
    const span = Math.min(end - start, 10);
    const fps = 15;
    const frames: Blob[] = [];
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 720 / Math.max(1, v.videoWidth));
    canvas.width = Math.max(2, Math.round((v.videoWidth || 720) * scale));
    canvas.height = Math.max(2, Math.round((v.videoHeight || 1280) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return frames;
    const count = Math.max(2, Math.floor(span * fps));

    for (let i = 0; i < count; i++) {
      const t = start + (i / count) * span;
      await new Promise<void>((resolve) => {
        const onSeeked = () => resolve();
        v.addEventListener("seeked", onSeeked, { once: true });
        try { v.currentTime = t; } catch { resolve(); }
        setTimeout(resolve, 1200);
      });
      ctx.filter = filterCss;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      drawOverlays(ctx, canvas.width, canvas.height, v.currentTime);
      const cue = activeCueAt(v.currentTime);
      if (cue) drawCaption(ctx, canvas.width, canvas.height, cue.text);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", 0.75));
      if (blob) frames.push(blob);
    }
    return frames;
  };

  const buildAudioMix = async (ctx: AudioContext, v: HTMLVideoElement): Promise<MediaStreamAudioDestinationNode> => {
    const dest = ctx.createMediaStreamDestination();
    try {
      const vs = (v as any).captureStream ? (v as any).captureStream() : null;
      const tracks = vs && vs.getAudioTracks ? vs.getAudioTracks() : [];
      if (tracks.length) {
        const source = ctx.createMediaStreamSource(new MediaStream(tracks as MediaStreamTrack[]));
        const gain = ctx.createGain();
        gain.gain.value = originalVolume;
        source.connect(gain).connect(dest);
      }
    } catch {}
    try {
      const m = musicRef.current;
      if (m && musicSrc) {
        const ms = (m as any).captureStream ? (m as any).captureStream() : null;
        const tracks = ms && ms.getAudioTracks ? ms.getAudioTracks() : [];
        if (tracks.length) {
          const source = ctx.createMediaStreamSource(new MediaStream(tracks as MediaStreamTrack[]));
          const gain = ctx.createGain();
          gain.gain.value = musicVolume;
          source.connect(gain).connect(dest);
        }
      }
    } catch {}
    return dest;
  };

  const exportVideo = async () => {
    const v = videoRef.current;
    const displayCanvas = canvasRef.current;
    if (!v || !displayCanvas || duration <= 0) return;

    const hasEdits = start > 0.05 || end < duration - 0.05 || overlays.length > 0 ||
      subtitles.length > 0 || filterId !== "none" || brightness !== 1 || contrast !== 1 ||
      saturate !== 1 || speed !== 1 || reversed || !!musicSrc;

    if (!hasEdits) {
      onApply({ file, duration, posterBlob: await capturePoster() });
      return;
    }

    exportingRef.current = true;
    setExporting(true);
    setExportProgress(0);
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let rafId: number | null = null;
    let progressTimer: any = null;

    try {
      if (typeof MediaRecorder === "undefined") throw new Error("Export not supported in this browser.");
      const candidates = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4",
        "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm",
      ];
      let mime = "";
      for (const m of candidates) { if (MediaRecorder.isTypeSupported(m)) { mime = m; break; } }

      const outCanvas = document.createElement("canvas");
      const cw = Math.min(1280, v.videoWidth || 720);
      outCanvas.width = cw;
      outCanvas.height = Math.round(cw * ((v.videoHeight || 1280) / (v.videoWidth || 720)));
      const octx = outCanvas.getContext("2d");
      if (!octx) throw new Error("Canvas not supported.");

      const chunks: Blob[] = [];
      let done: Promise<Blob>;

      if (reversed) {
        const frames = await captureReverseFrames();
        if (!frames.length) throw new Error("Could not capture reversed frames.");

        const audioEl = musicRef.current;
        if (audioEl && musicSrc) { audioEl.currentTime = 0; await audioEl.play().catch(() => {}); }
        audioCtx = new AudioContext();
        const dest = await buildAudioMix(audioCtx, v);
        const canvasStream = outCanvas.captureStream(15);
        stream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
        done = new Promise<Blob>((resolve, reject) => {
          if (!recorder) return reject(new Error("Export failed"));
          recorder!.onerror = () => reject(new Error("Export failed"));
          recorder!.onstop = () => resolve(new Blob(chunks, { type: mime || recorder!.mimeType || "video/webm" }));
        });

        const bitmaps = await Promise.all(frames.map(b => createImageBitmap(b)));
        recorder.start(250);
        let i = 0;
        const total = bitmaps.length;
        const step = () => {
          if (i >= total) { recorder && recorder.state !== "inactive" && recorder.stop(); return; }
          const bmp = bitmaps[total - 1 - i];
          octx.drawImage(bmp, 0, 0, outCanvas.width, outCanvas.height);
          setExportProgress(Math.round((i / total) * 100));
          i++;
          rafId = requestAnimationFrame(step);
        };
        step();
        await done;
        bitmaps.forEach(b => b.close());
      } else {
        const canvasStream = outCanvas.captureStream(30);
        audioCtx = new AudioContext();
        const dest = await buildAudioMix(audioCtx, v);
        stream = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
        done = new Promise<Blob>((resolve, reject) => {
          if (!recorder) return reject(new Error("Export failed"));
          recorder!.onerror = () => reject(new Error("Export failed"));
          recorder!.onstop = () => resolve(new Blob(chunks, { type: mime || recorder!.mimeType || "video/webm" }));
        });

        const poster = await capturePoster();
        const exportStart = Math.max(0, Math.min(start, Math.max(0, duration - 0.1)));
        const exportEnd = Math.max(exportStart + 0.1, Math.min(end, duration));
        v.pause();
        v.currentTime = exportStart;
        await new Promise<void>(res => { const h = () => { v.removeEventListener("seeked", h); res(); }; v.addEventListener("seeked", h); setTimeout(res, 1500); });
        v.playbackRate = speed;

        const draw = () => {
          try {
            octx.clearRect(0, 0, outCanvas.width, outCanvas.height);
            octx.filter = filterCss;
            octx.drawImage(v, 0, 0, outCanvas.width, outCanvas.height);
            octx.filter = "none";
            drawOverlays(octx, outCanvas.width, outCanvas.height, v.currentTime);
            const cue = activeCueAt(v.currentTime);
            if (cue) drawCaption(octx, outCanvas.width, outCanvas.height, cue.text);
          } catch {}
          if (!v.paused && !v.ended && v.currentTime < exportEnd - 0.02) rafId = requestAnimationFrame(draw);
        };

        const audioEl = musicRef.current;
        if (audioEl && musicSrc) { audioEl.currentTime = (exportStart * speed) % (audioEl.duration || 1); await audioEl.play().catch(() => {}); }
        recorder.start(250);
        draw();
        await v.play().catch(() => { throw new Error("Could not play for export."); });

        progressTimer = setInterval(() => {
          const p = clamp(((v.currentTime - exportStart) / Math.max(0.1, exportEnd - exportStart)) * 100, 0, 100);
          setExportProgress(Math.round(p));
        }, 200);

        await new Promise<void>((resolve) => {
          let finished = false;
          const finish = () => { if (finished) return; finished = true; v.removeEventListener("ended", onEnded); clearInterval(stopCheck); resolve(); };
          const onEnded = () => finish();
          v.addEventListener("ended", onEnded);
          const stopCheck = setInterval(() => { if (v.currentTime >= exportEnd - 0.03 || v.ended) { try { v.pause(); } catch {} finish(); } }, 60);
          setTimeout(() => { try { v.pause(); } catch {} finish(); }, Math.max(8000, ((exportEnd - exportStart) / speed + 8) * 1000));
        });

        if (progressTimer) clearInterval(progressTimer);
        setExportProgress(100);
        if (recorder.state !== "inactive") recorder.stop();
        try { if (audioEl) audioEl.pause(); } catch {}
        const blob = await done;
        const finalType = blob.type || mime || "video/webm";
        const ext = finalType.includes("mp4") ? "mp4" : "webm";
        const outName = (file.name.replace(/\.[^.]+$/, "") || "video") + "_edited." + ext;
        const effectiveDuration = (exportEnd - exportStart) / speed;
        onApply({ file: new File([blob], outName, { type: finalType }), duration: effectiveDuration, posterBlob: poster });
        return;
      }

      const blob = await done;
      const finalType = blob.type || mime || "video/webm";
      const ext = finalType.includes("mp4") ? "mp4" : "webm";
      const outName = (file.name.replace(/\.[^.]+$/, "") || "video") + "_edited." + ext;
      const poster = await capturePoster();
      onApply({
        file: new File([blob], outName, { type: finalType }),
        duration: reversed ? (end - start) : (end - start) / speed,
        posterBlob: poster,
      });
    } catch (e) {
      console.error(e);
      alert("Could not export all edits in this browser — uploading the original video instead. Try Chrome on desktop for full editing support.");
      onApply({ file, duration, posterBlob: await capturePoster() });
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      if (rafId) cancelAnimationFrame(rafId);
      try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch {}
      try { stream?.getTracks().forEach(t => t.stop()); } catch {}
      try { void audioCtx?.close(); } catch {}
      try { musicRef.current?.pause(); } catch {}
      exportingRef.current = false;
      setExporting(false);
      if (videoRef.current) videoRef.current.playbackRate = speed;
    }
  };

  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId) || null;
  const span = Math.max(0.1, end - start);
  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 100;
  const playPct = duration ? (currentTime / duration) * 100 : 0;
  const timelineDuration = duration / zoom;

  const TOOLS: { id: Tool; label: string; icon: any }[] = [
    { id: "trim", label: "Trim", icon: Scissors },
    { id: "text", label: "Text", icon: Type },
    { id: "filters", label: "Filters", icon: SlidersHorizontal },
    { id: "audio", label: "Audio", icon: Music2 },
    { id: "speed", label: "Speed", icon: Gauge },
    { id: "stickers", label: "Stickers", icon: Smile },
    { id: "subtitles", label: "Captions", icon: Subtitles },
  ];

  return (
    <div className="fixed inset-0 z-[500] bg-[#060608] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-5 h-[54px] shrink-0 border-b border-white/10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} disabled={exporting} className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white disabled:opacity-40" aria-label="Close editor">
            <X size={24} />
          </button>
          <span className="font-black text-sm tracking-tight">TrooStudio</span>
          <span className="hidden md:inline text-[10px] text-white/35 uppercase tracking-widest">Pro Editor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={undo} disabled={!undoStack.length} className="p-2 text-white/60 hover:text-white disabled:opacity-25" aria-label="Undo"><Undo2 size={17} /></button>
          <button onClick={redo} disabled={!redoStack.length} className="p-2 text-white/60 hover:text-white disabled:opacity-25" aria-label="Redo"><Redo2 size={17} /></button>
          <button onClick={exportVideo} disabled={exporting || duration <= 0} className="ml-1 h-9 px-5 rounded-lg bg-[#0095f6] hover:bg-[#1aa3ff] text-sm font-bold disabled:opacity-40 flex items-center gap-2">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
            {exporting ? "Exporting" : "Export"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-3 lg:p-6 bg-[#060608]">
          <div className="relative w-full max-w-[420px] lg:max-w-[480px] aspect-[9/16] max-h-[46vh] lg:max-h-[68vh] bg-black overflow-hidden rounded-lg">
            <canvas
              ref={canvasRef}
              width={720}
              height={1280}
              className="w-full h-full object-contain touch-none"
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerCancel={onCanvasPointerUp}
            />
            <video ref={videoRef} src={src} playsInline preload="auto" className="hidden" />
            <audio ref={musicRef} src={musicSrc || undefined} className="hidden" />

            <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" aria-label={playing ? "Pause" : "Play"}>
              <span className={`w-14 h-14 rounded-full bg-black/40 backdrop-blur flex items-center justify-center transition-opacity ${playing ? "opacity-0" : "opacity-100"}`}>
                {playing ? <Pause size={26} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
              </span>
            </button>
            <div className="absolute top-2 left-2 text-[10px] font-semibold bg-black/50 px-2 py-1 rounded">{fmt(currentTime)} / {fmt(duration)}</div>
            {reversed && <div className="absolute top-2 right-2 text-[10px] font-bold bg-[#0095f6] px-2 py-1 rounded">REVERSE</div>}
            {speed !== 1 && <div className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/50 px-2 py-1 rounded">{speed}x</div>}
          </div>
        </div>

        {/* Tool panel */}
        <div className="w-full lg:w-[330px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0b0b0e] flex flex-col max-h-[38vh] lg:max-h-none">
          <div className="flex-1 overflow-y-auto p-4">
            {/* TRIM */}
            {tool === "trim" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Trim clip</h3>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-white/50">Keep</span>
                    <span className="font-bold">{fmt(span)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setStart(0); seekTo(0); }} className="text-[11px] px-2 py-1 bg-white/10 rounded">Start 0</button>
                    <button onClick={() => { setEnd(duration); seekTo(duration); }} className="text-[11px] px-2 py-1 bg-white/10 rounded">End max</button>
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-3">
                  <h4 className="text-xs font-bold text-white/70">Timeline zoom</h4>
                  <div className="flex items-center gap-2">
                    <ZoomOut size={14} className="text-white/40" />
                    <input type="range" min={1} max={6} step={0.5} value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="flex-1" />
                    <ZoomIn size={14} className="text-white/40" />
                  </div>
                  <p className="text-[10px] text-white/35">Drag the white handles on the timeline below. Snaps to 0.1s.</p>
                </div>
              </div>
            )}

            {/* TEXT */}
            {tool === "text" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Text overlays</h3>
                <div className="flex gap-2">
                  <input value={textDraft} onChange={e => setTextDraft(e.target.value)} placeholder="Type text…" className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0095f6]" />
                  <button onClick={() => { addOverlay("text", textDraft.trim() || "Your text"); setTextDraft(""); }} className="px-3 rounded-lg bg-[#0095f6] text-sm font-bold"><Plus size={16} /></button>
                </div>
                <div className="space-y-2">
                  {overlays.filter(o => o.kind === "text").map(o => (
                    <button key={o.id} onClick={() => { setSelectedOverlayId(o.id); seekTo(o.start); }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs ${selectedOverlayId === o.id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}>
                      <span className="font-semibold">{o.text}</span>
                      <span className="block text-white/40 text-[10px]">{fmt(o.start)} – {fmt(o.end)}</span>
                    </button>
                  ))}
                  {!overlays.some(o => o.kind === "text") && <p className="text-[11px] text-white/35">No text yet. Add one, then drag it on the preview.</p>}
                </div>
                {selectedOverlay && (
                  <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
                    <input value={selectedOverlay.text} onChange={e => updateSelectedOverlay({ text: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none" />
                    <div className="flex items-center gap-2 flex-wrap">
                      {["#ffffff", "#000000", "#ff3b5c", "#ffd93d", "#4ade80", "#60a5fa", "#c084fc"].map(c => (
                        <button key={c} onClick={() => updateSelectedOverlay({ color: c })} className={`w-6 h-6 rounded-full border-2 ${selectedOverlay.color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
                      ))}
                    </div>
                    <label className="flex items-center justify-between text-xs text-white/60">
                      Size <span>{Math.round(selectedOverlay.size * 100)}</span>
                      <input type="range" min={0.03} max={0.2} step={0.005} value={selectedOverlay.size} onChange={e => updateSelectedOverlay({ size: parseFloat(e.target.value) })} className="w-32" />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/60">
                      <input type="checkbox" checked={selectedOverlay.bg} onChange={e => updateSelectedOverlay({ bg: e.target.checked })} /> Background box
                    </label>
                    <button onClick={deleteSelectedOverlay} className="flex items-center gap-1 text-xs text-red-400"><Trash2 size={13} /> Delete text</button>
                  </div>
                )}
              </div>
            )}

            {/* FILTERS */}
            {tool === "filters" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Filters & color</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map(f => (
                    <button key={f.id} onClick={() => setFilterId(f.id)} className={`px-3 py-2 rounded-lg text-xs font-semibold border ${filterId === f.id ? "bg-[#0095f6]/25 border-[#0095f6] text-white" : "bg-white/5 border-white/10 text-white/60"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
                  {([["Brightness", brightness, setBrightness, 0.4, 1.8], ["Contrast", contrast, setContrast, 0.4, 2], ["Saturation", saturate, setSaturate, 0, 2.5]] as const).map(([label, val, setter, min, max]) => (
                    <label key={label as string} className="block text-xs text-white/60">
                      <div className="flex justify-between"><span>{label}</span><span>{Number(val).toFixed(2)}</span></div>
                      <input type="range" min={min} max={max} step={0.05} value={val} onChange={e => setter(parseFloat(e.target.value))} className="w-full mt-1" />
                    </label>
                  ))}
                  <button onClick={() => { setBrightness(1); setContrast(1); setSaturate(1); setFilterId("none"); }} className="text-[11px] text-[#7dd3fc]">Reset adjustments</button>
                </div>
              </div>
            )}

            {/* AUDIO */}
            {tool === "audio" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Music & audio</h3>
                <button onClick={() => musicInputRef.current?.click()} className="w-full py-3 rounded-xl border border-dashed border-white/20 bg-white/5 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10">
                  <Music2 size={16} /> {musicName || "Add music track"}
                </button>
                <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={e => onMusicFile(e.target.files?.[0])} />
                {musicSrc && (
                  <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[180px]">{musicName}</span>
                      <button onClick={() => { setMusicSrc(""); setMusicName(""); }} className="text-red-400"><Trash2 size={13} /></button>
                    </div>
                    <label className="block text-xs text-white/60">Music volume <span>{Math.round(musicVolume * 100)}%</span>
                      <input type="range" min={0} max={1} step={0.05} value={musicVolume} onChange={e => setMusicVolume(parseFloat(e.target.value))} className="w-full mt-1" />
                    </label>
                  </div>
                )}
                <label className="block text-xs text-white/60">Original audio <span>{Math.round(originalVolume * 100)}%</span>
                  <input type="range" min={0} max={1} step={0.05} value={originalVolume} onChange={e => setOriginalVolume(parseFloat(e.target.value))} className="w-full mt-1" />
                </label>
                <p className="text-[10px] text-white/35">Music is mixed into the exported video.</p>
              </div>
            )}

            {/* SPEED */}
            {tool === "speed" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Speed & direction</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[0.25, 0.5, 1, 2].map(s => (
                    <button key={s} onClick={() => setSpeed(s)} className={`py-2 rounded-lg text-xs font-bold border ${speed === s ? "bg-[#0095f6]/25 border-[#0095f6]" : "bg-white/5 border-white/10 text-white/60"}`}>{s}x</button>
                  ))}
                </div>
                <input type="range" min={0.25} max={3} step={0.25} value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full" />
                <button onClick={() => setReversed(v => !v)} className={`w-full py-3 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 ${reversed ? "bg-[#0095f6]/25 border-[#0095f6]" : "bg-white/5 border-white/10"}`}>
                  <Undo2 size={16} /> {reversed ? "Reverse ON" : "Reverse video"}
                </button>
                <p className="text-[10px] text-white/35">Reverse works on clips up to 10 seconds. Export time may be longer.</p>
              </div>
            )}

            {/* STICKERS */}
            {tool === "stickers" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Stickers & shapes</h3>
                <div className="grid grid-cols-5 gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => addOverlay("emoji", e)} className="aspect-square rounded-lg bg-white/5 border border-white/10 text-xl hover:bg-white/10">{e}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addOverlay("shape", "", "rect")} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-center gap-2"><Square size={14} /> Square</button>
                  <button onClick={() => addOverlay("shape", "", "circle")} className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-xs flex items-center justify-center gap-2"><Circle size={14} /> Circle</button>
                </div>
                {selectedOverlay && (
                  <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {["#ffffff", "#ff3b5c", "#ffd93d", "#4ade80", "#60a5fa", "#c084fc"].map(c => (
                        <button key={c} onClick={() => updateSelectedOverlay({ color: c })} className={`w-6 h-6 rounded-full border-2 ${selectedOverlay.color === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />
                      ))}
                    </div>
                    <label className="block text-xs text-white/60">Size
                      <input type="range" min={0.04} max={0.3} step={0.01} value={selectedOverlay.size} onChange={e => updateSelectedOverlay({ size: parseFloat(e.target.value) })} className="w-full mt-1" />
                    </label>
                    <button onClick={deleteSelectedOverlay} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                  </div>
                )}
              </div>
            )}

            {/* SUBTITLES */}
            {tool === "subtitles" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Captions</h3>
                  <div className="flex gap-2">
                    <button onClick={autoDetectSubtitles} disabled={transcribing} className="text-[11px] px-2 py-1.5 rounded-full bg-[#0095f6]/20 text-[#7dd3fc] flex items-center gap-1 disabled:opacity-40">
                      {transcribing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Auto-detect
                    </button>
                    <button onClick={addSubtitleCue} className="text-[11px] px-2 py-1.5 rounded-full bg-white/10 flex items-center gap-1"><Plus size={12} /> Add</button>
                  </div>
                </div>
                {transcribeError && <p className="text-[11px] text-red-300">{transcribeError}</p>}
                <div className="space-y-2">
                  {subtitles.map((s, i) => (
                    <button key={s.id} onClick={() => { setSelectedCueId(s.id); seekTo(s.start); }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs ${selectedCueId === s.id ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}>
                      <span className="text-white/40">#{i + 1}</span> {s.text || "(empty)"}
                      <span className="block text-white/35 text-[10px]">{fmt(s.start)} – {fmt(s.end)}</span>
                    </button>
                  ))}
                  {!subtitles.length && <p className="text-[11px] text-white/35">Add captions manually or auto-detect speech.</p>}
                </div>
                {selectedCue && (
                  <div className="space-y-2 rounded-xl bg-white/5 border border-white/10 p-3">
                    <textarea rows={3} value={selectedCue.text} onChange={e => setSubtitles(prev => prev.map(s => s.id === selectedCue.id ? { ...s, text: e.target.value } : s))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                    <div className="flex justify-between text-[11px] text-white/50">
                      <span>{fmt(selectedCue.start)}</span><span>{fmt(selectedCue.end)}</span>
                    </div>
                    <input type="range" min={start} max={end} step={0.1} value={selectedCue.start} onChange={e => updateSelectedCue({ start: parseFloat(e.target.value) })} className="w-full" />
                    <input type="range" min={start} max={end} step={0.1} value={selectedCue.end} onChange={e => updateSelectedCue({ end: parseFloat(e.target.value) })} className="w-full" />
                    <button onClick={deleteSelectedCue} className="text-xs text-red-400 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="shrink-0 border-t border-white/10 bg-[#08080a] px-3 py-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}>
        <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
          {TOOLS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTool(t.id)} className={`flex flex-col items-center gap-0.5 min-w-[58px] px-1 py-1.5 rounded-lg ${tool === t.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"}`}>
                <Icon size={18} />
                <span className="text-[9px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>

        <div
          ref={timelineRef}
          className="relative h-12 rounded-md overflow-hidden bg-black/50 border border-white/10 touch-none select-none"
          onPointerDown={(e) => {
            const t = pxToTime(e.clientX);
            const ds = Math.abs(t - start);
            const de = Math.abs(t - end);
            const dp = Math.abs(t - currentTime);
            const target = ds < 0.35 ? "start" : de < 0.35 ? "end" : "playhead";
            setDragging(dp < ds && dp < de && target === "playhead" ? "playhead" : target);
            (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            if (target !== "start" && target !== "end") seekTo(t);
          }}
        >
          <div className="absolute inset-0 flex" style={{ width: `${zoom * 100}%` }}>
            {(thumbs.length ? thumbs : Array.from({ length: 14 }).map(() => "")).map((t, i) => (
              <div key={i} className="flex-1 h-full border-r border-black/40 bg-white/5 overflow-hidden">
                {t ? <img src={t} alt="" className="w-full h-full object-cover opacity-80" /> : null}
              </div>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${startPct}%` }} />
          <div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${100 - endPct}%` }} />
          <div className="absolute inset-y-0 border-y-2 border-white" style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
          {(["start", "end"] as const).map((h) => (
            <div key={h} className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center cursor-ew-resize z-20" style={{ left: h === "start" ? `${startPct}%` : `${endPct}%` }} onPointerDown={(e) => { e.stopPropagation(); setDragging(h); }}>
              <div className="w-2.5 h-8 rounded-sm bg-white" />
            </div>
          ))}
          <div className="absolute inset-y-0 w-[2px] bg-[#0095f6] z-10" style={{ left: `${playPct}%` }} />

          {/* Overlay clips */}
          {overlays.map(o => (
            <div key={o.id} className="absolute bottom-0 h-2 bg-[#c084fc]/80 z-10 pointer-events-none" style={{ left: `${(o.start / duration) * 100}%`, width: `${((o.end - o.start) / duration) * 100}%` }} />
          ))}
          {subtitles.map(s => (
            <div key={s.id} className="absolute top-0 h-1.5 bg-[#4ade80]/80 z-10 pointer-events-none" style={{ left: `${(s.start / duration) * 100}%`, width: `${((s.end - s.start) / duration) * 100}%` }} />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-white/35 mt-1">
          <span>0:00</span>
          <span>{fmt(timelineDuration)}</span>
        </div>
      </div>

      {exporting && (
        <div className="absolute inset-0 z-[600] bg-black/80 flex items-center justify-center">
          <div className="w-72 rounded-2xl bg-[#121216] border border-white/10 p-5">
            <p className="text-sm font-bold mb-1">Rendering your masterpiece…</p>
            <p className="text-[11px] text-white/45 mb-4">Burning filters, text, music and effects</p>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0095f6] transition-all" style={{ width: `${exportProgress}%` }} />
            </div>
            <p className="text-right text-xs font-bold mt-2">{exportProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
