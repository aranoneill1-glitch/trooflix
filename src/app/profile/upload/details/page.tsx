"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function DetailsPage() {
  const router = useRouter();

  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [textOverlays, setTextOverlays] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setVideoUrl(params.get("v") || "");
    setPosterUrl(params.get("p") || "");
    const d = params.get("d");
    setDuration(d ? Number(d) : null);
    const t = params.get("t");
    if (t) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) setTextOverlays(parsed);
      } catch {}
    }
  }, []);

  const goBackToEditor = () => {
    const params = new URLSearchParams({
      v: videoUrl,
      p: posterUrl,
      d: duration !== null ? String(Math.round(duration)) : "",
      t: JSON.stringify(textOverlays),
    });
    router.push(`/profile/upload/editor?${params.toString()}`);
  };

  const submit = async () => {
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!videoUrl) return setError("Missing video.");

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
          duration,
          textOverlays,
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

  if (!videoUrl) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Missing video. Go back and upload.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 z-30 bg-black border-b border-white/5 flex items-center justify-between px-4 py-3">
        <button
          onClick={goBackToEditor}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-sm font-semibold">Details</h1>
        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div>
          <label className="text-xs text-white/50 block mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Give your reel a title"
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 outline-none focus:border-red-600"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="What's this about?"
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
          disabled={submitting}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-3 rounded-lg transition"
        >
          {submitting ? "Publishing…" : "Publish Reel"}
        </button>
      </div>
    </main>
  );
}
