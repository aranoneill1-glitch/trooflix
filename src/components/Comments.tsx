"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ThumbsUp, MoreVertical, Trash2, Send, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import GifPicker from "@/components/GifPicker";
import VerifiedBadge from "@/components/VerifiedBadge";

type Comment = {
  id: number;
  video_id: number;
  user_id: string;
  user_email: string;
  text: string;
  created_at: string;
  parent_id: number | null;
  like_count: number;
  avatar_url?: string | null;
  display_name?: string | null;
  is_verified?: boolean;
};

type SortMode = "newest" | "oldest" | "top";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString();
}

function avatarColor(email: string): string {
  const colors = [
    "#e11d48", "#dc2626", "#ea580c", "#d97706", "#65a30d",
    "#059669", "#0891b2", "#2563eb", "#7c3aed", "#c026d3",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length];
}

function initial(email?: string) {
  return (email || "?").trim()[0]?.toUpperCase() || "?";
}
function username(email?: string, displayName?: string | null) {
  if (displayName && displayName.trim()) return displayName.trim();
  return (email || "user").split("@")[0];
}

const MEDIA_EXT = /\.(gif|png|jpe?g|webp|avif)(\?|$)/i;

function isMediaUrl(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t.startsWith("http")) return false;
  return MEDIA_EXT.test(t);
}

