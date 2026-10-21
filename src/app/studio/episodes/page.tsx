"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Video as VideoIcon, Plus, Trash2, Eye, Heart, MessageCircle, ArrowUpDown } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Video = {
  id: number;
  title: string;
  description?: string;
  posterUrl?: string;
  type?: string;
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  is_premium?: boolean;
  access_type?: string;
};

type SortMode = "newest" | "oldest" | "plays" | "likes";

export default function StudioEpisodes() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("newest");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  const load = async () => {
    setLoading(true);
    try {
      const user = await getCachedUser();
      if (!user) return;
      const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then((r) => r.json());
      if (!cr.creator) {
        setLoading(false);
        return;
      }
      const vRes = await fetch(`/api/creators/videos?creatorId=${cr.creator.id}`, { cache: "no-store" }).then((r) => r.json());
      setVideos(Array.isArray(vRes.videos) ? vRes.videos : []);

      try {
        const lr = await fetch("/api/like-counts").then((r) => r.json());
        setLikeCounts(lr.counts || {});
      } catch {}
      try {
        const cr2 = await fetch("/api/comment-counts").then((r) => r.json());
        setCommentCounts(cr2.counts || {});
      } catch {}
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...videos];
    const getDate = (v: Video) => (v.createdAt ? new Date(v.createdAt).getTime() : v.id);
    if (sort === "newest") copy.sort((a, b) => getDate(b) - getDate(a));
    else if (sort === "oldest") copy.sort((a, b) => getDate(a) - getDate(b));
    else if (sort === "plays") copy.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    else if (sort === "likes") copy.sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0));
    return copy;
  }, [videos, sort, likeCounts]);

  const handleDelete = async (v: Video) => {
    if (!confirm(`Delete "${v.title}"? This cannot be undone.`)) return;
    setDeleting(v.id);
    try {
      const user = await getCachedUser();
      if (!user) return;
      const res = await fetch(`/api/user/posts?id=${v.id}&userId=${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((x) => x.id !== v.id));
      } else {
        alert("Could not delete");
      }
    } catch {
      alert("Network error");
    }
    setDeleting(null);
  };

  const updateAccess = async (v: Video, newAccess: string) => {
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, access_type: newAccess } : x));
    try {
      await fetch("/api/creator/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: v.id, access_type: newAccess }),
      });
    } catch {
      alert("Failed to update access level");
      load(); // Revert on failure
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black mb-1">Episodes</h1>
          <p className="text-sm text-white/50">
            {videos.length} {videos.length === 1 ? "episode" : "episodes"} published
          </p>
        </div>
        <Link
          href="/studio/upload"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-4 md:px-5 py-2.5 rounded-lg text-sm transition self-start md:self-auto"
        >
          <Plus size={16} /> Publish new
        </Link>
      </div>

      {videos.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpDown size={14} className="text-white/40" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="bg-[#0f0f12] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-red-600"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="plays">Most plays</option>
            <option value="likes">Most likes</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-white/50 py-12 text-center">Loading…</p>
      ) : videos.length === 0 ? (
        <div className="bg-[#0f0f12] border border-white/10 rounded-xl p-10 text-center">
          <VideoIcon size={32} className="mx-auto text-white/20 mb-3" />
          <p className="text-white/60 mb-4">You haven't published any episodes yet.</p>
          <Link
            href="/studio/upload"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition"
          >
            <Plus size={16} /> Publish your first episode
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((v) => {
            // Determine current access (fallback for older videos that just have is_premium)
            const currentAccess = v.access_type || (v.is_premium ? "creator" : "free");
            
            return (
              <div
                key={v.id}
                className="flex flex-col md:flex-row md:items-center gap-3 bg-[#0f0f12] border border-white/5 hover:border-white/10 rounded-xl p-3 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                    {v.posterUrl ? (
                      <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <VideoIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{v.title}</p>
                    <p className="text-xs text-white/50">
                      {v.type || "Episode"} ·{" "}
                      {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/60 md:mr-4">
                  <span className="inline-flex items-center gap-1" title="Plays">
                    <Eye size={14} /> {(v.viewCount || 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1" title="Likes">
                    <Heart size={14} /> {(likeCounts[v.id] || 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1" title="Comments">
                    <MessageCircle size={14} /> {(commentCounts[v.id] || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 md:flex-shrink-0">
                  
                  {/* 3-Way Access Dropdown */}
                  <select
                    value={currentAccess}
                    onChange={(e) => updateAccess(v, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition outline-none border ${
                      currentAccess === "pass" 
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : currentAccess === "creator"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <option value="free" className="text-black">Free</option>
                    <option value="pass" className="text-black">TF Pass Only</option>
                    <option value="creator" className="text-black">Creator Sub</option>
                  </select>

                  <button
                    onClick={() => handleDelete(v)}
                    disabled={deleting === v.id}
                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50"
                    aria-label="Delete episode"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
