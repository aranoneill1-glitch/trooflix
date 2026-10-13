"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Comment = {
  id: number;
  video_id: number;
  user_id: string;
  user_email: string;
  text: string;
  created_at: string;
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) === 1 ? "" : "s"} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) === 1 ? "" : "s"} ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) === 1 ? "" : "s"} ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} week${Math.floor(diff / 604800) === 1 ? "" : "s"} ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} month${Math.floor(diff / 2592000) === 1 ? "" : "s"} ago`;
  return `${Math.floor(diff / 31536000)} year${Math.floor(diff / 31536000) === 1 ? "" : "s"} ago`;
}

// Deterministic color per user based on email
function avatarColor(email: string): string {
  const colors = [
    "#e11d48", // rose
    "#dc2626", // red
    "#ea580c", // orange
    "#d97706", // amber
    "#65a30d", // lime
    "#059669", // emerald
    "#0891b2", // cyan
    "#2563eb", // blue
    "#7c3aed", // violet
    "#c026d3", // fuchsia
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length];
}

export default function Comments({ videoId }: { videoId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  // Load user + comments
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || "",
        });
      }
    });

    fetch(`/api/comments?video_id=${videoId}`)
      .then((r) => r.json())
      .then((d) => {
        setComments(Array.isArray(d.comments) ? d.comments : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [videoId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userId: user.id,
          userEmail: user.email,
          text: text.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setText("");
    } catch (err) {
      console.error("Comment failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const initial = (email?: string) => (email || "?").trim()[0]?.toUpperCase() || "?";
  const username = (email?: string) => (email || "user").split("@")[0];

  return (
    <div className="mt-12 mb-8">
      <h2 className="text-lg md:text-xl font-bold mb-6">
        Comments <span className="text-white/40">·</span>{" "}
        <span className="text-white/60 text-base">{comments.length}</span>
      </h2>

      {/* Comment input — only if signed in */}
      {user ? (
        <form onSubmit={submit} className="flex gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: avatarColor(user.email) }}
          >
            {initial(user.email)}
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
              maxLength={500}
              className="w-full bg-transparent border-b border-white/20 focus:border-white outline-none pb-2 text-sm md:text-base resize-none"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-white/40">
                {text.length}/500
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="px-4 py-1.5 rounded-full text-sm text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="flex items-center gap-1.5 bg-white text-black font-semibold px-4 py-1.5 rounded-full text-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Send size={14} />
                  {submitting ? "Posting…" : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-white/5 rounded-lg flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">
            Sign in to join the conversation
          </p>
          <Link
            href="/login"
            className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-1.5 rounded-full text-sm transition"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Comment list */}
      {loading && (
        <p className="text-white/40 text-sm py-4">Loading comments…</p>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-white/40 text-sm py-4">
          No comments yet. Be the first.
        </p>
      )}

      <div className="space-y-6">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: avatarColor(c.user_email || "unknown") }}
            >
              {initial(c.user_email)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className="font-semibold">
                  @{username(c.user_email)}
                </span>
                <span className="text-white/50 text-xs">
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <p className="text-sm md:text-base text-white/90 leading-relaxed whitespace-pre-wrap break-words">
                {c.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
