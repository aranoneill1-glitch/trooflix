"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Image as ImageIcon, CheckCircle2, Loader2, Sparkles,
  Upload, Video as VideoIcon, AlertCircle,
} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser, invalidateVideosCache } from "@/lib/cache";

type ItemState = {
  previewUrl?: string;
  blob?: Blob;
  saving: boolean;
  done: boolean;
  error?: string;
  capturing: boolean;
};

type BatchState = {
  running: boolean;
  done: number;
  total: number;
  current: string;
  failed: { title: string; error: string }[];
};

const newItemState = (): ItemState => ({ saving: false, done: false, capturing: false });
const newBatchState = (): BatchState => ({ running: false, done: 0, total: 0, current: "", failed: [] });

function needsThumbnail(v: any): boolean {
  const p = String(v.posterUrl || "").trim();
  return !p || p.includes("/api/poster");
}

export default function FixPostersPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [states, setStates] = useState<Record<number, ItemState>>({});
  const [batch, setBatch] = useState<BatchState>(newBatchState());
  const [loading, setLoading] = useState(true);
  const [focusId, setFocusId] = useState<string | null>(null);
  const statesRef = useRef<Record<number, ItemState>>({});
  statesRef.current = states;

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("video");
    setFocusId(focus);

    (async () => {
      const user = await getCachedUser();
      if (!user) { setLoading(false); return; }
      try {
        const res = await fetch("/api/videos", { cache: "no-store" });
        const data = await res.json();
        const mine = Array.isArray(data)
          ? data.filter((v: any) =>
              String(v.uploaderUserId) === String(user.id) && needsThumbnail(v)
            )
          : [];
        if (focus) {
          mine.sort((a: any, b: any) =>
            (String(a.id) === String(focus) ? -1 : 0) -
            (String(b.id) === String(focus) ? -1 : 0)
          );
        }
        setVideos(mine);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      Object.values(statesRef.current).forEach((s) => {
        if (s?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(s.previewUrl);
      });
    };
  }, []);

  const patch = useCallback((id: number, next: Partial<ItemState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...(prev[id] || newItemState()), ...next } }));
  }, []);

  const releasePreview = (id: number) => {
    const s = statesRef.current[id];
    if (s?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(s.previewUrl);
  };

  const isBlankFrame = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    try {
      const data = ctx.getImageData(0, 0, Math.min(64, w), Math.min(64, h)).data;
      let sum = 0;
      let sumSq = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += lum;
        sumSq += lum * lum;
      }
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;
      return mean < 12 || variance < 60;
    } catch {
      return false;
    }
  };

  // Decode a usable frame from a source URL. Samples several timestamps and
  // skips blank frames (many long videos start with a black intro).
  const frameFromSource = (
    src: string,
    timeoutMs = 25000,
    times: number[] = [2, 5, 10, 20, 30, 45, 60, 90, 120],
    requireNonBlank = false
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const el = document.createElement("video");
      el.src = src;
      el.crossOrigin = "anonymous";
      el.muted = true;
      el.playsInline = true;
      el.preload = "metadata";

      let settled = false;
      let idx = 0;
      let lastBlob: Blob | null = null;
      let lastBlank = true;

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { el.pause(); } catch {}
        try { el.removeAttribute("src"); el.load(); } catch {}
      };
      const fail = (msg: string) => { finish(); reject(new Error(msg)); };
      const succeed = () => {
        finish();
        if (requireNonBlank && lastBlank) { reject(new Error("Only blank frames found")); return; }
        if (lastBlob) resolve(lastBlob);
        else reject(new Error("Could not grab a frame"));
      };

      const timer = setTimeout(() => {
        if (lastBlob && !lastBlank) succeed();
        else fail("Video took too long to load");
      }, timeoutMs);

      el.onloadedmetadata = () => {
        try {
          const d = el.duration;
          el.currentTime = Number.isFinite(d) ? Math.min(times[0], Math.max(0.1, d)) : times[0];
        } catch {
          fail("Could not seek the video");
        }
      };

      el.onseeked = () => {
        setTimeout(() => {
          if (settled) return;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = el.videoWidth || 1280;
            canvas.height = el.videoHeight || 720;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) { succeed(); return; }
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            const blank = isBlankFrame(ctx, canvas.width, canvas.height);
            lastBlank = blank;

            canvas.toBlob((blob) => {
              if (blob) lastBlob = blob;
              if (!blank || idx >= times.length - 1) { succeed(); return; }
              const duration = el.duration;
              let next = times[++idx];
              while (idx < times.length - 1 && Number.isFinite(duration) && next >= duration - 0.2) {
                next = times[++idx];
              }
              if (Number.isFinite(duration) && next >= duration - 0.2) { succeed(); return; }
              try { el.currentTime = next; } catch { succeed(); }
            }, "image/jpeg", 0.85);
          } catch (e: any) {
            if (lastBlob && !lastBlank) succeed();
            else fail(e?.message || "Frame capture failed");
          }
        }, 40);
      };

      el.onerror = () => {
        if (lastBlob && !lastBlank) succeed();
        else fail("Video failed to load");
      };
    });
  };

  // Pull only the first few MB through the proxy into a same-origin blob, so
  // decoding never depends on a long-running proxied stream or R2 CORS.
  const grabFrame = async (video: any): Promise<Blob> => {
    const source = video.videoUrl || video.bitchuteUrl;
    if (!source) throw new Error("No playable video file");

    const proxyUrl = "/api/proxy-video?url=" + encodeURIComponent(source);
    let objectUrl: string | null = null;

    try {
      const res = await fetch(proxyUrl, { headers: { Range: "bytes=0-5000000" } });
      if (res.ok || res.status === 206) {
        const blob = await res.blob();
        if (blob.size > 1024) objectUrl = URL.createObjectURL(blob);
      }
    } catch {}

    try {
      // Partial blob only has a few MB — try early timestamps, and fall back
      // to the full source if every frame there is blank or unreachable.
      return await frameFromSource(
        objectUrl || proxyUrl,
        objectUrl ? 8000 : 25000,
        objectUrl ? [2, 5] : [2, 5, 10, 20, 30, 45, 60, 90, 120],
        !!objectUrl
      );
    } catch (e) {
      if (objectUrl) return await frameFromSource(proxyUrl, 25000, [2, 5, 10, 20, 30, 45, 60, 90, 120], true);
      throw e;
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  const uploadImage = async (blob: Blob): Promise<string> => {
    const file = new File([blob], `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`, {
      type: "image/jpeg",
    });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload-image", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.publicUrl) throw new Error(data.error || "Image upload failed");
    return data.publicUrl;
  };

  const updateVideos = async (updates: { id: number; posterUrl: string }[]) => {
    if (updates.length === 0) return;
    const res = await fetch("/api/videos/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Could not save thumbnails");
    }
    invalidateVideosCache();
  };

  // Batch: capture + save every missing thumbnail, several at a time.
  const captureAll = async () => {
    if (batch.running || videos.length === 0) return;
    const queue = [...videos];
    const total = queue.length;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const concurrency = Math.min(isMobile ? 2 : 3, total);
    const successes: { id: number; posterUrl: string }[] = [];
    const succeededIds = new Set<number>();
    let cursor = 0;

    setBatch({ running: true, done: 0, total, current: "", failed: [] });

    const worker = async () => {
      while (cursor < total) {
        const v = queue[cursor++];
        setBatch((prev) => ({ ...prev, current: v.title }));
        try {
          const blob = await grabFrame(v);
          const posterUrl = await uploadImage(blob);
          successes.push({ id: v.id, posterUrl });
          succeededIds.add(v.id);
        } catch (e: any) {
          const message = e?.message || "Failed";
          setBatch((prev) => ({
            ...prev,
            failed: [...prev.failed, { title: v.title, error: message }],
          }));
        } finally {
          setBatch((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    try {
      await updateVideos(successes);
      successes.forEach((s) => {
        releasePreview(s.id);
        patch(s.id, { done: true, previewUrl: undefined, blob: undefined, error: undefined });
      });
      setVideos((prev) => prev.filter((v) => !succeededIds.has(v.id)));
    } catch (e: any) {
      setBatch((prev) => ({
        ...prev,
        failed: [...prev.failed, { title: "Saving thumbnails", error: e?.message || "Failed" }],
      }));
    }

    setBatch((prev) => ({ ...prev, running: false, current: "" }));
  };

  const onPickFile = (video: any, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      patch(video.id, { error: "Please choose an image file." });
      return;
    }
    releasePreview(video.id);
    const url = URL.createObjectURL(file);
    patch(video.id, { previewUrl: url, blob: file, error: undefined, done: false });
  };

  const captureFrame = async (video: any) => {
    patch(video.id, { capturing: true, error: undefined });
    try {
      const blob = await grabFrame(video);
      releasePreview(video.id);
      const url = URL.createObjectURL(blob);
      patch(video.id, { capturing: false, previewUrl: url, blob, error: undefined, done: false });
    } catch (e: any) {
      patch(video.id, {
        capturing: false,
        error: e?.message || "Video failed to load. Upload an image instead.",
      });
    }
  };

  const saveThumbnail = async (video: any) => {
    const s = statesRef.current[video.id];
    if (!s?.blob || s.saving) return;
    patch(video.id, { saving: true, error: undefined });
    try {
      const posterUrl = await uploadImage(s.blob);
      await updateVideos([{ id: video.id, posterUrl }]);
      releasePreview(video.id);
      patch(video.id, { saving: false, done: true, previewUrl: undefined, blob: undefined });
      setTimeout(() => setVideos((prev) => prev.filter((v) => v.id !== video.id)), 1000);
    } catch (e: any) {
      patch(video.id, { saving: false, error: e?.message || "Save failed" });
    }
  };

  const progress = batch.total ? Math.round((batch.done / batch.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24 font-sans">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)]">
        <Link
          href="/creator-dashboard/manage-content"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back to Manage Videos
        </Link>

        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#E53945]/20 rounded-2xl flex items-center justify-center">
            <Sparkles size={32} className="text-[#E53945]" />
          </div>
          <h1 className="text-3xl font-black mb-2">Thumbnail Generator</h1>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            Generate a thumbnail for every video that doesn&apos;t have one — a frame from
            the first 2 seconds is grabbed and saved automatically.
          </p>
          {focusId && (
            <p className="mt-3 text-xs text-[#F06A72] font-semibold">
              One video was highlighted from Manage Videos.
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#E53945]" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-[#1c1c1e] border border-white/10 rounded-2xl">
            <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
            <p className="text-white font-bold">All set — every video has a thumbnail.</p>
            {batch.failed.length > 0 && (
              <p className="mt-2 text-xs text-red-400">{batch.failed.length} failed in the last run.</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-8 bg-[#1c1c1e] border border-[#E53945]/30 rounded-2xl p-5 md:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Capture all thumbnails</h2>
                  <p className="text-xs sm:text-sm text-white/55 mt-1">
                    Automatically grab a frame from each of your {videos.length} video
                    {videos.length === 1 ? "" : "s"} and save it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={captureAll}
                  disabled={batch.running}
                  className="inline-flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-60 text-white font-bold text-sm px-5 py-3 rounded-xl transition shrink-0"
                >
                  {batch.running ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {batch.running
                    ? `Capturing ${batch.done}/${batch.total}`
                    : `Capture all (${videos.length})`}
                </button>
              </div>

              {batch.running && (
                <div className="mt-5 p-4 bg-black/40 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <p className="text-xs text-white/60 truncate">{batch.current}</p>
                    <p className="text-xs font-bold text-[#E53945] shrink-0">{progress}%</p>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E53945] transition-all duration-300"
                      style={{ width: progress + "%" }}
                    />
                  </div>
                </div>
              )}

              {!batch.running && batch.failed.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-bold text-red-400">
                    {batch.failed.length} video{batch.failed.length === 1 ? "" : "s"} failed — upload a thumbnail manually below.
                  </p>
                  {batch.failed.map((f, i) => (
                    <p key={i} className="text-[11px] text-white/50 truncate">
                      <span className="text-white/80">{f.title}</span> — {f.error}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <h2 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase mb-4">
              Or choose one manually
            </h2>

            <div className="space-y-4">
              {videos.map((video) => {
                const s = states[video.id] || newItemState();
                const focused = focusId !== null && String(video.id) === String(focusId);
                const canCapture = !!(video.videoUrl || video.bitchuteUrl);
                return (
                  <div
                    key={video.id}
                    className={`bg-[#1c1c1e] border rounded-2xl p-4 md:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${
                      focused ? "border-[#E53945]" : "border-white/10"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-black shrink-0 relative flex items-center justify-center">
                        {s.previewUrl ? (
                          <img src={s.previewUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-white/25">
                            <ImageIcon size={30} />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">No thumbnail yet</span>
                          </div>
                        )}
                        {s.capturing && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Loader2 size={26} className="animate-spin text-[#E53945]" />
                          </div>
                        )}
                        {s.done && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                            <CheckCircle2 size={30} className="text-green-500" />
                            <span className="text-xs font-bold text-green-400">Saved</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col">
                        <h2 className="text-base font-bold text-white leading-tight mb-1">{video.title}</h2>
                        <p className="text-[11px] text-white/40 mb-4">
                          {video.type || "Video"}
                          {video.duration ? ` · ${video.duration}` : ""}
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className={`cursor-pointer inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition ${s.saving ? "opacity-50 pointer-events-none" : ""}`}>
                            <Upload size={15} className="text-[#E53945]" /> Upload image
                            <input
                              id={`thumb-input-${video.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => onPickFile(video, e.target.files?.[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => captureFrame(video)}
                            disabled={!canCapture || s.capturing || s.saving || batch.running}
                            title={canCapture ? "Grab a frame from the video" : "No playable video file"}
                            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                          >
                            {s.capturing ? <Loader2 size={15} className="animate-spin" /> : <VideoIcon size={15} className="text-blue-400" />}
                            {s.previewUrl ? "Capture again" : "Capture frame"}
                          </button>
                          {s.previewUrl && !s.done && (
                            <button
                              type="button"
                              onClick={() => saveThumbnail(video)}
                              disabled={s.saving}
                              className="inline-flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                            >
                              {s.saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                              {s.saving ? "Saving..." : "Use this thumbnail"}
                            </button>
                          )}
                        </div>

                        {s.error && (
                          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-red-400">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {s.error}
                          </p>
                        )}
                        {!s.previewUrl && !s.error && (
                          <p className="mt-3 text-[11px] text-white/35">Choose an option above to preview it first.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