export default function Comments({ videoId }: { videoId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedCommentIds, setLikedCommentIds] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("newest");
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user + comments + liked comment IDs
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || "" });
        // Fetch liked comment IDs
        fetch(`/api/comment-likes?user_id=${data.user.id}&video_id=${videoId}`)
          .then((r) => r.json())
          .then((d) => setLikedCommentIds(Array.isArray(d.ids) ? d.ids : []))
          .catch(() => {});
      }
    });
  }, [videoId]);

  // Fetch comments whenever sort changes
  useEffect(() => {
    setLoading(true);
    fetch(`/api/comments?video_id=${videoId}&sort=${sort}`)
      .then((r) => r.json())
      .then((d) => {
        setComments(Array.isArray(d.comments) ? d.comments : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [videoId, sort]);

  // Close menu when clicking outside
  useEffect(() => {
    const onClick = () => setMenuOpen(null);
    if (menuOpen !== null) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [menuOpen]);

  const submitMedia = async (url: string) => {
    if (!user) return;
    setGifOpen(false);
    const optimistic: Comment = {
      id: -Date.now(),
      video_id: videoId,
      user_id: user.id,
      user_email: user.email,
      text: url,
      created_at: new Date().toISOString(),
      parent_id: null,
      like_count: 0,
    };
    setComments((prev) => [optimistic, ...prev]);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userId: user.id,
          userEmail: user.email,
          text: url,
        }),
      });
      if (!res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
    }
  };

  const uploadCommentImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "comment-images",
        }),
      });
      if (!presign.ok) throw new Error("Upload failed");
      const { signedUrl, publicUrl } = await presign.json();

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      await submitMedia(publicUrl);
    } catch {
      alert("Couldn't upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submit = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    if (!user || submitting) return;

    const body = parentId ? replyText : text;
    if (!body.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          userId: user.id,
          userEmail: user.email,
          text: body.trim(),
          parentId: parentId || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      if (parentId) {
        setReplyTo(null);
        setReplyText("");
      } else {
        setText("");
      }
    } catch (err) {
      console.error("Comment failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!user) return;
    setMenuOpen(null);
    if (!confirm("Delete this comment?")) return;

    // Optimistic remove — includes replies (they cascade in DB)
    const idsToRemove = [commentId, ...comments.filter((c) => c.parent_id === commentId).map((c) => c.id)];
    setComments((prev) => prev.filter((c) => !idsToRemove.includes(c.id)));

    const res = await fetch(`/api/comments?id=${commentId}&userId=${user.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      // Re-fetch to restore
      fetch(`/api/comments?video_id=${videoId}&sort=${sort}`)
        .then((r) => r.json())
        .then((d) => setComments(Array.isArray(d.comments) ? d.comments : []));
    }
  };

  const toggleCommentLike = async (commentId: number) => {
    if (!user) return;

    const wasLiked = likedCommentIds.includes(commentId);
    // Optimistic
    setLikedCommentIds((prev) =>
      wasLiked ? prev.filter((id) => id !== commentId) : [...prev, commentId]
    );
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, like_count: wasLiked ? Math.max(0, c.like_count - 1) : c.like_count + 1 }
          : c
      )
    );

    const res = await fetch("/api/comment-likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, userId: user.id }),
    });
    if (!res.ok) {
      // Rollback
      setLikedCommentIds((prev) =>
        wasLiked ? [...prev, commentId] : prev.filter((id) => id !== commentId)
      );
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, like_count: wasLiked ? c.like_count + 1 : Math.max(0, c.like_count - 1) }
            : c
        )
      );
    }
  };

  // Group top-level comments + replies
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesFor = (id: number) =>
    comments
      .filter((c) => c.parent_id === id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="mt-12 mb-8">
      {/* Header with count + sort */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-lg md:text-xl font-bold">
          Comments <span className="text-white/40">·</span>{" "}
          <span className="text-white/60 text-base">
            {comments.filter((c) => !c.parent_id).length}
          </span>
        </h2>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-red-600"
        >
          <option value="newest">For you first</option>
          <option value="oldest">Oldest first</option>
          <option value="top">Top comments</option>
        </select>
      </div>

      {/* New comment form */}
      {user ? (
        <form
          onSubmit={(e) => submit(e)}
          className="sticky bottom-0 bg-[#0f0f12] border-t border-white/10 pt-3 pb-4 -mx-2 px-2 mt-auto"
        >
          <div className="flex items-end gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
              style={{ background: avatarColor(user.email) }}
            >
              {initial(user.email)}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-4 pr-2 py-2 focus-within:border-white/25 transition">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                rows={1}
                maxLength={500}
                className="flex-1 bg-transparent outline-none text-sm resize-none max-h-24 placeholder:text-white/40 py-0.5"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 96) + "px";
                }}
              />

              {/* Image upload icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white transition flex-shrink-0 disabled:opacity-50"
                aria-label="Add image"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ImageIcon size={20} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadCommentImage(f);
                }}
              />

              {/* GIF button */}
              <button
                type="button"
                onClick={() => setGifOpen(true)}
                className="flex-shrink-0 border border-white/40 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white/80 hover:text-white hover:border-white transition"
                aria-label="Add GIF"
              >
                GIF
              </button>

              {/* Post button — only shows when text is present */}
              {text.trim() && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-shrink-0 text-sm font-bold text-red-500 hover:text-red-400 disabled:opacity-30 transition px-1"
                >
                  {submitting ? "…" : "Post"}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 bg-white/5 rounded-lg flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">Sign in to join the conversation</p>
          <Link
            href="/login"
            className="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-1.5 rounded-full text-sm transition"
          >
            Sign In
          </Link>
        </div>
      )}

      <GifPicker
        open={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={(url) => submitMedia(url)}
      />

      {/* Comments list */}
      {loading && <p className="text-white/40 text-sm py-4">Loading comments…</p>}
      {!loading && topLevel.length === 0 && (
        <p className="text-white/40 text-sm py-4">
          No comments yet. Be the first.
        </p>
      )}

      <div className="space-y-6">
        {topLevel.map((c) => {
          const replies = repliesFor(c.id);
          const isOwn = user?.id === c.user_id;
          const isLiked = likedCommentIds.includes(c.id);

          return (
            <div key={c.id}>
              {/* Top-level comment */}
              <div className="flex gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
                  style={{ background: avatarColor(c.user_email || "unknown") }}
                >
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initial(c.user_email)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="font-semibold inline-flex items-center gap-1">
                        <span>@{username(c.user_email, c.display_name)}</span>
                        {c.is_verified && <VerifiedBadge size={12} />}
                      </span>
                      <span className="text-white/50 text-xs">
                        {timeAgo(c.created_at)}
                      </span>
                    </div>
                    {isOwn && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === c.id ? null : c.id);
                          }}
                          className="text-white/50 hover:text-white p-1"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuOpen === c.id && (
                          <div className="absolute right-0 top-8 bg-[#1a1a1e] border border-white/10 rounded-lg shadow-xl z-20 min-w-[140px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteComment(c.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 rounded-lg"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isMediaUrl(c.text) ? (
                    <img
                      src={c.text}
                      alt=""
                      className="rounded-lg max-w-xs max-h-64 object-cover mt-2"
                      loading="lazy"
                    />
                  ) : (
                    <p className="text-sm md:text-base text-white/90 leading-relaxed whitespace-pre-wrap break-words mt-1">
                      {c.text}
                    </p>
                  )}

                  {/* Like + Reply buttons */}
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      onClick={() => toggleCommentLike(c.id)}
                      className={`flex items-center gap-1.5 text-xs transition ${
                        isLiked ? "text-red-500" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <ThumbsUp size={14} fill={isLiked ? "currentColor" : "none"} />
                      {c.like_count > 0 && <span>{c.like_count}</span>}
                    </button>
                    {user && (
                      <button
                        onClick={() => {
                          setReplyTo(replyTo === c.id ? null : c.id);
                          setReplyText("");
                        }}
                        className="text-xs text-white/60 hover:text-white transition font-semibold"
                      >
                        Reply
                      </button>
                    )}
                  </div>

                  {/* Reply input */}
                  {replyTo === c.id && user && (
                    <form
                      onSubmit={(e) => submit(e, c.id)}
                      className="flex gap-3 mt-4"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm"
                        style={{ background: avatarColor(user.email) }}
                      >
                        {initial(user.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to @${username(c.user_email, c.display_name)}...`}
                          rows={1}
                          maxLength={500}
                          autoFocus
                          className="w-full bg-transparent border-b border-white/20 focus:border-white outline-none pb-2 text-sm resize-none"
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = target.scrollHeight + "px";
                          }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-white/40">
                            {replyText.length}/500
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTo(null);
                                setReplyText("");
                              }}
                              className="px-3 py-1 rounded-full text-xs text-white/70 hover:text-white hover:bg-white/10 transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!replyText.trim() || submitting}
                              className="flex items-center gap-1.5 bg-white text-black font-semibold px-3 py-1 rounded-full text-xs hover:bg-white/90 disabled:opacity-40 transition"
                            >
                              <Send size={12} />
                              {submitting ? "Posting…" : "Reply"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div className="mt-4 ml-13 space-y-4 pl-6 border-l border-white/10">
                  {replies.map((r) => {
                    const isOwnReply = user?.id === r.user_id;
                    const isLikedReply = likedCommentIds.includes(r.id);
                    return (
                      <div key={r.id} className="flex gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm overflow-hidden"
                          style={{ background: avatarColor(r.user_email || "unknown") }}
                        >
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            initial(r.user_email)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="font-semibold">
                                @{username(r.user_email, r.display_name)}
                              </span>
                              <span className="text-white/50">
                                {timeAgo(r.created_at)}
                              </span>
                            </div>
                            {isOwnReply && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(menuOpen === r.id ? null : r.id);
                                  }}
                                  className="text-white/50 hover:text-white p-1"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                {menuOpen === r.id && (
                                  <div className="absolute right-0 top-7 bg-[#1a1a1e] border border-white/10 rounded-lg shadow-xl z-20 min-w-[120px]">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteComment(r.id);
                                      }}
                                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2 rounded-lg"
                                    >
                                      <Trash2 size={12} /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words mt-1">
                            {r.text}
                          </p>
                          <div className="flex items-center gap-4 mt-1.5">
                            <button
                              onClick={() => toggleCommentLike(r.id)}
                              className={`flex items-center gap-1.5 text-xs transition ${
                                isLikedReply ? "text-red-500" : "text-white/60 hover:text-white"
                              }`}
                            >
                              <ThumbsUp size={12} fill={isLikedReply ? "currentColor" : "none"} />
                              {r.like_count > 0 && <span>{r.like_count}</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
