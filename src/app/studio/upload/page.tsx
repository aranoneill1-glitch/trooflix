"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon, Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { grabVideoPoster } from "@/lib/grabVideoPoster";

export default function UploadVideoPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"Reel" | "Podcast" | "Documentary">("Reel");
  const [pickerDone, setPickerDone] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [backdropUrl, setBackdropUrl] = useState("");

  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generatingPoster, setGeneratingPoster] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

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

  const onPoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setUploadingPoster(true);
    try {
      const url = await presignAndPut(f, "posters");
      setPosterUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingPoster(false);
    }
  };

  const onBackdrop = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setUploadingBackdrop(true);
    try {
      const url = await presignAndPut(f, "backdrops");
      setBackdropUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingBackdrop(false);
    }
  };

  const onVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setUploadingVideo(true);
    setVideoProgress(0);
    try {
      const url = await presignAndPut(f, "videos", setVideoProgress);
      setVideoUrl(url);

      // Auto-generate a poster from the first frame — only if the user
      // hasn't manually uploaded one. Non-fatal if it fails.
      if (!posterUrl) {
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
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!videoUrl) return setError("Upload a video file first.");

    setSubmitting(true);
    try {
      const supabase = createClient();
      const user = await getCachedUser();
      if (!user) {
        setError("Not signed in.");
        setSubmitting(false);
        return;
      }

      // Compose the request body
      const body: any = {
        userId: user.id,
        title: title.trim(),
        description: description.trim(),
        type: type,
        videoUrl: videoUrl,
        posterUrl,
        backdropUrl,
      };
      const res = await fetch("/api/user/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Could not publish");
        setSubmitting(false);
        return;
      }
      router.push("/studio");
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  };

  // ===== STEP 1: Type picker =====
  if (!pickerDone) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <p className="text-xs tracking-[0.3em] text-yellow-500 font-bold mb-2">STUDIO</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2">What are you publishing?</h1>
            <p className="text-white/50 text-sm">Choose a format to start</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => { setType("Podcast"); setPickerDone(true); }}
              className="group bg-[#141418] border-2 border-white/10 hover:border-yellow-500 rounded-2xl p-6 flex flex-col items-center text-center transition"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-600/20 group-hover:bg-yellow-600/30 flex items-center justify-center mb-4 transition">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                  <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3" />
                </svg>
              </div>
              <p className="text-lg font-bold mb-1">Podcast</p>
              <p className="text-xs text-white/50">Audio-first, long-form</p>
            </button>

            <button
              onClick={() => { setType("Documentary"); setPickerDone(true); }}
              className="group bg-[#141418] border-2 border-white/10 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center text-center transition"
            >
              <div className="w-16 h-16 rounded-full bg-blue-600/20 group-hover:bg-blue-600/30 flex items-center justify-center mb-4 transition">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M2 10h20M7 6V2M17 6V2" />
                </svg>
              </div>
              <p className="text-lg font-bold mb-1">Documentary</p>
              <p className="text-xs text-white/50">Long-form video, real stories</p>
            </button>

            <button
              onClick={() => { setType("Reel"); setPickerDone(true); }}
              className="group bg-[#141418] border-2 border-white/10 hover:border-red-600 rounded-2xl p-6 flex flex-col items-center text-center transition"
            >
              <div className="w-16 h-16 rounded-full bg-red-600/20 group-hover:bg-red-600/30 flex items-center justify-center mb-4 transition">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <p className="text-lg font-bold mb-1">Reel</p>
              <p className="text-xs text-white/50">Short-form video</p>
            </button>
          </div>

          <button
            onClick={() => window.history.back()}
            className="block mx-auto mt-8 text-sm text-white/40 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link
        href="/studio"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition"
      >
        <ChevronLeft size={16} /> Back
      </Link>

      <h1 className="text-2xl font-black mb-1">Upload a video</h1>
      <p className="text-white/50 text-sm mb-6">
        Videos are published to your podcaster page immediately.
      </p>

      <div className="bg-[#141418] border border-white/5 rounded-xl p-5 md:p-6 space-y-5">
        {/* Video file */}
        <div>
          <label className="text-xs text-white/50 block mb-2">Video file</label>
          <label className="block border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl p-6 text-center cursor-pointer transition">
            <input
              type="file"
              accept="video/*"
              onChange={onVideo}
              disabled={uploadingVideo}
              className="hidden"
            />
            {uploadingVideo ? (
              <div>
                <p className="text-sm font-semibold mb-2">
                  Uploading… {videoProgress}%
                </p>
                <div className="w-full max-w-xs mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </div>
            ) : videoUrl ? (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Check size={18} />
                <span className="text-sm font-semibold">Video uploaded</span>
              </div>
            ) : (
              <>
                <Upload className="mx-auto mb-2 text-white/40" size={28} />
                <p className="text-sm font-semibold">Click to choose a video</p>
                <p className="text-xs text-white/40 mt-1">MP4, WebM, or MOV</p>
              </>
            )}
          </label>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs text-white/50 block mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. After Work"
            maxLength={120}
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/50 block mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="What's this video about?"
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type — Reel or Podcast */}
          <div>
            <label className="text-xs text-white/50 block mb-2">Type</label>
            <div className="flex gap-2">
              {(["Reel", "Podcast"] as const).map((t) => {
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2.5 rounded font-semibold text-sm transition border ${
                      active
                        ? "bg-red-600 border-red-600 text-white"
                        : "bg-black/40 border-white/10 text-white/60 hover:text-white hover:border-white/30"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-white/40 mt-2">
              {type === "Reel"
                ? "Short-form — appears in the Feed"
                : "Long-form — appears on your podcaster page"}
            </p>
          </div>

        </div>

        {/* Poster + Backdrop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-white/50 block mb-2">
              Poster (2:3 portrait)
            </label>
            <label className="block border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl p-4 text-center cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                onChange={onPoster}
                disabled={uploadingPoster}
                className="hidden"
              />
              {uploadingPoster ? (
                <p className="text-sm">Uploading…</p>
              ) : generatingPoster ? (
                <p className="text-sm text-white/60">Generating thumbnail…</p>
              ) : posterUrl ? (
                <img
                  src={posterUrl}
                  alt=""
                  className="max-h-32 mx-auto rounded object-cover"
                />
              ) : (
                <>
                  <ImageIcon className="mx-auto mb-1 text-white/40" size={22} />
                  <p className="text-xs text-white/50">Choose image</p>
                </>
              )}
            </label>
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-2">
              Backdrop (16:9 wide)
            </label>
            <label className="block border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl p-4 text-center cursor-pointer transition">
              <input
                type="file"
                accept="image/*"
                onChange={onBackdrop}
                disabled={uploadingBackdrop}
                className="hidden"
              />
              {uploadingBackdrop ? (
                <p className="text-sm">Uploading…</p>
              ) : backdropUrl ? (
                <img
                  src={backdropUrl}
                  alt=""
                  className="max-h-32 mx-auto rounded object-cover"
                />
              ) : (
                <>
                  <ImageIcon className="mx-auto mb-1 text-white/40" size={22} />
                  <p className="text-xs text-white/50">Choose image</p>
                </>
              )}
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-600/40 rounded px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || uploadingVideo}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-3 rounded-lg transition"
        >
          {submitting ? "Publishing…" : "Publish video"}
        </button>
      </div>
    </div>
  );
}
