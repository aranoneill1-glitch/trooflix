"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus, Search, Video, Mic, Eye, Heart, 
  MoreVertical, Pencil, Trash2, Play, LayoutGrid, List, 
  FileText, Crown, Clock, ChevronLeft 
} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";

type VideoType = {
  id: number;
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  type?: string;
  duration?: string;
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  is_premium?: boolean;
};

export default function ManageContentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Videos" | "Podcasts" | "Premium" | "Drafts">("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Fetch all videos and filter by this creator
      fetch("/api/videos", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          const myVideos = Array.isArray(data) 
            ? data.filter((v: any) => String(v.creatorId) === String(user.id) || !v.creatorId) 
            : [];
          setVideos(myVideos);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const handleDelete = async (videoId: number) => {
    if (!confirm("Are you sure you want to delete this content? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/user/posts?id=${videoId}&userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
        setActiveMenuId(null);
      } else {
        alert("Failed to delete.");
      }
    } catch {
      alert("Network error.");
    }
  };

  // Filter Logic
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      // 1. Search Filter
      if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // 2. Tab Filter
      if (activeTab === "Videos") return v.type?.toLowerCase() !== "podcast";
      if (activeTab === "Podcasts") return v.type?.toLowerCase() === "podcast";
      if (activeTab === "Premium") return v.is_premium === true; // Or however you flag premium
      if (activeTab === "Drafts") return false; // Placeholder if you add draft logic
      
      return true; // "All"
    });
  }, [videos, searchQuery, activeTab]);

  // Stats Calculation
  const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.likeCount || 0), 0);
  const totalPodcasts = videos.filter(v => v.type?.toLowerCase() === "podcast").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/creator-dashboard" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-2 transition">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight">Manage Content</h1>
          </div>
          <Link href="/creator-dashboard/upload" className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
            <Plus size={18} /> Upload New
          </Link>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E53945]/10 flex items-center justify-center text-[#E53945]">
              <Video size={18} />
            </div>
            <div>
              <p className="text-xs text-white/50 font-semibold uppercase">Total Videos</p>
              <p className="text-xl font-black">{videos.length}</p>
            </div>
          </div>
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Mic size={18} />
            </div>
            <div>
              <p className="text-xs text-white/50 font-semibold uppercase">Podcasts</p>
              <p className="text-xl font-black">{totalPodcasts}</p>
            </div>
          </div>
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Eye size={18} />
            </div>
            <div>
              <p className="text-xs text-white/50 font-semibold uppercase">Total Views</p>
              <p className="text-xl font-black">{totalViews.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400">
              <Heart size={18} />
            </div>
            <div>
              <p className="text-xs text-white/50 font-semibold uppercase">Total Likes</p>
              <p className="text-xl font-black">{totalLikes.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-xl overflow-x-auto scrollbar-hide">
            {(["All", "Videos", "Podcasts", "Premium", "Drafts"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? "bg-white text-black shadow-sm" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-[#E53945] transition"
              />
            </div>
            <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-24 bg-[#1c1c1e] border border-white/5 rounded-3xl">
            <Video size={48} className="mx-auto text-white/10 mb-4" />
            <h2 className="text-xl font-bold mb-2">No content found</h2>
            <p className="text-sm text-white/50 mb-6">
              {searchQuery ? "Try adjusting your search terms." : "Upload your first piece of content to get started."}
            </p>
            {!searchQuery && (
              <Link href="/creator-dashboard/upload" className="inline-flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-2.5 rounded-xl transition">
                <Plus size={18} /> Upload Now
              </Link>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group hover:border-[#E53945]/50 transition-colors relative">
                
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black">
                  <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  
                  {/* Type Badge */}
                  <div className={`absolute top-3 left-3 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500/80' : 'bg-[#E53945]/80'}`}>
                    {video.type?.toUpperCase() || "VIDEO"}
                  </div>

                  {/* Duration */}
                  {video.duration && (
                    <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 rounded text-[11px] font-bold text-white backdrop-blur-sm">
                      {video.duration}
                    </div>
                  )}

                  {/* Premium Badge */}
                  {video.is_premium && (
                    <div className="absolute top-3 right-3 bg-yellow-500/90 text-black text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1">
                      <Crown size={12} /> PREMIUM
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white leading-tight truncate">{video.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                        <span className="flex items-center gap-1"><Eye size={12} /> {(video.viewCount || 0).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Heart size={12} /> {(video.likeCount || 0).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Just now'}</span>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <div className="relative">
                      <button onClick={() => setActiveMenuId(activeMenuId === video.id ? null : video.id)} className="p-1.5 text-white/50 hover:text-white rounded-lg transition">
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeMenuId === video.id && (
                        <div className="absolute right-0 top-8 z-20 w-36 bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left">
                            <Pencil size={14} /> Edit
                          </button>
                          <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left">
                            <Eye size={14} /> View
                          </button>
                          <div className="h-px bg-white/5 my-1" />
                          <button onClick={() => handleDelete(video.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition text-left">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredVideos.map((video) => (
              <div key={video.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 hover:border-[#E53945]/50 transition-colors relative group">
                
                {/* Thumbnail */}
                <div className="w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                  <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" />
                  <div className={`absolute top-1 left-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>
                    {video.type || "VIDEO"}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white truncate">{video.title}</h3>
                    {video.is_premium && <Crown size={14} className="text-yellow-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1"><Eye size={12} /> {(video.viewCount || 0).toLocaleString()} views</span>
                    <span className="flex items-center gap-1"><Heart size={12} /> {(video.likeCount || 0).toLocaleString()} likes</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Just now'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 px-2">
                  <button className="p-2 text-white/50 hover:text-white rounded-lg transition hidden md:block">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(video.id)} className="p-2 text-white/50 hover:text-red-500 rounded-lg transition hidden md:block">
                    <Trash2 size={16} />
                  </button>
                  <div className="relative md:hidden">
                    <button onClick={() => setActiveMenuId(activeMenuId === video.id ? null : video.id)} className="p-2 text-white/50 hover:text-white rounded-lg transition">
                      <MoreVertical size={18} />
                    </button>
                    {activeMenuId === video.id && (
                      <div className="absolute right-0 top-10 z-20 w-36 bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                        <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left">
                          <Pencil size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(video.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition text-left">
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* Click outside to close menu overlay */}
      {activeMenuId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
      )}

      <MobileBottomNav />
    </main>
  );
}
