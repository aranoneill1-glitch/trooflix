"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Image as ImageIcon, Check, AlertTriangle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function ImageComposePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setUploading(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: f.name,
          contentType: f.type || "image/jpeg",
          folder: "posters",
        }),
      });
      if (!presign.ok) throw new Error("Upload prep failed");
      const { signedUrl, publicUrl } = await presign.json();
      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": f.type || "image/jpeg" },
        body: f,
      });
      if (!put.ok) throw new Error("Upload failed");
      setImageUrl(publicUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!imageUrl) return setError("Pick an image first.");
    if (!title.trim()) return setError("Title is required.");

    setSubmitting(true);
    try {
      const user = await getCachedUser();
      if (!user) return setError("Not signed in.");
      const res = await fetch("/api/user/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type: "Image",
          title: title.trim(),
          description: description.trim(),
          posterUrl: imageUrl,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Publish failed");
        return;
      }
      router.push("/profile");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-30 bg-black border-b border-white/5 flex items-center px-4 py-3">
        <button
          onClick={() => router.push("/profile/compose")}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold">New Image</h1>
        <button
          onClick={submit}
          disabled={submitting || !imageUrl || !title.trim()}
          className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-semibold transition"
        >
          {submitting ? "..." : "Post"}
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div>
          <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          {imageUrl ? (
            <div className="relative rounded-xl overflow-hidden bg-black/40">
              <img src={imageUrl} alt="" className="w-full h-auto" />
              <button
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/70 text-white text-xs rounded-full hover:bg-black/90"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full aspect-square border-2 border-dashed border-white/10 hover:border-red-600/50 rounded-xl flex flex-col items-center justify-center transition"
            >
              <ImageIcon size={32} className="text-white/40 mb-2" />
              <p className="text-sm text-white/70">{uploading ? "Uploading…" : "Choose image"}</p>
            </button>
          )}
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Give it a title"
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
          />
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1">Caption (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="Add a caption"
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-600/40 rounded px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </main>
  );
}
