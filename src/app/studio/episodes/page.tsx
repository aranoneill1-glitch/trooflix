"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  Video as VideoIcon, 
  Plus, 
  Trash2, 
  Eye, 
  Heart, 
  MessageCircle, 
  ArrowUpDown,
  MoreVertical,
  Edit2,
  BarChart2,
  CheckCircle2
} from "lucide-react";
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
  category?: string;
  status?: string; // For future Draft/Scheduled support
};

type SortMode = "newest" | "oldest" | "plays" | "likes";

const CATEGORIES = [
  "History", "Politics", "War", "True Crime", "Conspiracy", "Society", 
  "Business", "Science", "Environment", "Religion", "Ancient History", 
  "Comedy", "News", "Other"
];

export default function StudioEpisodes() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("newest");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  
  // State for the three-dot menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

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
    setOpenMenuId(null);
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

  const updateCategory = async (v: Video, newCategory: string) => {
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, category: newCategory } : x));
    try {
      await fetch("/api/creator/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: v.id, category: newCategory }),
      });
    } catch {
      alert("Failed to update category");
      load();
    }
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
      load();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black mb-1 tracking-tight">Episodes</h1>
          <p className="text-sm text-white/50">
            Manage your content and pricing
          </p>
        </div>
        <Link
          href="/studio/upload"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.3)] self-start md:self-auto"
        >
          <Plus size={18} /> Publish new
        </Link>
      </div>

      {/* Controls */}
      {videos.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-[#0f0f12] border border-white/10 rounded-xl px-3 py-1.5">
            <ArrowUpDown size={14} className="text-white/40" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="bg-transparent border-none text-sm text-white/80 outline-none cursor-pointer font-medium"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="plays">Most plays</option>
              <option value="likes">Most likes</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl w-full" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-[#0f0f12]/80 backdrop-blur-md border border-white/10 rounded-3xl p-12 text-center">
          <VideoIcon size={40} className="mx-auto text-white/20 mb-4" />
          <h3 className="text-xl font-bold mb-2">No episodes yet</h3>
          <p className="text-white/50 mb-6 max-w-md mx-auto">Upload your first episode to start building your audience and earning from your content.</p>
          <Link
            href="/studio/upload"
            className="inline-flex items-center gap-2 bg-white text-black hover:bg-white/90 font-bold px-6 py-3 rounded-xl text-sm transition"
          >
            <Plus size={18} /> Publish Episode
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((v) => {
            const currentAccess = v.access_type || (v.is_premium ? "creator" : "free");
            const status = v.status || "published"; // Fallback until DB supports drafts
            
            return (
              <div
                key={v.id}
                className="group relative flex flex-col md:flex-row md:items-center gap-4 bg-[#0f0f12]/60 backdrop-blur-sm border border-white/[0.06] hover:border-white/20 rounded-2xl p-3 md:p-4 transition-all duration-300"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-20 h-14 md:w-24 md:h-16 rounded-xl overflow-hidden flex-shrink-0 bg-black relative">
                    {v.posterUrl ? (
                      <img src={v.posterUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <VideoIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold truncate text-white/90 group-hover:text-white transition-colors">{v.title}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>{v.type || "Episode"}</span>
                      <span>·</span>
                      <span>{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 size={10} /> {status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white/60 md:mr-4 bg-black/20 px-3 py-1.5 rounded-lg">
                  <span className="inline-flex items-center gap-1.5" title="Plays">
                    <Eye size={14} className="text-orange-400" /> {(v.viewCount || 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1.5" title="Likes">
                    <Heart size={14} className="text-red-400" /> {(likeCounts[v.id] || 0).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1.5" title="Comments">
                    <MessageCircle size={14} className="text-blue-400" /> {(commentCounts[v.id] || 0).toLocaleString()}
                  </span>
                </div>

                {/* Controls (Category & Access) */}
                <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
                  
                  <select
                    value={v.category || "Uncategorized"}
                    onChange={(e) => updateCategory(v, e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition outline-none border bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <option value="Uncategorized" disabled>Category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#0f0f12]">{cat}</option>
                    ))}
                  </select>

                  <select
                    value={currentAccess}
                    onChange={(e) => updateAccess(v, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition outline-none border cursor-pointer ${
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

                  {/* Three Dot Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === v.id ? null : v.id)}
                      className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition"
                    >
                      <MoreVertical size={18} />
                    </button>

                    {openMenuId === v.id && (
                      <>
                        {/* Click-away overlay */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-40 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              alert("Edit feature coming soon! (Requires backend API route)");
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              alert("Analytics feature coming soon!");
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition"
                          >
                            <BarChart2 size={14} /> Analytics
                          </button>
                          <div className="h-px bg-white/5 my-1" />
                          <button
                            onClick={() => handleDelete(v)}
                            disabled={deleting === v.id}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
