"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsUp, MoreVertical, MessageCircle } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";

type Comment = {
  id: number;
  video_id: number;
  user_id: string;
  user_email: string;
  text: string;
  created_at: string;
  parent_id: number | null;
  like_count?: number;
  user_display_name?: string;
  user_username?: string;
  user_avatar?: string;
  user_is_verified?: boolean;
  user_tier?: string;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function InlineComments({ videoId }: { videoId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    getCachedUser().then((u) => setUser(u));
  }, []);

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/comments?video_id=${videoId}`, { cache: "no-store" });
      const data = await res.json();
      const list: Comment[] = Array.isArray(data.comments) ? data.comments : [];
      
      // Fetch user profiles for the commenters
      const userIds = Array.from(new Set(list.map((c) => c.user_id)));
      const profiles: Record<string, any> = {};
      
      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const r = await fetch(`/api/profile?user_id=${uid}`);
            const pd = await r.json();
            if (pd.profile) profiles[uid] = pd.profile;
          } catch {}
        })
      );

      // Enrich comments with profile data
      const enriched = list.map((c) => ({
        ...c,
        user_display_name: profiles[c.user_id]?.display_name || profiles[c.user_id]?.username || "User",
        user_username: profiles[c.user_id]?.username || "",
        user_avatar: profiles[c.user_id]?.avatar_url || "",
        user_is_verified: profiles[c.user_id]?.is_verified || false,
        user_tier: profiles[c.user_id]?.tier || "user",
      }));

      setComments(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const postComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userId: user.id,
          userEmail: user.email,
          text: newComment.trim(),
        }),
      });
      if (res.ok) {
        setNewComment("");
        await loadComments(); // Refresh list
      }
    } catch (err) {
      alert("Could not post comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter out replies for the main list (only show top-level comments)
  const topLevel = comments.filter((c) => !c.parent_id);

  return (
    <div className="mt-6">
      {/* Header */}
      <h2 className="text-lg font-bold mb-4">{comments.length} Comments</h2>

      {/* Input */}
      {user ? (
        <div className="flex gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {/* Use a placeholder avatar - real one would require another fetch */}
            <span className="text-sm font-bold text-white/50">You</span>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full bg-transparent border-b border-white/20 focus:border-white outline-none pb-2 text-sm transition"
              onKeyDown={(e) => e.key === "Enter" && postComment()}
            />
            {newComment.trim() && (
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setNewComment("")} className="text-sm font-semibold text-white/50 hover:text-white px-3 py-1.5 rounded-full">
                  Cancel
                </button>
                <button
                  onClick={postComment}
                  disabled={submitting}
                  className="text-sm font-semibold bg-white text-black hover:bg-white/90 px-4 py-1.5 rounded-full transition disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Comment"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#141418] rounded-lg p-4 mb-6 text-sm text-white/60 flex items-center justify-between">
          <span>Sign in to leave a comment</span>
          <Link href="/login" className="text-blue-400 font-semibold hover:underline">Sign in</Link>
        </div>
      )}

      {/* Comment List */}
      {loading ? (
        <p className="text-white/40 text-sm py-4">Loading comments...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-white/50 text-sm py-4">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-6">
          {topLevel.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Link href={c.user_username ? `/u/${c.user_username}` : "#"} className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold">
                  {c.user_avatar ? (
                    <img src={c.user_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    c.user_display_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <Link href={c.user_username ? `/u/${c.user_username}` : "#"} className="text-sm font-bold hover:underline inline-flex items-center gap-1">
                    {c.user_username ? `@${c.user_username}` : c.user_display_name}
                    {c.user_is_verified && <VerifiedBadge size={12} variant={c.user_tier === "podcaster" ? "gold" : "red"} />}
                  </Link>
                  <span className="text-xs text-white/40">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-white/90 whitespace-pre-wrap">{c.text}</p>
                
                {/* Comment actions */}
                <div className="flex items-center gap-4 mt-2">
                  <button className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition">
                    <ThumbsUp size={14} />
                    <span>{c.like_count || 0}</span>
                  </button>
                  <button className="text-xs text-white/50 hover:text-white transition font-semibold">
                    Reply
                  </button>
                </div>
              </div>
              <button className="text-white/30 hover:text-white p-1 h-fit flex-shrink-0">
                <MoreVertical size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
