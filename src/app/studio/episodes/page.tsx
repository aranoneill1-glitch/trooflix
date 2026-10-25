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
  status?: string;
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
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
              <option value="newest" className="bg-[#0f0f12]">Newest first</option>
              <option value="oldest" className="bg-[#0f0f12]">Oldest first</option>
              <option value="plays" className="bg-[#0f0f12]">Most plays</option>
              <option value="likes" className="bg-[#0f0f12]">Most likes</option>
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
            const status = v.status || "published";
            const isMenuOpen = openMenuId === v.id;
            
            return (
              <div
                key={v.id}
                className={`relative flex flex-col lg:flex-row lg:items-center gap-4 bg-[#0f0f12] border border-white/[0.06] hover:border-white/20 rounded-2xl p-3 md:p-4 transition-all duration-200 ${
                  isMenuOpen ? "z-50 ring-1 ring-white/10" : "z-10"
                }`}
              >
                {/* 1. Thumbnail & Title */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-24 h-16 md:w-32 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-white/5">
                    {v.posterUrl ? (
                      <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <VideoIcon size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-base md:text-lg font-bold truncate text-white/90 mb-1">{v.title}</p>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-white/50">
                      <span className="font-medium">{v.type || "Episode"}</span>
                      <span>·</span>
                      <span>{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 size={10} /> {status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Stats (Fixed width so they align nicely) */}
                <div className="flex items-center gap-4 text-xs font-medium text-white/60 lg:w-48 shrink-0 lg:border-l lg:border-white/5 lg:pl-4">
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

                {/* 3. Controls */}
                <div className="flex items-center gap-2 shrink-0 lg:w-auto">
                  <select
                    value={v.category || "Uncategorized"}
                    onChange={(e) => updateCategory(v, e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition outline-none border bg-[#18181b] text-white/70 border-white/10 hover:bg-[#27272a] hover:text-white cursor-pointer w-28 md:w-32"
                  >
                    <option value="Uncategorized" disabled>Category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#18181b]">{cat}</option>
                    ))}
                  </select>

                  <select
                    value={currentAccess}
                    onChange={(e) => updateAccess(v, e.target.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition outline-none border cursor-pointer w-28 md:w-32 ${
                      currentAccess === "pass" 
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : currentAccess === "creator"
                        ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <option value="free" className="text-black">Free</option>
                    <option value="pass" className="text-black">TF Pass</option>
                    <option value="creator" className="text-black">Creator Sub</option>
                  </select>

                  {/* 3-Dots Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : v.id);
                      }}
                      className={`p-2 rounded-lg transition ${isMenuOpen ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {isMenuOpen && (
                      <div 
                        className="absolute right-0 top-full mt-2 w-40 bg-[#18181b] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] py-1 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            alert("Edit feature coming soon!");
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            alert("Analytics feature coming soon!");
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition"
                        >
                          <BarChart2 size={14} /> Analytics
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button
                          onClick={() => handleDelete(v)}
                          disabled={deleting === v.id}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
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
