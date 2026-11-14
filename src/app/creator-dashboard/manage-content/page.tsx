"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus, Search, Video, Mic, Eye, Heart, 
  MoreVertical, Pencil, Trash2, Play, LayoutGrid, List, 
  FileText, Crown, Clock, Globe, Lock, ChevronLeft, X, Radio, Star
} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = ["Documentaries","Podcasts","Independent Films","Books","History","Politics & Geopolitics","War & Conflict","True Crime & Justice","Conspiracy & Mystery","Society & Culture","Business & Finance","Science & Technology","Environment & Nature","Religion & Spirituality","Ancient Civilisation","Comedy","News","Gaming","Medicine"];

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
  visibility?: string;
};

export default function ManageContentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [profileFeature, setProfileFeature] = useState<any>(null);
  const [savingProfileFeatureId, setSavingProfileFeatureId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Videos" | "Podcasts" | "Documentaries" | "Premium" | "Drafts">("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("History");
  const [editType, setEditType] = useState("long-video");
  const [editVisibility, setEditVisibility] = useState("public");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showAddContentMenu, setShowAddContentMenu] = useState(false);

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      fetch(`/api/profile-feature?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setProfileFeature(data.feature || null))
        .catch(() => {});

      // Fetch all videos and filter by this creator
      fetch("/api/videos", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          const myVideos = Array.isArray(data) 
            ? data.filter((v: any) => v.uploaderUserId && String(v.uploaderUserId) === String(user.id)) 
            : [];
          setVideos(myVideos);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const openEditModal = (video: any) => {
    setEditingVideo(video);
    setEditTitle(video.title || "");
    setEditDescription(video.description || "");
    setEditCategory(video.category || "History");
    setEditType(video.type || "long-video");
    setEditVisibility(video.visibility || "public");
    setActiveMenuId(null);
  };

  const setAsProfileFeature = async (video: VideoType) => {
    if (savingProfileFeatureId !== null) return;
    setSavingProfileFeatureId(video.id);
    try {
      const res = await fetch("/api/profile-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "video", videoId: video.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not set profile feature");
      setProfileFeature(data.feature);
      setActiveMenuId(null);
    } catch (error: any) {
      alert(error.message || "Could not set profile feature.");
    } finally {
      setSavingProfileFeatureId(null);
    }
  };

  const canBeProfileFeature = (video: VideoType) => {
    const type = String(video.type || "").toLowerCase();
    return type !== "short" && type !== "reel" && type !== "tweet" && video.visibility !== "premium" && video.is_premium !== true;
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch("/api/videos/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVideo.id,
          title: editTitle,
          description: editDescription,
          category: editCategory,
          type: editType,
          visibility: editVisibility
        }),
      });
      if (res.ok) {
        setVideos(prev => prev.map(v => v.id === editingVideo.id ? { ...v, title: editTitle, description: editDescription, category: editCategory, type: editType, visibility: editVisibility } : v));
        setEditingVideo(null);
      } else {
        const err = await res.json();
        alert("Failed to save: " + err.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

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
      const t = v.type?.toLowerCase();
      if (activeTab === "Videos") return t !== "tweet" && t !== "short" && t !== "podcast" && t !== "documentary" && v.visibility !== "premium";
      if (activeTab === "Podcasts") return t === "podcast";
      if (activeTab === "Documentaries") return t === "documentary";
      if (activeTab === "Premium") return v.visibility === "premium" || v.is_premium === true; // Or however you flag premium
      if (activeTab === "Drafts") return false; // Placeholder if you add draft logic
      
      return true; // "All"
    });
  }, [videos, searchQuery, activeTab]);

  // Stats Calculation
  const totalViews = videos.reduce((sum, v) => sum + (v.viewCount || 0), 0);
  const totalLikes = videos.reduce((sum, v) => sum + (v.likeCount || 0), 0);
  const totalPodcasts = videos.filter(v => v.type?.toLowerCase() === "podcast").length;
  const totalDocumentaries = videos.filter(v => v.type?.toLowerCase() === "documentary").length;

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

      <div className="max-w-5xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6rem)] pb-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/creator-dashboard" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-2 transition">
              <ChevronLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black tracking-tight">Manage Content</h1>
          </div>
          <button onClick={() => setShowAddContentMenu(true)} className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition-all whitespace-nowrap shadow-lg shrink-0">
            <Plus size={16} className="text-[#E53945]" /> Upload New
          </button>
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
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
              <Video size={18} />
            </div>
            <div>
              <p className="text-xs text-white/50 font-semibold uppercase">Documentaries</p>
              <p className="text-xl font-black">{totalDocumentaries}</p>
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
            {(["All", "Videos", "Podcasts", "Documentaries", "Premium", "Drafts"] as const).map((tab) => (
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
              <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl group hover:border-[#E53945]/50 transition-colors relative">
                
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black rounded-t-2xl overflow-hidden">
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
                      {canBeProfileFeature(video) && (
                        <button onClick={() => setAsProfileFeature(video)} disabled={savingProfileFeatureId !== null || String(profileFeature?.videoId) === String(video.id)} className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-default ${String(profileFeature?.videoId) === String(video.id) ? "border-[#E53945]/40 bg-[#E53945]/10 text-[#F06A72]" : "border-white/10 text-white/60 hover:border-[#E53945]/40 hover:text-white"}`}>
                          <Star size={12} /> {String(profileFeature?.videoId) === String(video.id) ? "Profile feature" : savingProfileFeatureId === video.id ? "Setting…" : "Set as profile feature"}
                        </button>
                      )}
                    </div>

                    {/* Action Menu */}
                    <div className="relative">
                      <button onClick={() => setActiveMenuId(activeMenuId === video.id ? null : video.id)} className="p-1.5 text-white/50 hover:text-white rounded-lg transition">
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeMenuId === video.id && (
                        <div className="absolute right-0 bottom-full mb-2 z-20 w-36 bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                          <button onClick={() => openEditModal(video)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left">
                            <Pencil size={14} /> Edit
                          </button>
                          {canBeProfileFeature(video) && <button onClick={() => setAsProfileFeature(video)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left"><Star size={14} /> Set as profile feature</button>}
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
              <div key={video.id} className="flex items-center gap-3 md:gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-2.5 md:p-3 hover:border-[#E53945]/50 transition-colors relative group">
                
                {/* Thumbnail */}
                <div className="w-24 md:w-32 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                  <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" />
                  <div className={`absolute top-1 left-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>
                    {video.type || "VIDEO"}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white truncate">{video.title}</h3>
                    {video.is_premium && <Crown size={14} className="text-yellow-500 shrink-0" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] md:text-xs text-white/50">
                    <span className="flex items-center gap-1"><Eye size={12} /> {(video.viewCount || 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Heart size={12} /> {(video.likeCount || 0).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Just now'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 px-1">
                  {canBeProfileFeature(video) && <button onClick={() => setAsProfileFeature(video)} disabled={savingProfileFeatureId !== null || String(profileFeature?.videoId) === String(video.id)} className={`hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold transition disabled:cursor-default ${String(profileFeature?.videoId) === String(video.id) ? "border-[#E53945]/40 bg-[#E53945]/10 text-[#F06A72]" : "border-white/10 text-white/60 hover:border-[#E53945]/40 hover:text-white"}`}><Star size={12} />{String(profileFeature?.videoId) === String(video.id) ? "Profile feature" : "Set as feature"}</button>}
                  <button onClick={() => openEditModal(video)} className="p-2 text-white/50 hover:text-white rounded-lg transition hidden md:block">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(video.id)} className="p-2 text-white/50 hover:text-red-500 rounded-lg transition hidden md:block">
                    <Trash2 size={16} />
                  </button>
                  
                  <div className="relative md:hidden">
                    <button onClick={() => setActiveMenuId(activeMenuId === video.id ? null : video.id)} className="p-1.5 text-white/50 hover:text-white rounded-lg transition">
                      <MoreVertical size={18} />
                    </button>
                    {activeMenuId === video.id && (
                      <div className="absolute right-0 bottom-full mb-2 z-20 w-36 bg-[#2c2c2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1">
                        <button onClick={() => openEditModal(video)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left">
                          <Pencil size={14} /> Edit
                        </button>
                        {canBeProfileFeature(video) && <button onClick={() => setAsProfileFeature(video)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition text-left"><Star size={14} /> Set as profile feature</button>}
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

      
      {editingVideo && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold">Edit Video</h2>
              <button onClick={() => setEditingVideo(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Title</label>
                <input required type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Description</label>
                <textarea required value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Content Type</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition appearance-none">
                  <option value="long-video">Long Video</option>
                  <option value="Podcast">Podcast</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Short">Short</option>
                  <option value="Independent Film">Independent Film</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Category</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#E53945] transition appearance-none">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Visibility</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setEditVisibility("public")} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition ${editVisibility === "public" ? "bg-[#E53945]/10 border-[#E53945] text-[#E53945]" : "bg-black/40 border-white/10 text-white/50"}`}>
                    <Globe size={18} /> Public
                  </button>
                  <button type="button" onClick={() => setEditVisibility("premium")} className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition ${editVisibility === "premium" ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]" : "bg-black/40 border-white/10 text-white/50"}`}>
                    <Lock size={18} /> Premium
                  </button>
                </div>
              </div>
              <button type="submit" disabled={savingEdit} className="w-full mt-4 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
      <MobileBottomNav />
    
      {/* SLIDE-UP CREATE MENU */}
      <AnimatePresence>
        {showAddContentMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddContentMenu(false)}
              className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-white/10 backdrop-blur-2xl backdrop-saturate-150 rounded-t-[32px] border-t border-white/20 p-6 pb-28 lg:max-w-md lg:mx-auto lg:rounded-[32px] lg:bottom-10 shadow-[0_-20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] max-h-[85vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-6 lg:hidden" />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white tracking-tight">Add Content</h3>
                <button onClick={() => setShowAddContentMenu(false)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/15 transition text-white border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setShowAddContentMenu(false); router.push("/creator-dashboard/upload"); }}
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-white/25 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                    <Video className="text-[#E53945]" size={24} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-white text-base">Upload Video</h4>
                    <p className="text-xs text-white/50">Publish a long-form video</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setShowAddContentMenu(false); router.push("/creator-dashboard/upload?type=podcast"); }}
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-blue-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Mic className="text-blue-400" size={24} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-white text-base">Upload Podcast</h4>
                    <p className="text-xs text-white/50">Publish to the Podcasts section on Home</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setShowAddContentMenu(false); router.push("/creator-dashboard/upload?type=documentary"); }}
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-violet-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="text-violet-400" size={24} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-white text-base">Upload Documentary</h4>
                    <p className="text-xs text-white/50">Publish to the Documentaries section on Home</p>
                  </div>
                </button>

                <button 
                  onClick={() => { setShowAddContentMenu(false); router.push("/creator-dashboard/upload?type=short"); }}
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-blue-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Play className="text-blue-400" size={24} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-white text-base">Upload Short</h4>
                    <p className="text-xs text-white/50">Publish to the Shorts feed and your profile</p>
                  </div>
                </button>
                
                <button
                  onClick={() => { setShowAddContentMenu(false); router.push("/creator-dashboard/live"); }}
                  className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-[#E53945]/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                    <Radio className="text-[#E53945]" size={24} />
                  </div>
                  <div className="relative z-10">
                    <h4 className="font-bold text-white text-base">Go Live</h4>
                    <p className="text-xs text-white/50">Start a live stream with your fans</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
