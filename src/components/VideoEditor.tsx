"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Scissors, RotateCcw, Check, X } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (result: { file: File; duration: number; posterBlob?: Blob | null }) => void;
};

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${ms}`;
}

function formatTimeShort(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

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
      // Loop preview only in normal playback, never during export recording
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

  // Generate lightweight timeline thumbnails
  useEffect(() => {
    if (!src || !duration || duration <= 0) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.src = src;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    const count = 10;
    const out: string[] = new Array(count).fill("");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const captureAt = (i: number) =>
      new Promise<void>((resolve) => {
        if (cancelled || !ctx) return resolve();
        const t = duration * (i / Math.max(1, count - 1));
        const onSeeked = () => {
          try {
            const w = 160;
            const h = Math.max(90, Math.round((video.videoHeight / Math.max(1, video.videoWidth)) * w));
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            out[i] = canvas.toDataURL("image/jpeg", 0.5);
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

  const pxToTime = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
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
        const nt = Math.min(end, Math.max(start, t));
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
    } else {
      v.pause();
    }
  };

  const resetTrim = () => {
    setStart(0);
    setEnd(duration);
    if (videoRef.current) videoRef.current.currentTime = 0;
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
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    } catch {
      return null;
    }
  };

  const exportTrimmed = async () => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    // If not trimmed, just apply original
    if (!isTrimmed) {
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
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(m)) { mimeType = m; break; }
      }

      // Prefer capturing the playing video element directly (better perf/sync than canvas redraw),
      // especially important for longer clips (e.g. 3+ minutes).
      try {
        const vs = (v as any).captureStream ? (v as any).captureStream() : null;
        if (vs && vs.getVideoTracks && vs.getVideoTracks().length > 0) {
          stream = vs as MediaStream;
        }
      } catch {}

      if (!stream) {
        // Fallback: canvas redraw (more CPU intensive)
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth || 1280;
        canvas.height = v.videoHeight || 720;
        const ctx = canvas.getContext("2d");
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
        // draw loop for canvas fallback
        const draw = () => {
          if (!stream || !(stream as any).__canvas) return;
          try { ctx.drawImage(v, 0, 0, canvas.width, canvas.height); } catch {}
          if (!v.paused && !v.ended && v.currentTime < end - 0.03) requestAnimationFrame(draw);
        };
        (stream as any).__canvas = canvas;
        (stream as any).__draw = draw;
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
      await new Promise<void>((res) => {
        const h = () => { v.removeEventListener("seeked", h); res(); };
        v.addEventListener("seeked", h);
      });

      // Seek poster frame for thumbnail at start of trimmed range
      const poster = await capturePoster();

      // For element captureStream, keep audio audible state as needed by browser; restore after.
      v.muted = wasMuted;
      v.volume = prevVolume;

      recorder.start(250);
      if ((stream as any).__draw) (stream as any).__draw();
      const exportStart = Math.max(0, Math.min(start, Math.max(0, duration - 0.1)));
      const exportEnd = Math.max(exportStart + 0.1, Math.min(end, duration));
      let exportStarted = v.currentTime >= exportStart - 0.05;
      await v.play().catch(() => { throw new Error("Could not play video for export"); });

      progressTimer = setInterval(() => {
        const prog = Math.min(100, Math.max(0, ((v.currentTime - exportStart) / Math.max(0.1, exportEnd - exportStart)) * 100));
        setExportProgress(Math.round(prog));
      }, 200);

      await new Promise<void>((resolve) => {
        let finished = false;
        const cleanup = () => {
          v.removeEventListener("ended", onEnded);
          if (stopCheck) clearInterval(stopCheck);
        };
        const finish = () => {
          if (finished) return;
          finished = true;
          cleanup();
          resolve();
        };
        const onEnded = () => finish();
        v.addEventListener("ended", onEnded);
        stopCheck = setInterval(() => {
          if (v.currentTime >= exportStart - 0.02) exportStarted = true;
          if (exportStarted && (v.currentTime >= exportEnd - 0.03 || v.ended)) {
            try { v.pause(); } catch {}
            finish();
          }
        }, 50);
        // safety timeout (real-time export + buffer)
        setTimeout(() => {
          try { v.pause(); } catch {}
          finish();
        }, Math.max(7000, (exportEnd - exportStart + 8) * 1000));
      });

      if (progressTimer) clearInterval(progressTimer);
      setExportProgress(100);

      if (recorder.state !== "inactive") recorder.stop();
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}

      const blob = await done;
      const finalType = blob.type || mimeType || "video/webm";
      const ext = finalType.includes("mp4") ? "mp4" : "webm";
      const outName = (file.name.replace(/\.[^.]+$/, "") || "video") + `_trimmed.${ext}`;
      const outFile = new File([blob], outName, { type: finalType });
      const actualExportDuration = Math.max(0.1, exportEnd - exportStart);
      onApply({ file: outFile, duration: actualExportDuration, posterBlob: poster });
    } catch (err) {
      console.error(err);
      alert("Could not export trimmed video in this browser. Uploading original video instead. For best results, try Chrome on desktop.");
      try {
        v.pause();
      } catch {}
      const poster = await capturePoster();
      onApply({ file, duration, posterBlob: poster });
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      if (stopCheck) clearInterval(stopCheck);
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
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
        <button onClick={onCancel} disabled={exporting} className="p-2 rounded-full bg-white/5 border border-white/10 text-white/80 disabled:opacity-40">
          <X size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-white tracking-tight flex items-center justify-center gap-2"><Scissors size={16} className="text-[#E53945]" /> Edit Video</p>
          <p className="text-[11px] text-white/50">Drag handles to trim</p>
        </div>
        <button onClick={resetTrim} disabled={exporting || !isTrimmed} className="p-2 rounded-full bg-white/5 border border-white/10 text-white/80 disabled:opacity-30" aria-label="Reset trim">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 pt-3 gap-4 overflow-y-auto">
        <div className="relative w-full aspect-[9/16] max-h-[52vh] mx-auto bg-[#0b0b0d] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              playsInline
              className="w-full h-full object-contain bg-black"
              onClick={togglePlay}
            />
          ) : null}
          <button
            onClick={togglePlay}
            className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white">
            {formatTime(currentTime)} / {formatTimeShort(duration)}
          </div>
        </div>

        <div className="bg-[#121214] border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-bold">Selected</p>
              <p className="text-lg font-black text-white">{formatTime(selectedDuration)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-white/40 font-bold">Trim</p>
              <p className="text-xs font-semibold text-white/70">{formatTime(start)} – {formatTime(end)}</p>
            </div>
          </div>

          <div
            ref={timelineRef}
            className="relative h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 touch-none select-none"
            onPointerDown={(e) => {
              const t = pxToTime(e.clientX);
              const distStart = Math.abs(t - start);
              const distEnd = Math.abs(t - end);
              const distPlay = Math.abs(t - currentTime);
              const target = distPlay < distStart && distPlay < distEnd ? "playhead" : (distStart < distEnd ? "start" : "end");
              setDragging(target);
              (e.currentTarget as any).setPointerCapture?.(e.pointerId);
              if (target === "playhead" && videoRef.current) {
                const nt = Math.min(end, Math.max(start, t));
                videoRef.current.currentTime = nt;
              }
            }}
          >
            <div className="absolute inset-0 flex">
              {(thumbs.length ? thumbs : Array.from({ length: 10 }).map(() => "")).map((t, i) => (
                <div key={i} className="flex-1 h-full border-r border-black/30 last:border-r-0 bg-white/5 overflow-hidden">
                  {t ? <img src={t} alt="" className="w-full h-full object-cover opacity-80" /> : null}
                </div>
              ))}
            </div>

            {/* Dim outside selection */}
            <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: `${startPct}%` }} />
            <div className="absolute inset-y-0 right-0 bg-black/60" style={{ width: `${100 - endPct}%` }} />

            {/* Selection border */}
            <div className="absolute inset-y-0 border-y-2 border-[#E53945]" style={{ left: `${startPct}%`, right: `${100 - endPct}%` }} />

            {/* Start handle */}
            <div
              className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center cursor-ew-resize z-20"
              style={{ left: `${startPct}%` }}
              onPointerDown={(e) => { e.stopPropagation(); setDragging("start"); }}
            >
              <div className="w-2.5 h-10 rounded-full bg-[#E53945] shadow-[0_0_0_2px_rgba(0,0,0,0.4)] border border-white/30" />
            </div>
            {/* End handle */}
            <div
              className="absolute inset-y-0 w-4 -ml-2 flex items-center justify-center cursor-ew-resize z-20"
              style={{ left: `${endPct}%` }}
              onPointerDown={(e) => { e.stopPropagation(); setDragging("end"); }}
            >
              <div className="w-2.5 h-10 rounded-full bg-[#E53945] shadow-[0_0_0_2px_rgba(0,0,0,0.4)] border border-white/30" />
            </div>

            {/* Playhead */}
            <div className="absolute inset-y-0 w-[2px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10" style={{ left: `${playPct}%` }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white" />
            </div>
          </div>

          <p className="text-[11px] text-white/45 mt-2">Tip: drag the red handles to shorten or lengthen your video. Tap the timeline to move the playhead. Export runs in real time for the selected length.</p>
        </div>

        {exporting ? (
          <div className="w-full bg-[#121214] border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">Applying trim…</span>
              <span className="text-sm font-black text-[#E53945]">{exportProgress}%</span>
            </div>
            <div className="w-full h-2 bg-black rounded-full overflow-hidden">
              <div className="h-full bg-[#E53945] transition-all duration-200" style={{ width: `${exportProgress}%` }} />
            </div>
            <p className="text-[11px] text-white/40 mt-2">Creating your edited clip. Keep this screen open.</p>
          </div>
        ) : (
          <div className="flex gap-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)" }}>
            <button onClick={onCancel} className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition">
              Cancel
            </button>
            <button onClick={exportTrimmed} className="flex-[1.4] py-3.5 rounded-xl bg-[#E53945] hover:bg-[#d12e39] text-white font-bold transition flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(229,57,69,0.25)]">
              <Check size={18} /> {isTrimmed ? "Apply Trim" : "Use Video"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
