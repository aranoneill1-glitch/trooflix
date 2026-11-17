"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, ChevronDown, Loader2, Music2, Pause, Play, Plus,
  Scissors, Sparkles, Trash2, Type, X,
} from "lucide-react";
import { getCachedUser, getCachedVideos } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (result: { file: File; duration: number; posterBlob?: Blob | null }) => void;
};

type LibraryVideo = { id: number; title: string; videoUrl: string; posterUrl: string };

type TextOverlay = {
  id: string;
  text: string;
  font: string;
  color: string;
  hasBox: boolean;
  boxColor: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
};

type AudioOverlay = {
  sourceUri: string;
  startOffset: number;
  volume: number;
  startTime: number;
  endTime: number;
  label: string;
};

type EditState = {
  video: { uri: string; name: string; trimStart: number; trimEnd: number; cuts: number[] };
  audioOverlay: AudioOverlay | null;
  textOverlays: TextOverlay[];
};

const FONTS = [
  { id: "Inter", label: "Inter", css: "'Inter', Arial, sans-serif", weight: 800 },
  { id: "Georgia", label: "Serif", css: "Georgia, 'Times New Roman', serif", weight: 700 },
  { id: "Courier", label: "Typewriter", css: "'Courier New', Courier, monospace", weight: 700 },
  { id: "Impact", label: "Impact", css: "Impact, 'Arial Black', sans-serif", weight: 400 },
  { id: "Comic", label: "Handwriting", css: "'Comic Sans MS', cursive", weight: 700 },
  { id: "ArialBlack", label: "Bold", css: "'Arial Black', Arial, sans-serif", weight: 900 },
];
const COLORS = ["#ffffff", "#000000", "#ff3b5c", "#ffd93d", "#4ade80", "#60a5fa", "#c084fc", "#ff8a3d"];
const BOX_COLORS = ["rgba(0,0,0,0.7)", "rgba(255,255,255,0.85)", "rgba(229,57,69,0.8)", "rgba(96,165,250,0.8)"];

function haptic(ms = 10) {
  try { (navigator as any).vibrate?.(ms); } catch {}
}
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function fontCss(id: string, size: number) {
  const f = FONTS.find(x => x.id === id) || FONTS[0];
  return `${f.weight} ${size}px ${f.css}`;
}

