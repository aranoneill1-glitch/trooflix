"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Check, ChevronLeft, AlertTriangle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import { fontStyle, type FontStyle } from "@/components/TextOverlay";
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
  const pinchRef = useRef<{ id: string | null; startDist: number; startSize: "sm" | "md" | "lg"; fired: boolean } | null>(null);
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

  // After video is uploaded, redirect to the full-screen editor
  // (poster is optional; the editor/details flow handles empty poster gracefully)
  useEffect(() => {
    if (!videoUrl || uploading || generatingPoster) return;
    const params = new URLSearchParams({
      v: videoUrl,
      p: posterUrl,
      d: duration !== null ? String(Math.round(duration)) : "",
    });
    router.push(`/profile/upload/editor?${params.toString()}`);
  }, [videoUrl, posterUrl, generatingPoster, uploading, duration, router]);

  // ---- Pinch to scale ----
  const SIZE_ORDER: ("sm" | "md" | "lg")[] = ["sm", "md", "lg"];

  const onPreviewTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    if (!editingOverlay) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const o = textOverlays.find((x) => x.id === editingOverlay);
    if (!o) return;
    pinchRef.current = {
      id: o.id,
      startDist: dist,
      startSize: o.size,
      fired: false,
    };
  };

  const onPreviewTouchMove = (e: React.TouchEvent) => {
    if (!pinchRef.current || e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ratio = dist / pinchRef.current.startDist;
    if (pinchRef.current.fired) return;
    if (ratio > 1.3) {
      const idx = SIZE_ORDER.indexOf(pinchRef.current.startSize);
      const next = SIZE_ORDER[Math.min(2, idx + 1)];
      setTextOverlays((prev) =>
        prev.map((x) => (x.id === pinchRef.current!.id ? { ...x, size: next } : x))
      );
      pinchRef.current.fired = true;
    } else if (ratio < 0.75) {
      const idx = SIZE_ORDER.indexOf(pinchRef.current.startSize);
      const next = SIZE_ORDER[Math.max(0, idx - 1)];
      setTextOverlays((prev) =>
        prev.map((x) => (x.id === pinchRef.current!.id ? { ...x, size: next } : x))
      );
      pinchRef.current.fired = true;
    }
  };

  const onPreviewTouchEnd = () => {
    pinchRef.current = null;
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
