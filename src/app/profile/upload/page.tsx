"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Check, ChevronLeft, AlertTriangle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { grabVideoPoster } from "@/lib/grabVideoPoster";

const MAX_SECONDS = 90;

export default function UserUploadPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [textOverlays, setTextOverlays] = useState<any[]>([]);
  const [editingOverlay, setEditingOverlay] = useState<string | null>(null);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const overlayDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const presignAndPut = async (file: File, folder: string, onProgress?: (n: number) => void) => {
    const presign = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
      }),
    });
    if (!presign.ok) throw new Error("Upload prep failed");
    const { signedUrl, publicUrl } = await presign.json();

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(publicUrl);
        else reject(new Error("Upload failed: " + xhr.status));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  };

  const readDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new Error("Could not read video duration"));
      video.src = URL.createObjectURL(file);
    });
  };

  const onVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");

    // Duration check
    try {
      const dur = await readDuration(f);
      if (dur > MAX_SECONDS + 0.5) {
        setError(
          `Your video is ${Math.round(dur)}s. Reels are limited to ${MAX_SECONDS}s.`
        );
        return;
      }
      setDuration(dur);
    } catch (err: any) {
      setError(err.message || "Could not read video");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const url = await presignAndPut(f, "videos", setProgress);
      setVideoUrl(url);

      setGeneratingPoster(true);
      try {
        const posterFile = await grabVideoPoster(url, 0.5);
        const posterPublicUrl = await presignAndPut(posterFile, "posters");
        setPosterUrl(posterPublicUrl);
      } catch (err) {
        console.warn("Auto poster failed:", err);
      } finally {
        setGeneratingPoster(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // ---- Text overlay helpers ----
  const addTextOverlay = () => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setTextOverlays((prev) => [
      ...prev,
      { id, text: "Add text", x: 0.5, y: 0.5, size: "md", color: "#ffffff" },
    ]);
    setEditingOverlay(id);
  };

  const updateOverlay = (id: string, patch: any) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );
  };

  const removeOverlay = (id: string) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    if (editingOverlay === id) setEditingOverlay(null);
  };

  const startDragOverlay = (e: React.PointerEvent, o: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previewRef.current) return;
    setEditingOverlay(o.id);
    overlayDragRef.current = {
      id: o.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: o.x,
      origY: o.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const moveDragOverlay = (e: React.PointerEvent) => {
    const d = overlayDragRef.current;
    if (!d || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    const newX = Math.max(0.05, Math.min(0.95, d.origX + dx));
    const newY = Math.max(0.05, Math.min(0.95, d.origY + dy));
    updateOverlay(d.id, { x: newX, y: newY });
  };

  const endDragOverlay = () => {
    overlayDragRef.current = null;
  };

  const submit = async () => {
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!videoUrl) return setError("Upload a video first.");

    setSubmitting(true);
    try {
      const user = await getCachedUser();
      if (!user) {
        setError("Not signed in.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/user/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim(),
          description: description.trim(),
          videoUrl,
          posterUrl,
          textOverlays,
          duration,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Could not publish");
        setSubmitting(false);
        return;
      }
      router.push("/profile");
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="pt-24 md:pt-28 max-w-2xl mx-auto px-4 md:px-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition"
        >
          <ChevronLeft size={16} /> Back
        </Link>

        <h1 className="text-2xl md:text-3xl font-black mb-1">Upload a Reel</h1>
        <p className="text-white/50 text-sm mb-6">
          Up to 90 seconds. Appears on your profile and in the Feed.
        </p>

        <div className="bg-[#141418] border border-white/5 rounded-xl p-5 md:p-6 space-y-5">
          <div>
            <label className="text-xs text-white/50 block mb-2">Video file</label>
            <label className="block border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl p-6 text-center cursor-pointer transition">
              <input
                type="file"
                accept="video/*"
                onChange={onVideo}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <div>
                  <p className="text-sm font-semibold mb-2">Uploading… {progress}%</p>
                  <div className="w-full max-w-xs mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : videoUrl ? (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Check size={18} />
                  <span className="text-sm font-semibold">Video uploaded</span>
                  {duration !== null && (
                    <span className="text-xs text-white/50">({Math.round(duration)}s)</span>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 text-white/40" size={28} />
                  <p className="text-sm font-semibold">Click to choose a video</p>
                  <p className="text-xs text-white/40 mt-1">MP4, WebM, MOV · max 90s</p>
                </>
              )}
            </label>
          </div>

          {generatingPoster && (
            <p className="text-xs text-white/50">Generating thumbnail…</p>
          )}

          {/* ---- Text overlay editor ---- */}
          {videoUrl && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/50">Text overlay</label>
                <button
                  type="button"
                  onClick={addTextOverlay}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition"
                >
                  + Add text
                </button>
              </div>

              <div
                ref={previewRef}
                onPointerMove={moveDragOverlay}
                onPointerUp={endDragOverlay}
                onPointerCancel={endDragOverlay}
                className="relative w-full bg-black rounded-lg overflow-hidden select-none"
                style={{ aspectRatio: videoDims ? `${videoDims.w} / ${videoDims.h}` : "16 / 9" }}
              >
                <video
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) {
                      setVideoDims({ w: v.videoWidth, h: v.videoHeight });
                    }
                  }}
                />

                {textOverlays.map((o) => (
                  <div
                    key={o.id}
                    onPointerDown={(e) => startDragOverlay(e, o)}
                    className={`absolute font-bold drop-shadow-lg cursor-move select-none whitespace-pre-wrap leading-tight ${
                      o.size === "sm" ? "text-xs" : o.size === "lg" ? "text-base" : "text-sm"
                    } ${editingOverlay === o.id ? "ring-2 ring-red-500/60 rounded px-1" : ""}`}
                    style={{
                      left: `${o.x * 100}%`,
                      top: `${o.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                      color: o.color || "#ffffff",
                      textShadow: "0 2px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)",
                      maxWidth: "90%",
                      wordBreak: "break-word",
                      touchAction: "none",
                    }}
                  >
                    {o.text}
                  </div>
                ))}

                {textOverlays.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-xs text-white/40">Tap "+ Add text" to overlay</p>
                  </div>
                )}
              </div>

              {/* Selected overlay controls */}
              {editingOverlay && (() => {
                const o = textOverlays.find((x) => x.id === editingOverlay);
                if (!o) return null;
                return (
                  <div className="mt-3 p-3 bg-black/40 border border-white/10 rounded-lg space-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                        Text
                      </label>
                      <input
                        type="text"
                        value={o.text}
                        onChange={(e) => updateOverlay(o.id, { text: e.target.value })}
                        maxLength={80}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-red-600"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                          Color
                        </label>
                        <div className="flex gap-1.5">
                          {["#ffffff", "#000000", "#dc2626", "#facc15", "#22c55e"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateOverlay(o.id, { color: c })}
                              className={`w-6 h-6 rounded-full border-2 transition ${
                                o.color === c ? "border-white" : "border-white/20"
                              }`}
                              style={{ backgroundColor: c }}
                              aria-label={`Color ${c}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
                          Size
                        </label>
                        <div className="flex gap-1">
                          {(["sm", "md", "lg"] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => updateOverlay(o.id, { size: sz })}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                                o.size === sz ? "bg-red-600 text-white" : "bg-white/10 text-white/60 hover:text-white"
                              }`}
                            >
                              {sz.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOverlay(o.id)}
                        className="ml-auto text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label className="text-xs text-white/50 block mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={800}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-950/30 border border-red-600/40 rounded px-4 py-3 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting || uploading || !videoUrl}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-3 rounded-lg transition"
          >
            {submitting ? "Publishing…" : "Publish Reel"}
          </button>
        </div>
      </div>
    </div>
  );
}