export default function InstagramStudio({ file, onCancel, onApply }: Props) {
  const [phase, setPhase] = useState<"picker" | "editor">("editor");
  const [library, setLibrary] = useState<LibraryVideo[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [textComposerOpen, setTextComposerOpen] = useState(false);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [hasBox, setHasBox] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [edit, setEdit] = useState<EditState>({
    video: { uri: "", name: "video.mp4", trimStart: 0, trimEnd: 0, cuts: [] },
    audioOverlay: null,
    textOverlays: [],
  });
  const sourceFileRef = useRef<File | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioElRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number | null>(null);
  const exportingRef = useRef(false);
  const dragRef = useRef<{ id: string; sx: number; sy: number; x: number; y: number } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number; rotation: number; angle0: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const touchStartRef = useRef<number | null>(null);

  useEffect(() => { exportingRef.current = exporting; }, [exporting]);

  const loadLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const [u, videos] = await Promise.all([getCachedUser(), getCachedVideos().catch(() => [])]);
      const mine = (Array.isArray(videos) ? videos : [])
        .filter((v: any) => u && String(v.uploaderUserId) === String(u.id) && (v.videoUrl || v.bitchuteUrl))
        .sort((a: any, b: any) => b.id - a.id)
        .slice(0, 60)
        .map((v: any) => ({
          id: v.id,
          title: v.title || "Video",
          videoUrl: v.videoUrl || v.bitchuteUrl,
          posterUrl: v.posterUrl || v.backdropUrl || "",
        }));
      setLibrary(mine);
    } catch {}
    setLoadingLibrary(false);
  }, []);
  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  // Open the picked video straight into the 9:16 editor.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    sourceFileRef.current = file;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    const done = () => {
      const d = isFinite(probe.duration) ? probe.duration : 0;
      setEdit({
        video: { uri: url, name: file.name || "video.mp4", trimStart: 0, trimEnd: d || 15, cuts: [] },
        audioOverlay: null,
        textOverlays: [],
      });
    };
    probe.addEventListener("loadedmetadata", done, { once: true });
    probe.addEventListener("error", done, { once: true });
    const timer = setTimeout(done, 4000);
    return () => { clearTimeout(timer); probe.src = ""; };
  }, [file]);

  const proxyUrl = (url: string) => url.startsWith("/") ? url : `/api/proxy-video?url=${encodeURIComponent(url)}`;

  const openVideo = async (item: { uri: string; name: string }) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(item.uri);
      if (!res.ok) throw new Error("Could not load video");
      const blob = await res.blob();
      const file = new File([blob], item.name, { type: blob.type || "video/mp4" });
      sourceFileRef.current = file;
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.src = url;
      const dur = await new Promise<number>(resolve => {
        const done = () => resolve(isFinite(probe.duration) ? probe.duration : 0);
        probe.addEventListener("loadedmetadata", done, { once: true });
        setTimeout(done, 4000);
      });
      setEdit({
        video: { uri: url, name: item.name, trimStart: 0, trimEnd: dur || 15, cuts: [] },
        audioOverlay: null,
        textOverlays: [],
      });
      setPhase("editor");
    } catch (e) {
      alert("Could not open that video. Try choosing it from your device.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const onDeviceFile = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) { alert("Please choose a video file."); return; }
    void openVideo({ uri: URL.createObjectURL(f), name: f.name || "video.mp4" });
  };

  // Probe duration once in editor
  useEffect(() => {
    if (phase !== "editor" || !edit.video.uri) return;
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      if (d > 0) setEdit(prev => ({ ...prev, video: { ...prev.video, trimEnd: d } }));
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [phase, edit.video.uri]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); } else v.pause();
  };

  const seek = (t: number) => {
    const nt = clamp(t, 0, edit.video.trimEnd);
    if (videoRef.current) videoRef.current.currentTime = nt;
  };

  const duration = edit.video.trimEnd || 1;
  const trimSpan = Math.max(0.1, edit.video.trimEnd - edit.video.trimStart);

  const activeTextAt = useCallback((t: number) =>
    edit.textOverlays.filter(o => t >= o.startTime && t <= o.endTime), [edit.textOverlays]);

  // Draw text overlays to canvas for export
  const drawText = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    for (const o of activeTextAt(t)) {
      ctx.save();
      const size = 0.075 * h * o.scale;
      ctx.translate(o.x * w, o.y * h);
      ctx.rotate((o.rotation * Math.PI) / 180);
      ctx.font = fontCss(o.font, size);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const m = ctx.measureText(o.text);
      const tw = Math.min(w * 0.95, m.width + size * 0.8);
      const th = size * 1.5;
      if (o.hasBox) {
        ctx.fillStyle = o.boxColor;
        ctx.fillRect(-tw / 2, -th / 2, tw, th);
      }
      ctx.lineWidth = Math.max(2, size * 0.07);
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.strokeText(o.text, 0, 0);
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, 0, 0);
      ctx.restore();
    }
  };

  // Export with trim/cuts, burned-in text and mixed audio
  const publish = async () => {
    const v = videoRef.current;
    if (!v || !edit.video.uri) return;
    exportingRef.current = true;
    setExporting(true);
    setExportProgress(0);
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let raf: number | null = null;
    let timer: any = null;
    let audioCtx: AudioContext | null = null;

    try {
      const mimes = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      let mime = "";
      for (const m of mimes) if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }

      const canvas = document.createElement("canvas");
      const cw = Math.min(1080, v.videoWidth || 720);
      canvas.width = cw;
      canvas.height = Math.round(cw * ((v.videoHeight || 1280) / (v.videoWidth || 720)));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      // Build audio mix: original video audio + optional overlay audio
      audioCtx = new AudioContext();
      await audioCtx.resume();
      const dest = audioCtx.createMediaStreamDestination();
      try {
        const vs = (v as any).captureStream ? (v as any).captureStream() : null;
        const tracks = vs && vs.getAudioTracks ? vs.getAudioTracks() : [];
        if (tracks.length) {
          const src = audioCtx.createMediaStreamSource(new MediaStream(tracks as MediaStreamTrack[]));
          const gain = audioCtx.createGain();
          gain.gain.value = 1;
          src.connect(gain).connect(dest);
        }
      } catch {}
      const overlayEl = audioElRef.current;
      if (edit.audioOverlay && overlayEl) {
        try {
          overlayEl.currentTime = edit.audioOverlay.startOffset;
          overlayEl.volume = edit.audioOverlay.volume;
          const os = audioCtx.createMediaElementSource(overlayEl);
          const gain = audioCtx.createGain();
          gain.gain.value = edit.audioOverlay.volume;
          os.connect(gain).connect(dest);
          await overlayEl.play().catch(() => {});
        } catch {}
      }

      const cstream = canvas.captureStream(30);
      stream = new MediaStream([...cstream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
      const chunks: Blob[] = [];
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
      const done = new Promise<Blob>((resolve, reject) => {
        if (!recorder) return reject(new Error("Export failed"));
        recorder!.onerror = () => reject(new Error("Export failed"));
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mime || recorder!.mimeType || "video/webm" }));
      });

      // Poster from current frame
      let posterBlob: Blob | null = null;
      try {
        const pc = document.createElement("canvas");
        pc.width = v.videoWidth || 720; pc.height = v.videoHeight || 1280;
        const pctx = pc.getContext("2d");
        if (pctx) { pctx.drawImage(v, 0, 0, pc.width, pc.height); drawText(pctx, pc.width, pc.height, v.currentTime); posterBlob = await new Promise(r => pc.toBlob(r, "image/jpeg", 0.85)); }
      } catch {}

      const cuts = [...edit.video.cuts].sort((a, b) => a - b);
      const inCut = (t: number) => {
        for (let i = 0; i + 1 < cuts.length; i += 2) if (t >= cuts[i] && t < cuts[i + 1]) return cuts[i + 1];
        if (cuts.length % 2 === 1 && t >= cuts[cuts.length - 1]) return edit.video.trimEnd;
        return null;
      };

      v.pause();
      v.currentTime = edit.video.trimStart;
      await new Promise<void>(res => { const h = () => { v.removeEventListener("seeked", h); res(); }; v.addEventListener("seeked", h); setTimeout(res, 1500); });

      let finished = false;
      const draw = () => {
        if (finished) return;
        try {
          let t = v.currentTime;
          const skipTo = inCut(t);
          if (skipTo !== null && skipTo < edit.video.trimEnd - 0.05) { v.currentTime = skipTo; t = skipTo; }
          const w = canvas.width, h = canvas.height;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(v, 0, 0, w, h);
          drawText(ctx, w, h, t);
        } catch {}
        raf = requestAnimationFrame(draw);
      };
      recorder.start(250);
      draw();
      await v.play().catch(() => { throw new Error("Could not play video for export"); });
      timer = setInterval(() => setExportProgress(Math.round(clamp(((v.currentTime - edit.video.trimStart) / trimSpan) * 100, 0, 100))), 200);
      await new Promise<void>(resolve => {
        const finish = () => { if (finished) return; finished = true; v.removeEventListener("ended", onEnded); clearInterval(stop); resolve(); };
        const onEnded = () => finish();
        v.addEventListener("ended", onEnded);
        const stop = setInterval(() => {
          if (v.currentTime >= edit.video.trimEnd - 0.05 || v.ended) { try { v.pause(); } catch {} finish(); }
        }, 60);
        setTimeout(() => { try { v.pause(); } catch {} finish(); }, Math.max(8000, (trimSpan + 8) * 1000));
      });
      if (timer) clearInterval(timer);
      setExportProgress(100);
      if (recorder.state !== "inactive") recorder.stop();
      try { overlayEl?.pause(); } catch {}
      const blob = await done;
      const type = blob.type || mime || "video/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const name = (edit.video.name.replace(/\.[^.]+$/, "") || "video") + "_edited." + ext;
      onApply({ file: new File([blob], name, { type }), duration: trimSpan, posterBlob });
    } catch (e) {
      console.error(e);
      alert("Could not export with edits in this browser — uploading the original instead. Chrome on desktop works best.");
      onApply({ file: sourceFileRef.current || new File([], edit.video.name), duration: trimSpan });
    } finally {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearInterval(timer);
      try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch {}
      try { stream?.getTracks().forEach(t => t.stop()); } catch {}
      try { void audioCtx?.close(); } catch {}
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const addTextOverlay = () => {
    const text = draftText.trim() || "Your text";
    const t = clamp(videoRef.current?.currentTime || 0, 0, Math.max(0, duration - 0.5));
    const o: TextOverlay = {
      id: uid(), text, font: selectedFont, color: selectedColor,
      hasBox, boxColor: "rgba(0,0,0,0.7)", x: 0.5, y: 0.45,
      scale: 1, rotation: 0, startTime: t, endTime: Math.min(duration, t + 4),
    };
    setEdit(prev => ({ ...prev, textOverlays: [...prev.textOverlays, o] }));
    setSelectedOverlayId(o.id);
    setDraftText("");
    setTextComposerOpen(false);
  };

  const updateOverlay = (patch: Partial<TextOverlay>) => setEdit(prev => ({
    ...prev,
    textOverlays: prev.textOverlays.map(o => o.id === selectedOverlayId ? { ...o, ...patch } : o),
  }));

  const onOverlayDown = (e: React.PointerEvent, o: TextOverlay) => {
    e.stopPropagation();
    setSelectedOverlayId(o.id);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), scale: o.scale, rotation: o.rotation, angle0: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) };
      dragRef.current = null;
    } else {
      dragRef.current = { id: o.id, sx: e.clientX, sy: e.clientY, x: o.x, y: o.y };
    }
  };
  const onOverlayMove = (e: React.PointerEvent) => {
    const host = videoRef.current?.parentElement;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current && selectedOverlayId) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      updateOverlay({
        scale: clamp(pinchRef.current.scale * dist / Math.max(1, pinchRef.current.distance), 0.4, 3),
        rotation: pinchRef.current.rotation + (angle - pinchRef.current.angle0) * 180 / Math.PI,
      });
      return;
    }
    const d = dragRef.current;
    if (d) updateOverlay({
      x: clamp(d.x + (e.clientX - d.sx) / rect.width, 0.03, 0.97),
      y: clamp(d.y + (e.clientY - d.sy) / rect.height, 0.03, 0.97),
    });
  };
  const onOverlayUp = () => { dragRef.current = null; pinchRef.current = null; pointersRef.current.clear(); };

  const applyAudio = async (uri: string, label: string) => {
    setEdit(prev => ({
      ...prev,
      audioOverlay: {
        sourceUri: uri, startOffset: 0, volume: 0.8,
        startTime: 0, endTime: prev.video.trimEnd, label,
      },
    }));
    setAudioPickerOpen(false);
    if (audioElRef.current) { audioElRef.current.src = uri; audioElRef.current.loop = true; }
  };

  const waveform = useMemo(() => {
    const n = 44;
    return Array.from({ length: n }, (_, i) => 18 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43)) * 60);
  }, []);

  const pxToTime = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || !duration) return 0;
    const r = el.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1) * duration;
  };
  const onTimelineDown = (e: React.PointerEvent) => {
    const t = pxToTime(e.clientX);
    seek(t);
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  };

  // Editor screen
  return (
    <div className="fixed inset-0 z-[600] bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button onClick={onCancel} disabled={exporting} className="p-1 disabled:opacity-40"><ArrowLeft size={24} /></button>
        <span className="text-sm font-semibold">New video</span>
        <button onClick={publish} disabled={exporting} className="flex items-center gap-1 text-sm font-bold text-[#0095f6] disabled:opacity-40">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Check size={18} />}
          {exporting ? "Saving" : "Publish"}
        </button>
      </div>

      {/* Preview surface */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        onTouchStart={e => { touchStartRef.current = e.touches[0].clientY; }}
        onTouchEnd={e => {
          if (touchStartRef.current === null) return;
          const dy = e.changedTouches[0].clientY - touchStartRef.current;
          if (dy < -50) setPanelOpen(true);
          if (dy > 50 && textComposerOpen) setTextComposerOpen(false);
          touchStartRef.current = null;
        }}
      >
        <div className="relative w-full h-full max-w-[480px] mx-auto">
          <video
            ref={videoRef}
            src={edit.video.uri}
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
            onClick={togglePlay}
          />
          <audio ref={audioElRef} src={edit.audioOverlay?.sourceUri || undefined} className="hidden" />

          {/* Text overlays */}
          {edit.textOverlays.map(o => {
            const selected = selectedOverlayId === o.id;
            return (
              <div
                key={o.id}
                onPointerDown={e => { haptic(); onOverlayDown(e, o); }}
                onPointerMove={onOverlayMove}
                onPointerUp={onOverlayUp}
                onPointerCancel={onOverlayUp}
                className="absolute select-none touch-none whitespace-pre z-20"
                style={{
                  left: `${o.x * 100}%`, top: `${o.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${o.scale}) rotate(${o.rotation}deg)`,
                  font: fontCss(o.font, 18), color: o.color,
                  background: o.hasBox ? o.boxColor : "transparent",
                  padding: o.hasBox ? "4px 8px" : 0,
                  outline: selected ? "1px solid rgba(255,255,255,0.9)" : "none",
                  outlineOffset: selected ? "7px" : 0,
                }}
              >
                {o.text}
                {selected && (
                  <>
                    <span className="absolute -top-[11px] -left-[11px] w-1.5 h-1.5 rounded-full bg-white border border-black/30" />
                    <span className="absolute -top-[11px] -right-[11px] w-1.5 h-1.5 rounded-full bg-white border border-black/30" />
                    <span className="absolute -bottom-[11px] -left-[11px] w-1.5 h-1.5 rounded-full bg-white border border-black/30" />
                    <span className="absolute -bottom-[11px] -right-[11px] w-1.5 h-1.5 rounded-full bg-white border border-black/30" />
                  </>
                )}
              </div>
            );
          })}


          <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-2 py-0.5 rounded pointer-events-none">{fmt(videoRef.current?.currentTime || 0)}</div>
        </div>
      </div>

      {/* Text composer (Screen 4) — IG font / color / box order, ease-out rise */}
      <AnimatePresence>
        {textComposerOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="shrink-0 border-t border-white/10 bg-[#0c0c0e] px-3 py-2"
          >
            <div className="flex gap-2.5 items-center overflow-x-auto pb-2.5 scrollbar-hide">
              <button onClick={() => { haptic(); document.getElementById("ig-font-select")?.click(); }} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-white/20 text-white text-[15px] font-serif font-bold active:opacity-60" title="Font">Aa</button>
              <select id="ig-font-select" value={selectedFont} onChange={e => { haptic(); setSelectedFont(e.target.value); if (selectedOverlayId) updateOverlay({ font: e.target.value }); }} className="hidden">
                {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <div className="flex gap-1.5 shrink-0">
                {COLORS.map(c => (
                  <button key={c} onClick={() => { haptic(); setSelectedColor(c); if (selectedOverlayId) updateOverlay({ color: c }); }} className={`w-6 h-6 rounded-full border-2 active:scale-90 transition-transform ${selectedColor === c ? "border-white" : "border-white/20"}`} style={{ background: c }} />
                ))}
              </div>
              <button onClick={() => { haptic(); setHasBox(v => { if (selectedOverlayId) updateOverlay({ hasBox: !v }); return !v; }); }} className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-md border active:opacity-60 text-[13px] font-bold ${hasBox ? "bg-white text-black border-white" : "border-white/20 text-white"}`} title="Background box">A▣</button>
            </div>
            <div className="flex gap-2 items-center">
              <input autoFocus value={draftText} onChange={e => setDraftText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addTextOverlay(); }} placeholder="Type a caption…" className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none" />
              <button onClick={() => { haptic(); addTextOverlay(); }} className="shrink-0 text-[#0095f6] text-sm font-bold active:opacity-60">Done</button>
            </div>
            <p className="text-[10px] text-white/35 text-center mt-1.5">Drag text to move · pinch to resize &amp; rotate</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom toolbar (Screen 2) — IG: Audio + Text only */}
      {!textComposerOpen && !panelOpen && (
        <div className="shrink-0 bg-black" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
          <button onClick={() => { haptic(); setPanelOpen(true); }} className="mx-auto flex flex-col items-center gap-0.5 pt-1.5 pb-1 text-white/45 active:opacity-60" aria-label="Open timeline">
            <ChevronDown size={16} className="rotate-180" />
          </button>
          <div className="flex items-start justify-center gap-16 pt-1">
            <button onClick={() => { haptic(); setAudioPickerOpen(true); }} className="flex flex-col items-center gap-1.5 min-w-[64px] text-white active:opacity-60 active:scale-95 transition-transform">
              <Music2 size={25} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">Audio</span>
            </button>
            <button onClick={() => { haptic(); setTextComposerOpen(true); }} className="flex flex-col items-center gap-1.5 min-w-[64px] text-white active:opacity-60 active:scale-95 transition-transform">
              <span className="text-[25px] leading-[25px] font-serif font-bold">Aa</span>
              <span className="text-[10px] font-medium">Text</span>
            </button>
          </div>
        </div>
      )}

      {/* Timeline panel (Screen 5) — spring pull-up with slight overshoot */}
      <AnimatePresence>
      {panelOpen && !textComposerOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.9 }}
          className="shrink-0 bg-[#1c1c1e] border-t border-white/10 px-3 py-3 max-h-[42vh] overflow-y-auto rounded-t-2xl"
        >
          <div className="w-9 h-1 bg-white/25 rounded-full mx-auto mb-2" />
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => setPanelOpen(false)} className="text-white/50"><ChevronDown size={18} /></button>
            <span className="text-xs font-bold">Timeline</span>
            <button
              onClick={() => {
                const t = clamp(videoRef.current?.currentTime || 0, 0, duration);
                setEdit(prev => ({ ...prev, video: { ...prev.video, cuts: [...prev.video.cuts, t].sort((a, b) => a - b) } }));
              }}
              className="text-[11px] font-bold text-[#0095f6] flex items-center gap-1"><Scissors size={13} /> Split</button>
          </div>

          <div
            ref={timelineRef}
            onPointerDown={onTimelineDown}
            className="relative h-12 rounded-sm overflow-hidden bg-black/60 border border-white/10 touch-none select-none"
          >
            <div className="absolute inset-0 flex opacity-70">
              {Array.from({ length: 16 }, (_, i) => <div key={i} className="flex-1 border-r border-black/50 bg-white/5" />)}
            </div>
            <div className="absolute inset-y-0 left-0 bg-black/65" style={{ width: `${(edit.video.trimStart / duration) * 100}%` }} />
            <div className="absolute inset-y-0 right-0 bg-black/65" style={{ width: `${(1 - edit.video.trimEnd / duration) * 100}%` }} />
            <div className="absolute inset-y-0 border-y-2 border-white" style={{ left: `${(edit.video.trimStart / duration) * 100}%`, width: `${((edit.video.trimEnd - edit.video.trimStart) / duration) * 100}%` }} />
            {edit.video.cuts.map((c, i) => <div key={i} className="absolute inset-y-0 w-[2px] bg-[#ff3b5c] z-10" style={{ left: `${(c / duration) * 100}%` }} />)}
            {edit.textOverlays.map(o => <div key={o.id} className="absolute bottom-0 h-2 bg-[#c084fc] z-10 pointer-events-none" style={{ left: `${(o.startTime / duration) * 100}%`, width: `${((o.endTime - o.startTime) / duration) * 100}%` }} />)}
            <div className="absolute inset-y-0 w-[2px] bg-[#0095f6] z-20" style={{ left: `${((videoRef.current?.currentTime || 0) / duration) * 100}%` }} />
            {(["trimStart", "trimEnd"] as const).map(h => (
              <div key={h} className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center z-30 bg-white/20" style={{ left: `${(edit.video[h] / duration) * 100}%` }}
                onPointerDown={e => {
                  e.stopPropagation();
                  const move = (ev: PointerEvent) => {
                    const t = pxToTime(ev.clientX);
                    setEdit(prev => ({ ...prev, video: { ...prev.video, [h]: h === "trimStart" ? Math.min(t, prev.video.trimEnd - 0.5) : Math.max(t, prev.video.trimStart + 0.5) } }));
                  };
                  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
              ><div className="w-1.5 h-7 bg-white rounded-sm" /></div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-white/35 mt-1"><span>0:00</span><span>{fmt(duration)}</span></div>

          {/* Text track */}
          <div className="mt-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Text clips</p>
            {edit.textOverlays.length === 0 && <p className="text-[10px] text-white/25">No text overlays yet.</p>}
            <div className="space-y-1">
              {edit.textOverlays.map(o => (
                <div key={o.id} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1.5">
                  <button onClick={() => setSelectedOverlayId(o.id)} className="flex-1 text-left text-[11px] truncate">{o.text}</button>
                  <span className="text-[9px] text-white/40">{fmt(o.startTime)}–{fmt(o.endTime)}</span>
                  <button onClick={() => setEdit(prev => ({ ...prev, textOverlays: prev.textOverlays.filter(x => x.id !== o.id) }))} className="text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Audio track */}
          <div className="mt-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Audio overlay</p>
            {edit.audioOverlay ? (
              <div className="bg-white/5 rounded p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] truncate max-w-[60%]">{edit.audioOverlay.label}</span>
                  <button onClick={() => setEdit(prev => ({ ...prev, audioOverlay: null }))} className="text-red-400"><Trash2 size={13} /></button>
                </div>
                <div className="flex items-end gap-[2px] h-8">
                  {waveform.map((h, i) => <span key={i} className="flex-1 bg-[#0095f6]/70 rounded-sm" style={{ height: `${h}%` }} />)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/45 w-12">Volume</span>
                  <input type="range" min={0} max={1} step={0.05} value={edit.audioOverlay.volume} onChange={e => setEdit(prev => prev.audioOverlay ? ({ ...prev, audioOverlay: { ...prev.audioOverlay, volume: parseFloat(e.target.value) } }) : prev)} className="flex-1" />
                  <span className="text-[10px] w-8 text-right">{Math.round(edit.audioOverlay.volume * 100)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/45 w-12">Offset</span>
                  <input type="range" min={0} max={Math.max(1, duration)} step={0.1} value={edit.audioOverlay.startOffset} onChange={e => setEdit(prev => prev.audioOverlay ? ({ ...prev, audioOverlay: { ...prev.audioOverlay, startOffset: parseFloat(e.target.value) } }) : prev)} className="flex-1" />
                  <span className="text-[10px] w-8 text-right">{fmt(edit.audioOverlay.startOffset)}</span>
                </div>
              </div>
            ) : (
              <button onClick={() => setAudioPickerOpen(true)} className="w-full py-2 rounded bg-white/5 border border-white/10 text-[11px] font-semibold flex items-center justify-center gap-1"><Music2 size={13} /> Add audio from another video</button>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Audio picker (Screen 3) */}
      {audioPickerOpen && (
        <div className="absolute inset-0 z-[700] bg-[#08080a] flex flex-col">
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <button onClick={() => setAudioPickerOpen(false)}><X size={22} /></button>
            <span className="font-bold text-sm">Choose a sound</span>
            <button onClick={() => audioInputRef.current?.click()} className="text-[#0095f6] text-xs font-bold">Audio file</button>
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-[2px] p-[2px] content-start">
            {library.map(v => (
              <button key={v.id} onClick={() => void applyAudio(proxyUrl(v.videoUrl), v.title)} className="relative aspect-square bg-white/5 overflow-hidden">
                {v.posterUrl ? <img src={v.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <Music2 size={20} className="m-auto text-white/30" />}
                <span className="absolute bottom-1 left-1 right-1 text-[9px] truncate bg-black/60 px-1">{v.title}</span>
              </button>
            ))}
          </div>
          <input ref={audioInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void applyAudio(URL.createObjectURL(f), f.name); e.currentTarget.value = ""; }} />
        </div>
      )}

      {exporting && (
        <div className="absolute inset-0 z-[800] bg-black/85 flex items-center justify-center">
          <div className="w-64 text-center">
            <p className="text-sm font-bold mb-1">Publishing…</p>
            <p className="text-[10px] text-white/45 mb-4">Applying trim, cuts, audio and text</p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#0095f6]" style={{ width: `${exportProgress}%` }} /></div>
            <p className="text-xs mt-2">{exportProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
