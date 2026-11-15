"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, Pause, Play, Plus, Scissors, Subtitles, Trash2, Type, X } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (result: { file: File; duration: number; posterBlob?: Blob | null }) => void;
};

type SubtitleCue = {
  id: string;
  start: number;
  end: number;
  text: string;
};

type Mode = "trim" | "subtitles";

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }

function formatTimeShort(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTimeMs(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function VideoEditor({ file, onCancel, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [dragging, setDragging] = useState<"start" | "end" | "playhead" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("trim");
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const exportingRef = useRef(false);

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
      setEnd(d);
      setStart(0);
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

  useEffect(() => {
    if (!src || !duration || duration <= 0) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    const count = 12;
    const out: string[] = new Array(count).fill("");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const captureAt = (i: number) =>
      new Promise<void>((resolve) => {
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
        // eslint-disable-next-line no-await-in-loop
        await captureAt(i);
        if (!cancelled) setThumbs([...out]);
      }
    };
    return () => { cancelled = true; };
  }, [src, duration]);

  const selectedDuration = Math.max(0, end - start);
  const isTrimmed = start > 0.05 || end < duration - 0.05;
  const activeSubtitles = useMemo(
    () => subtitles.filter(s => s.text.trim() && s.end > s.start),
    [subtitles]
  );
  const hasSubtitles = activeSubtitles.length > 0;

  const pxToTime = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration;
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const t = pxToTime(e.clientX);
      const minGap = Math.min(0.5, duration * 0.02);
      if (dragging === "start") {
        const ns = Math.min(t, end - minGap);
        setStart(Math.max(0, ns));
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, ns);
      } else if (dragging === "end") {
        const ne = Math.max(t, start + minGap);
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
  }, [dragging, start, end, duration]);

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
    const nt = clamp(t, start, end);
    setCurrentTime(nt);
    if (v) v.currentTime = nt;
  };

  const addSubtitleCue = () => {
    const t = clamp(currentTime || start, start, Math.max(start, end - 0.5));
    const cue: SubtitleCue = { id: uid(), start: t, end: Math.min(end, t + 2.5), text: "" };
    setSubtitles(prev => [...prev, cue].sort((a,b)=>a.start-b.start));
    setSelectedCueId(cue.id);
    setSubtitleDraft("");
    setMode("subtitles");
  };

  const selectedCue = subtitles.find(s => s.id === selectedCueId) || null;

  useEffect(() => {
    if (selectedCue) setSubtitleDraft(selectedCue.text);
  }, [selectedCueId]);

  const updateSelectedCue = (patch: Partial<SubtitleCue>) => {
    if (!selectedCueId) return;
    setSubtitles(prev => prev.map(s => s.id === selectedCueId ? { ...s, ...patch } : s).sort((a,b)=>a.start-b.start));
  };

  const commitSubtitleText = (text: string) => {
    setSubtitleDraft(text);
    if (selectedCueId) updateSelectedCue({ text });
  };

  const deleteSelectedCue = () => {
    if (!selectedCueId) return;
    setSubtitles(prev => prev.filter(s => s.id !== selectedCueId));
    setSelectedCueId(null);
    setSubtitleDraft("");
  };

  const activeCueAt = (t: number) => {
    // last match wins for simplicity
    for (let i = activeSubtitles.length - 1; i >= 0; i--) {
      const s = activeSubtitles[i];
      if (t >= s.start && t <= s.end) return s;
    }
    return null;
  };

  const activePreviewCue = activeCueAt(currentTime);

  const capturePoster = async (): Promise<Blob | null> => {
    const v = videoRef.current;
    if (!v) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth || 1280;
      canvas.height = v.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    } catch { return null; }
  };

  const drawSubtitleOnCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number, text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);
    if (!lines.length) return;
    const fontSize = Math.max(24, Math.round(h * 0.045));
    ctx.font = `700 ${fontSize}px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineHeight = fontSize * 1.25;
    const blockH = lines.length * lineHeight;
    const centerY = h * 0.78;
    const paddingX = fontSize * 0.6;
    const paddingY = fontSize * 0.35;
    const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const boxW = Math.min(w * 0.9, maxLineW + paddingX * 2);
    const boxH = blockH + paddingY * 2;
    const x = w / 2;
    const yTop = centerY - blockH / 2 - paddingY;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const r = 12;
    ctx.beginPath();
    ctx.moveTo(x - boxW/2 + r, yTop);
    ctx.lineTo(x + boxW/2 - r, yTop);
    ctx.quadraticCurveTo(x + boxW/2, yTop, x + boxW/2, yTop + r);
    ctx.lineTo(x + boxW/2, yTop + boxH - r);
    ctx.quadraticCurveTo(x + boxW/2, yTop + boxH, x + boxW/2 - r, yTop + boxH);
    ctx.lineTo(x - boxW/2 + r, yTop + boxH);
    ctx.quadraticCurveTo(x - boxW/2, yTop + boxH, x - boxW/2, yTop + boxH - r);
    ctx.lineTo(x - boxW/2, yTop + r);
    ctx.quadraticCurveTo(x - boxW/2, yTop, x - boxW/2 + r, yTop);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    lines.forEach((line, i) => {
      const y = centerY - blockH / 2 + lineHeight * (i + 0.5);
      ctx.fillText(line, x, y);
    });
  };

  const exportTrimmed = async () => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const needsCanvas = hasSubtitles; // burn subtitles via canvas
    if (!isTrimmed && !needsCanvas) {
      const poster = await capturePoster();
      onApply({ file, duration, posterBlob: poster });
      return;
    }

    exportingRef.current = true;
    setExporting(true);
    setExportProgress(0);
    let progressTimer: any = null;
    let stopCheck: any = null;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let rafId: any = null;

    try {
      if (typeof MediaRecorder === "undefined") throw new Error("Video export not supported in this browser");

      const mimeCandidates = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      let mimeType = "";
      for (const m of mimeCandidates) { if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; } }

      // Use canvas when burning subtitles; otherwise prefer captureStream for perf
      if (!needsCanvas) {
        try {
          const vs = (v as any).captureStream ? (v as any).captureStream() : null;
          if (vs && vs.getVideoTracks && vs.getVideoTracks().length > 0) stream = vs as MediaStream;
        } catch {}
      }

      let canvas: HTMLCanvasElement | null = null;
      let ctx: CanvasRenderingContext2D | null = null;
      if (!stream) {
        canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 1280;
        canvas.height = v.videoHeight || 720;
        ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        const canvasStream = canvas.captureStream(30);
        stream = canvasStream;
        try {
          const vs = (v as any).captureStream ? (v as any).captureStream() : null;
          const audioTracks = vs ? vs.getAudioTracks() : [];
          if (audioTracks && audioTracks.length > 0) {
            stream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
          }
        } catch {}
      }

      const chunks: Blob[] = [];
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      const done = new Promise<Blob>((resolve, reject) => {
        if (!recorder) return reject(new Error("Export failed"));
        recorder.onerror = () => reject(new Error("Export failed"));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || recorder?.mimeType || "video/webm" }));
      });

      const wasMuted = v.muted;
      const prevVolume = v.volume;
      v.pause();
      v.currentTime = start;
      await new Promise<void>((res) => { const h = () => { v.removeEventListener("seeked", h); res(); }; v.addEventListener("seeked", h); });
      const poster = await capturePoster();

      v.muted = wasMuted;
      v.volume = prevVolume;

      const exportStart = Math.max(0, Math.min(start, Math.max(0, duration - 0.1)));
      const exportEnd = Math.max(exportStart + 0.1, Math.min(end, duration));
      let exportStarted = v.currentTime >= exportStart - 0.05;

      if (canvas && ctx) {
        const draw = () => {
          try {
            ctx!.drawImage(v, 0, 0, canvas!.width, canvas!.height);
            const cue = activeCueAt(v.currentTime);
            if (cue) drawSubtitleOnCanvas(ctx!, canvas!.width, canvas!.height, cue.text);
          } catch {}
          if (!v.paused && !v.ended && v.currentTime < exportEnd - 0.02) rafId = requestAnimationFrame(draw);
        };
        (stream as any).__draw = draw;
      }

      recorder.start(250);
      if ((stream as any).__draw) (stream as any).__draw();
      await v.play().catch(() => { throw new Error("Could not play video for export"); });

      progressTimer = setInterval(() => {
        const prog = clamp(((v.currentTime - exportStart) / Math.max(0.1, exportEnd - exportStart)) * 100, 0, 100);
        setExportProgress(Math.round(prog));
      }, 200);

      await new Promise<void>((resolve) => {
        let finished = false;
        const cleanup = () => { v.removeEventListener("ended", onEnded); if (stopCheck) clearInterval(stopCheck); };
        const finish = () => { if (finished) return; finished = true; cleanup(); resolve(); };
        const onEnded = () => finish();
        v.addEventListener("ended", onEnded);
        stopCheck = setInterval(() => {
          if (v.currentTime >= exportStart - 0.02) exportStarted = true;
          if (exportStarted && (v.currentTime >= exportEnd - 0.03 || v.ended)) { try { v.pause(); } catch {} finish(); }
        }, 50);
        setTimeout(() => { try { v.pause(); } catch {} finish(); }, Math.max(7000, (exportEnd - exportStart + 8) * 1000));
      });

      if (progressTimer) clearInterval(progressTimer);
      if (rafId) cancelAnimationFrame(rafId);
      setExportProgress(100);

      if (recorder.state !== "inactive") recorder.stop();
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}

      const blob = await done;
      const finalType = blob.type || mimeType || "video/webm";
      const ext = finalType.includes("mp4") ? "mp4" : "webm";
      const outName = (file.name.replace(/\.[^.]+$/, "") || "video") + `${isTrimmed || hasSubtitles ? "_edited" : ""}.${ext}`;
      const outFile = new File([blob], outName, { type: finalType });
      const actualExportDuration = Math.max(0.1, exportEnd - exportStart);
      onApply({ file: outFile, duration: actualExportDuration, posterBlob: poster });
    } catch (err) {
      console.error(err);
      alert("Could not export edited video in this browser. Uploading original video instead. For best results, try Chrome on desktop.");
      try { v.pause(); } catch {}
      const poster = await capturePoster();
      onApply({ file, duration, posterBlob: poster });
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      if (stopCheck) clearInterval(stopCheck);
      if (rafId) cancelAnimationFrame(rafId);
      try { if (recorder && recorder.state !== "inactive") recorder.stop(); } catch {}
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 100;
  const playPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[500] bg-black text-white flex flex-col">
      {/* Top bar (Instagram-like) */}
      <div className="flex items-center justify-between px-4 h-[52px]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button onClick={onCancel} disabled={exporting} className="w-10 h-10 flex items-center justify-center text-white disabled:opacity-40" aria-label="Back">
          <ChevronLeft size={28} />
        </button>
        <div className="text-sm font-semibold tracking-wide">Edit</div>
        <button onClick={exportTrimmed} disabled={exporting || duration <= 0} className="h-8 px-4 rounded-lg bg-[#0095f6] hover:bg-[#1aa3ff] text-white text-sm font-semibold disabled:opacity-40">
          {exporting ? "..." : "Next"}
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 min-h-0 px-4 pt-1 pb-2 flex items-center justify-center">
        <div className="relative w-full max-w-[420px] aspect-[9/16] max-h-[62vh] bg-[#111] rounded-lg overflow-hidden">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              playsInline
              className="w-full h-full object-contain bg-black"
              onClick={togglePlay}
            />
          ) : null}

          {/* Subtitle preview overlay */}
          {activePreviewCue && (
            <div className="absolute left-0 right-0 bottom-[14%] px-6 flex justify-center pointer-events-none">
              <div className="max-w-full bg-black/45 rounded-md px-3 py-1.5 text-center">
                <p className="text-white text-[15px] leading-snug font-semibold whitespace-pre-line break-words">{activePreviewCue.text}</p>
              </div>
            </div>
          )}

          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center"
            aria-label={playing ? "Pause" : "Play"}
          >
            <span className={`w-14 h-14 rounded-full bg-black/35 backdrop-blur-[1px] flex items-center justify-center transition-opacity ${playing ? "opacity-0" : "opacity-100"}`}>
              <Play size={28} fill="white" className="text-white ml-1" />
            </span>
          </button>

          <div className="absolute top-3 right-3 text-[11px] font-semibold text-white/90 bg-black/40 px-2 py-1 rounded">
            {formatTimeMs(currentTime)}
          </div>
        </div>
      </div>

      {/* Timeline / tools area */}
      <div className="px-3 pb-2">
        {mode === "trim" && (
          <div className="rounded-xl bg-[#121212] border border-white/10 p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-white/60 font-medium">Trim</span>
              <span className="text-xs text-white/80 font-semibold">{formatTimeShort(selectedDuration)}</span>
            </div>
            <div
              ref={timelineRef}
              className="relative h-14 rounded-lg overflow-hidden bg-black/40 border border-white/10 touch-none select-none"
              onPointerDown={(e) => {
                const t = pxToTime(e.clientX);
                const distStart = Math.abs(t - start);
                const distEnd = Math.abs(t - end);
                const distPlay = Math.abs(t - currentTime);
                const target = distPlay < distStart && distPlay < distEnd ? "playhead" : (distStart < distEnd ? "start" : "end");
                setDragging(target);
                (e.currentTarget as any).setPointerCapture?.(e.pointerId);
                if (target === "playhead" && videoRef.current) {
                  const nt = clamp(t, start, end);
                  videoRef.current.currentTime = nt;
                }
              }}
            >
              <div className="absolute inset-0 flex">
                {(thumbs.length ? thumbs : Array.from({ length: 12 }).map(() => "")).map((t, i) => (
                  <div key={i} className="flex-1 h-full border-r border-black/30 last:border-r-0 bg-white/5 overflow-hidden">
                    {t ? <img src={t} alt="" className="w-full h-full object-cover opacity-85" /> : null}
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: `${startPct}%` }} />
              <div className="absolute inset-y-0 right-0 bg-black/55" style={{ width: `${100 - endPct}%` }} />
              <div className="absolute inset-y-0 border-y-2 border-[#f5f5f5]" style={{ left: `${startPct}%`, right: `${100 - endPct}%` }} />
              <div
                className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center cursor-ew-resize z-20"
                style={{ left: `${startPct}%` }}
                onPointerDown={(e) => { e.stopPropagation(); setDragging("start"); }}
              >
                <div className="w-2.5 h-9 rounded-sm bg-white" />
              </div>
              <div
                className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center cursor-ew-resize z-20"
                style={{ left: `${endPct}%` }}
                onPointerDown={(e) => { e.stopPropagation(); setDragging("end"); }}
              >
                <div className="w-2.5 h-9 rounded-sm bg-white" />
              </div>
              <div className="absolute inset-y-0 w-[2px] bg-[#0095f6] z-10" style={{ left: `${playPct}%` }} />
            </div>
          </div>
        )}

        {mode === "subtitles" && (
          <div className="rounded-xl bg-[#121212] border border-white/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60 font-medium">Subtitles</span>
              <button onClick={addSubtitleCue} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold">
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {subtitles.length === 0 && (
                <div className="text-xs text-white/40 py-2">Add captions at the current time.</div>
              )}
              {subtitles.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedCueId(s.id); seekTo(s.start); }}
                  className={`shrink-0 min-w-[110px] max-w-[160px] text-left px-2.5 py-2 rounded-lg border ${selectedCueId === s.id ? "bg-white/15 border-white/30" : "bg-white/5 border-white/10"}`}
                >
                  <div className="text-[10px] text-white/50 font-semibold">Caption {idx + 1}</div>
                  <div className="text-[11px] text-white/85 truncate">{s.text?.trim() || "(empty)"}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{formatTimeShort(s.start)}–{formatTimeShort(s.end)}</div>
                </button>
              ))}
            </div>

            {selectedCue ? (
              <div className="space-y-2">
                <textarea
                  value={subtitleDraft}
                  onChange={(e) => commitSubtitleText(e.target.value)}
                  placeholder="Type subtitle text..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-white/60">
                    Start ({formatTimeShort(selectedCue.start)})
                    <input
                      type="range"
                      min={start}
                      max={Math.max(start, selectedCue.end - 0.2)}
                      step={0.1}
                      value={selectedCue.start}
                      onChange={(e) => updateSelectedCue({ start: parseFloat(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </label>
                  <label className="text-[11px] text-white/60">
                    End ({formatTimeShort(selectedCue.end)})
                    <input
                      type="range"
                      min={Math.min(end, selectedCue.start + 0.2)}
                      max={end}
                      step={0.1}
                      value={selectedCue.end}
                      onChange={(e) => updateSelectedCue({ end: parseFloat(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={() => seekTo(selectedCue.start)} className="text-xs text-[#7dd3fc] font-semibold">Preview</button>
                  <button onClick={deleteSelectedCue} className="inline-flex items-center gap-1 text-xs text-red-400 font-semibold"><Trash2 size={13} /> Delete</button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Select or add a caption to edit text and timing. Captions are burned into the exported video.</p>
            )}
          </div>
        )}
      </div>

      {/* Bottom tools (Instagram-like strip) */}
      <div className="border-t border-white/10 bg-black" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}>
        <div className="flex items-center justify-around px-4 py-2">
          <button
            onClick={() => setMode("trim")}
            className={`flex flex-col items-center gap-1 min-w-[64px] ${mode === "trim" ? "text-white" : "text-white/50"}`}
          >
            <Scissors size={22} />
            <span className="text-[11px] font-medium">Trim</span>
          </button>
          <button
            onClick={() => { setMode("subtitles"); if (!selectedCueId && subtitles[0]) setSelectedCueId(subtitles[0].id); }}
            className={`flex flex-col items-center gap-1 min-w-[64px] ${mode === "subtitles" ? "text-white" : "text-white/50"}`}
          >
            <Subtitles size={22} />
            <span className="text-[11px] font-medium">Subtitles</span>
          </button>
          <button
            onClick={addSubtitleCue}
            className="flex flex-col items-center gap-1 min-w-[64px] text-white/50"
          >
            <Type size={22} />
            <span className="text-[11px] font-medium">Caption</span>
          </button>
        </div>

        {exporting && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-white/70">Exporting edit…</span>
              <span className="text-xs font-semibold text-white">{exportProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0095f6] transition-all duration-200" style={{ width: `${exportProgress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
