"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Loader2, Pause, Play, Scissors, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

type Props = {
  file: File;
  onCancel: () => void;
  onApply: (result: { file: File; duration: number; posterBlob?: Blob | null }) => void;
};

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function haptic() { try { (navigator as any).vibrate?.(10); } catch {} }

export default function InstagramStudio({ file, onCancel, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const exportingRef = useRef(false);
  const sourceRef = useRef(file);

  const [src, setSrc] = useState("");
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cuts, setCuts] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [dragging, setDragging] = useState<"start" | "end" | "playhead" | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    sourceRef.current = file;
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = isFinite(v.duration) ? v.duration : 0;
      setDuration(d);
      setTrimStart(0);
      setTrimEnd(d);
    };
    const onTime = () => {
      const t = v.currentTime;
      setPlaying(!v.paused);
      if (!exportingRef.current) {
        const skip = cutTarget(t);
        if (skip !== null && skip < trimEnd - 0.05) { v.currentTime = skip; return; }
        if (t >= trimEnd - 0.05) { v.currentTime = trimStart; v.play().catch(() => {}); }
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", () => setPlaying(true));
    v.addEventListener("pause", () => setPlaying(false));
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [src, trimStart, trimEnd, cuts]);

  // Thumbnail strip
  useEffect(() => {
    if (!src || !(duration > 0)) return;
    let cancelled = false;
    const v = document.createElement("video");
    v.src = src; v.muted = true; v.playsInline = true; v.preload = "auto";
    const count = 18;
    const out: string[] = new Array(count).fill("");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const grab = (i: number) => new Promise<void>(resolve => {
      if (cancelled || !ctx) return resolve();
      const t = (duration * i) / Math.max(1, count - 1);
      const done = () => {
        try {
          const w = 80;
          const h = Math.max(45, Math.round((v.videoHeight / Math.max(1, v.videoWidth)) * w));
          canvas.width = w; canvas.height = h;
          ctx.drawImage(v, 0, 0, w, h);
          out[i] = canvas.toDataURL("image/jpeg", 0.45);
        } catch {}
        v.removeEventListener("seeked", done);
        resolve();
      };
      v.addEventListener("seeked", done);
      try { v.currentTime = Math.min(duration - 0.01, Math.max(0, t)); } catch { v.removeEventListener("seeked", done); resolve(); }
      setTimeout(() => { v.removeEventListener("seeked", done); resolve(); }, 2500);
    });
    v.onloadedmetadata = async () => {
      for (let i = 0; i < count; i++) { if (cancelled) break; await grab(i); if (!cancelled) setThumbs([...out]); }
    };
    return () => { cancelled = true; v.src = ""; };
  }, [src, duration]);

  const sortedCuts = () => [...cuts].sort((a, b) => a - b);
  const cutTarget = (t: number) => {
    const c = sortedCuts();
    for (let i = 0; i + 1 < c.length; i += 2) if (t >= c[i] && t < c[i + 1]) return c[i + 1];
    if (c.length % 2 === 1 && t >= c[c.length - 1]) return trimEnd;
    return null;
  };

  const timeAt = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || !duration) return 0;
    const r = el.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1) * duration;
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const t = timeAt(e.clientX);
      const v = videoRef.current;
      if (dragging === "start") { const nt = Math.min(t, trimEnd - 0.4); setTrimStart(Math.max(0, nt)); if (v) v.currentTime = Math.max(0, nt); }
      else if (dragging === "end") { const nt = Math.max(t, trimStart + 0.4); setTrimEnd(Math.min(duration, nt)); if (v) v.currentTime = Math.min(duration, nt); }
      else { const nt = clamp(t, trimStart, trimEnd); if (v) v.currentTime = nt; }
    };
    const up = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [dragging, trimStart, trimEnd, duration]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { if (v.currentTime < trimStart || v.currentTime >= trimEnd - 0.05) v.currentTime = trimStart; v.play().catch(() => {}); }
    else v.pause();
  };

  const seekVideo = (v: HTMLVideoElement, t: number) => new Promise<void>(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; v.removeEventListener("seeked", finish); resolve(); } };
    v.addEventListener("seeked", finish);
    try { v.currentTime = t; } catch { finish(); }
    setTimeout(finish, 1200);
  });

  const capturePoster = async (v: HTMLVideoElement): Promise<Blob | null> => {
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
      const ctx = c.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, "image/jpeg", 0.85));
    } catch { return null; }
  };

  const exportWithWebCodecs = async (v: HTMLVideoElement): Promise<Blob | null> => {
    if (typeof VideoEncoder === "undefined" || typeof AudioEncoder === "undefined" || !v.videoWidth) return null;
    const fps = 30;
    const width = Math.min(1080, v.videoWidth);
    const height = Math.round(width * (v.videoHeight / v.videoWidth));
    let codec = "";
    for (const c of ["avc1.42001f", "avc1.42E01E", "vp09.00.10.08"]) {
      try { const r = await VideoEncoder.isConfigSupported({ codec: c, width, height, bitrate: 4_000_000, framerate: fps }); if (r.supported) { codec = c; break; } } catch {}
    }
    if (!codec) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: { codec: codec.startsWith("avc") ? "avc" : "vp9", width, height, frameRate: fps },
      audio: { codec: "aac", numberOfChannels: 2, sampleRate: 48000 },
      fastStart: "in-memory",
    });
    let encodeError: any = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => { encodeError = e; },
    });
    encoder.configure({ codec, width, height, bitrate: 4_000_000, framerate: fps, latencyMode: "quality" });

    // Record the source audio while frames render, then encode it into the mux.
    const audioCtx = new AudioContext();
    await audioCtx.resume();
    const dest = audioCtx.createMediaStreamDestination();
    try {
      const vs = (v as any).captureStream ? (v as any).captureStream() : null;
      const tracks = vs?.getAudioTracks?.() || [];
      if (tracks.length) audioCtx.createMediaStreamSource(new MediaStream(tracks)).connect(dest);
    } catch {}
    const rec = new MediaRecorder(dest.stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const audioDone = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks)); });
    rec.start();

    const span = trimEnd - trimStart;
    await seekVideo(v, trimStart);
    const total = Math.max(1, Math.floor(span * fps));
    for (let i = 0; i < total; i++) {
      let t = trimStart + i / fps;
      const skip = cutTarget(t);
      if (skip !== null) t = skip;
      if (t >= trimEnd) break;
      await seekVideo(v, t);
      ctx.drawImage(v, 0, 0, width, height);
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps) });
      encoder.encode(frame, { keyFrame: i % 60 === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 2) await encoder.flush();
      if (encodeError) throw encodeError;
      setProgress(Math.round(((i + 1) / total) * 70));
    }
    await encoder.flush();
    if (encoder.state !== "closed") encoder.close();
    rec.stop();
    const audioBlob = await audioDone;
    void audioCtx.close();

    const supported = await AudioEncoder.isConfigSupported({ codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 }).catch(() => ({ supported: false }));
    if (supported.supported && audioBlob.size > 0) {
      const decodeCtx = new AudioContext();
      const decoded = await decodeCtx.decodeAudioData(await audioBlob.arrayBuffer()).catch(() => null);
      void decodeCtx.close();
      if (decoded) {
        const rate = 48000;
        const frames = Math.min(decoded.length, Math.floor(span * rate));
        const ae = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: e => { encodeError = e; } });
        ae.configure({ codec: "mp4a.40.2", sampleRate: rate, numberOfChannels: 2, bitrate: 128000 });
        const L = decoded.getChannelData(0);
        const R = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : L;
        const size = 1024;
        for (let off = 0; off < frames; off += size) {
          const len = Math.min(size, frames - off);
          const data = new Float32Array(len * 2);
          data.set(L.subarray(off, off + len), 0);
          data.set(R.subarray(off, off + len), len);
          const ad = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((off / rate) * 1e6), data });
          ae.encode(ad); ad.close();
        }
        await ae.flush();
        if (ae.state !== "closed") ae.close();
      }
    }
    muxer.finalize();
    setProgress(100);
    return new Blob([target.buffer], { type: "video/mp4" });
  };

  const exportWithMediaRecorder = async (v: HTMLVideoElement): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const cw = Math.min(1080, v.videoWidth || 720);
    canvas.width = cw;
    canvas.height = Math.round(cw * ((v.videoHeight || 1280) / (v.videoWidth || 720)));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    const mimes = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"];
    let mime = "";
    for (const m of mimes) if (MediaRecorder.isTypeSupported(m)) { mime = m; break; }
    const vs = (v as any).captureStream ? (v as any).captureStream() : null;
    const tracks = vs?.getAudioTracks?.() || [];
    const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...tracks]);
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: mime || rec.mimeType || "video/webm" })); });
    await seekVideo(v, trimStart);
    let finished = false;
    const draw = () => {
      if (finished) return;
      try {
        let t = v.currentTime;
        const skip = cutTarget(t);
        if (skip !== null) { v.currentTime = skip; t = skip; }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      } catch {}
      rafRef.current = requestAnimationFrame(draw);
    };
    rec.start();
    draw();
    await v.play().catch(() => {});
    const timer = setInterval(() => setProgress(Math.round(clamp(((v.currentTime - trimStart) / Math.max(0.1, trimEnd - trimStart)) * 100, 0, 100))), 200);
    await new Promise<void>(resolve => {
      const finish = () => { if (finished) return; finished = true; clearInterval(stop); resolve(); };
      const stop = setInterval(() => { if (v.currentTime >= trimEnd - 0.05 || v.ended) { try { v.pause(); } catch {} finish(); } }, 60);
      setTimeout(() => { try { v.pause(); } catch {} finish(); }, Math.max(8000, (trimEnd - trimStart + 8) * 1000));
    });
    clearInterval(timer);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rec.stop();
    return done;
  };

  const next = async () => {
    const v = videoRef.current;
    if (!v || !duration || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setProgress(0);
    try {
      v.pause();
      const poster = await capturePoster(v);
      let blob = await exportWithWebCodecs(v);
      if (!blob) blob = await exportWithMediaRecorder(v);
      const type = blob.type || "video/mp4";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      onApply({
        file: new File([blob], (file.name.replace(/\.[^.]+$/, "") || "video") + "_trimmed." + ext, { type }),
        duration: Math.max(0.1, trimEnd - trimStart),
        posterBlob: poster,
      });
    } catch (e) {
      console.error(e);
      alert("Could not render the trim in this browser. Uploading the original video instead.");
      onApply({ file: sourceRef.current, duration });
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const span = Math.max(0.1, trimEnd - trimStart);
  const sp = duration ? (trimStart / duration) * 100 : 0;
  const ep = duration ? (trimEnd / duration) * 100 : 100;
  const pp = duration ? ((videoRef.current?.currentTime || 0) / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[600] bg-black text-white flex flex-col">
      <div className="flex items-center justify-between px-3 h-12 shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button onClick={() => { if (!exporting) onCancel(); }} className="p-1 disabled:opacity-40"><ArrowLeft size={24} /></button>
        <span className="text-sm font-semibold">Trim video</span>
        <button onClick={next} disabled={exporting || duration <= 0} className="flex items-center gap-1 text-[#0095f6] text-sm font-bold disabled:opacity-40">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Check size={18} />}
          {exporting ? "Saving" : "Next"}
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center" onClick={togglePlay}>
        <video ref={videoRef} src={src} playsInline preload="auto" className="max-h-full max-w-full object-contain" />
        <div className="absolute top-2 left-2 text-[10px] bg-black/50 px-2 py-0.5 rounded pointer-events-none">{fmt(videoRef.current?.currentTime || 0)}</div>
        {!playing && <span className="absolute inset-0 flex items-center justify-center pointer-events-none"><Play size={40} fill="white" className="opacity-70" /></span>}
      </div>

      <div className="shrink-0 bg-[#101012] border-t border-white/10 px-3 py-3 rounded-t-2xl">
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => setPanelOpen(v => !v)} className="text-white/45"><ChevronDown size={18} strokeWidth={1.4} className={panelOpen ? "" : "rotate-180"} /></button>
          <span className="text-[11px] font-medium text-white/70">Keep {fmt(span)}</span>
          <button
            onClick={() => {
              haptic();
              const t = clamp(videoRef.current?.currentTime || trimStart, trimStart + 0.1, trimEnd - 0.1);
              setCuts(prev => [...prev, t].sort((a, b) => a - b));
            }}
            className="text-[11px] font-medium text-white/70 flex items-center gap-1 active:opacity-60"
          >
            <Scissors size={14} strokeWidth={1.4} /> Cut at playhead
          </button>
        </div>

        {panelOpen && (
          <div
            ref={timelineRef}
            onPointerDown={e => {
              haptic();
              const t = timeAt(e.clientX);
              if (videoRef.current) videoRef.current.currentTime = clamp(t, trimStart, trimEnd);
              if (Math.abs(t - trimStart) < 0.35) setDragging("start");
              else if (Math.abs(t - trimEnd) < 0.35) setDragging("end");
              else setDragging("playhead");
              (e.currentTarget as any).setPointerCapture?.(e.pointerId);
            }}
            className="relative h-14 rounded-lg overflow-hidden bg-white/[0.05] ring-1 ring-white/[0.06] touch-none select-none"
          >
            <div className="absolute inset-0 flex opacity-70">
              {(thumbs.length ? thumbs : Array.from({ length: 18 }).map(() => "")).map((t: string, i: number) => (
                <div key={i} className="flex-1 h-full border-r border-black/20 last:border-r-0 bg-white/[0.03]">
                  {t ? <img src={t} alt="" className="w-full h-full object-cover opacity-85" /> : null}
                </div>
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 bg-black/75" style={{ width: `${sp}%` }} />
            <div className="absolute inset-y-0 right-0 bg-black/75" style={{ width: `${100 - ep}%` }} />
            <div className="absolute inset-y-0 border-y-2 border-white/95" style={{ left: `${sp}%`, width: `${ep - sp}%` }} />
            {cuts.map((c, i) => <div key={i} className="absolute inset-y-0 w-[2px] bg-white/80 z-10" style={{ left: `${(c / duration) * 100}%` }} />)}
            <div className="absolute inset-y-0 w-[2px] bg-white z-20" style={{ left: `${pp}%` }} />
            {(["start", "end"] as const).map(h => (
              <div key={h} className="absolute inset-y-0 w-6 -ml-3 flex items-center justify-center z-30"
                style={{ left: `${(h === "start" ? trimStart : trimEnd) / duration * 100}%` }}
                onPointerDown={e => { haptic(); e.stopPropagation(); setDragging(h); }}
              >
                <div className="w-[6px] h-9 bg-white rounded-full shadow-md flex flex-col items-center justify-center gap-[2px]">
                  <span className="w-[2px] h-2 rounded-full bg-black/30" />
                  <span className="w-[2px] h-2 rounded-full bg-black/30" />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-[9px] text-white/30 mt-1.5"><span>0:00</span><span>{fmt(duration)}</span></div>
        {cuts.length > 0 && (
          <button onClick={() => { haptic(); setCuts([]); }} className="mt-2 flex items-center gap-1.5 text-[11px] text-white/45 active:opacity-60">
            <X size={13} strokeWidth={1.4} /> Clear {cuts.length} cut{cuts.length === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {exporting && (
        <div className="absolute inset-0 z-[700] bg-black/85 flex items-center justify-center">
          <div className="w-64 text-center">
            <p className="text-sm font-bold mb-3">Preparing video…</p>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-white" style={{ width: `${progress}%` }} /></div>
            <p className="text-xs mt-2">{progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}
