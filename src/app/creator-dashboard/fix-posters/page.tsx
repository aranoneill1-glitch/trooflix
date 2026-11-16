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

const newItemState = (): ItemState => ({ saving: false, done: false, capturing: false });

// A generated /api/poster text image does not count as a real thumbnail.
function needsThumbnail(v: any): boolean {
  const p = String(v.posterUrl || "").trim();
  return !p || p.includes("/api/poster");
}

export default function FixPostersPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [states, setStates] = useState<Record<number, ItemState>>({});
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

  const captureFrame = (video: any) => {
    const source = video.videoUrl || video.bitchuteUrl;
    if (!source) {
      patch(video.id, { error: "No playable video file — upload an image instead." });
      return;
    }
    patch(video.id, { capturing: true, error: undefined });

    const el = document.createElement("video");
    el.src = "/api/proxy-video?url=" + encodeURIComponent(source);
    el.crossOrigin = "anonymous";
    el.muted = true;
    el.playsInline = true;
    el.preload = "auto";

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { el.pause(); } catch {}
      try { el.removeAttribute("src"); el.load(); } catch {}
    };
    const fail = (msg: string) => {
      finish();
      patch(video.id, { capturing: false, error: msg });
    };

    const timer = setTimeout(
      () => fail("Video took too long to load. Upload an image instead."),
      30000
    );

    el.onloadedmetadata = () => {
      try {
        // Grab a frame from the first 2 seconds so it loads fast.
        const t = Number.isFinite(el.duration)
          ? Math.min(2, Math.max(0.1, el.duration))
          : 2;
        el.currentTime = t;
      } catch {
        fail("Could not seek the video. Upload an image instead.");
      }
    };

    el.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = el.videoWidth || 1280;
        canvas.height = el.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            finish();
            if (!blob) {
              patch(video.id, {
                capturing: false,
                error: "Could not grab a frame. Upload an image instead.",
              });
              return;
            }
            releasePreview(video.id);
            const url = URL.createObjectURL(blob);
            patch(video.id, {
              capturing: false,
              previewUrl: url,
              blob,
              error: undefined,
              done: false,
            });
          },
          "image/jpeg",
          0.85
        );
      } catch (e: any) {
        fail(e?.message || "Frame capture failed.");
      }
    };

    el.onerror = () => fail("Video failed to load. Upload an image instead.");
  };

  const saveThumbnail = async (video: any) => {
    const s = statesRef.current[video.id];
    if (!s?.blob || s.saving) return;
    patch(video.id, { saving: true, error: undefined });
    try {
      const file = new File([s.blob], `thumb-${video.id}.jpg`, {
        type: s.blob.type || "image/jpeg",
      });
      const fd = new FormData();
      fd.append("file", file);

      const up = await fetch("/api/upload-image", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok || !upData.publicUrl) {
        throw new Error(upData.error || "Image upload failed");
      }

      const upd = await fetch("/api/videos/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, posterUrl: upData.publicUrl }),
      });
      if (!upd.ok) {
        const err = await upd.json().catch(() => ({}));
        throw new Error(err.error || "Could not save the thumbnail");
      }

      invalidateVideosCache();
      releasePreview(video.id);
      patch(video.id, { saving: false, done: true, previewUrl: undefined, blob: undefined });
      setTimeout(() => setVideos((prev) => prev.filter((v) => v.id !== video.id)), 1000);
    } catch (e: any) {
      patch(video.id, { saving: false, error: e?.message || "Save failed" });
    }
  };

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
          <h1 className="text-3xl font-black mb-2">Pick Thumbnails</h1>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            These videos don&apos;t have a real thumbnail yet. Upload an image or grab a
            frame from the first 2 seconds, preview it, then save.
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
          </div>
        ) : (
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
                        <img
                          src={s.previewUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-white/25">
                          <ImageIcon size={30} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            No thumbnail yet
                          </span>
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
                      <h2 className="text-base font-bold text-white leading-tight mb-1">
                        {video.title}
                      </h2>
                      <p className="text-[11px] text-white/40 mb-4">
                        {video.type || "Video"}
                        {video.duration ? ` · ${video.duration}` : ""}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className={`cursor-pointer inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition ${
                            s.saving ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
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
                          disabled={!canCapture || s.capturing || s.saving}
                          title={canCapture ? "Grab a frame from the video" : "No playable video file"}
                          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 border border-white/20 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition"
                        >
                          {s.capturing ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <VideoIcon size={15} className="text-blue-400" />
                          )}
                          {s.previewUrl ? "Capture again" : "Capture from video"}
                        </button>
                        {s.previewUrl && !s.done && (
                          <button
                            type="button"
                            onClick={() => saveThumbnail(video)}
                            disabled={s.saving}
                            className="inline-flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                          >
                            {s.saving ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
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
                        <p className="mt-3 text-[11px] text-white/35">
                          Pick one of the options above to preview it first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
