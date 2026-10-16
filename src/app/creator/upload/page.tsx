"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon, Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { grabVideoPoster } from "@/lib/grabVideoPoster";

const CATEGORIES = [
  "History",
  "Politics",
  "True Crime",
  "Science & Health",
  "Technology",
  "Religion & Belief",
  "Ancient History",
  "The Unknown",
  "Comedy",
  "News",
  "Other",
];

export default function UploadVideoPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [rating, setRating] = useState("TV-MA");
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

      const res = await fetch("/api/creator/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          type: "Podcast",
          rating,
          videoUrl: videoUrl,
          posterUrl,
          backdropUrl,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Could not publish");
        setSubmitting(false);
        return;
      }
      router.push("/creator");
    } catch {
      setError("Network error.");
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link
        href="/creator"
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
          {/* Category */}
          <div>
            <label className="text-xs text-white/50 block mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="text-xs text-white/50 block mb-2">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
            >
              {["G", "PG", "PG-13", "TV-14", "TV-MA", "R"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
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
