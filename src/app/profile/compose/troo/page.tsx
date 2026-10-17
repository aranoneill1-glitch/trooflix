"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const MAX_CHARS = 280;

export default function TrooComposePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;

  const submit = async () => {
    setError("");
    if (!text.trim()) return setError("Write something first.");
    if (overLimit) return setError(`Too long by ${-remaining} characters.`);

    setSubmitting(true);
    try {
      const user = await getCachedUser();
      if (!user) return setError("Not signed in.");
      const res = await fetch("/api/user/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type: "Troo",
          title: text.trim().slice(0, 60),
          description: text.trim(),
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
        <h1 className="flex-1 text-center text-sm font-semibold">New Troo</h1>
        <button
          onClick={submit}
          disabled={submitting || !text.trim() || overLimit}
          className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-sm font-semibold transition"
        >
          {submitting ? "..." : "Post"}
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="What's your take?"
          autoFocus
          className={`w-full bg-black/40 border rounded px-4 py-3 text-lg outline-none resize-none ${
            overLimit ? "border-red-500" : "border-white/10 focus:border-red-600"
          }`}
        />

        <div className="flex items-center justify-between text-xs">
          <span className={overLimit ? "text-red-400" : "text-white/50"}>
            {remaining} characters left
          </span>
          <span className="text-white/40">Max {MAX_CHARS}</span>
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
