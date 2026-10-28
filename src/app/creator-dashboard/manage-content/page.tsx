"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, Play, X, CheckCircle2, AlertCircle } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

const CATEGORIES = [
  "Documentaries", "Podcasts", "Independent Films", "Books", "History", 
  "Politics & Geopolitics", "War & Conflict", "True Crime & Justice", 
  "Conspiracy & Mystery", "Society & Culture", "Business & Finance", 
  "Science & Technology", "Environment & Nature", "Religion & Spirituality", 
  "Ancient Civilisation", "Comedy", "News", "Gaming"
];

export default function ManageContentPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function loadVideos() {
      const user = await getCachedUser();
      if (!user) return setLoading(false);

      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("creator_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.creator_id) {
        const res = await fetch("/api/videos");
        const data = await res.json();
        const myVideos = Array.isArray(data) ? data.filter((v: any) => 
          String(v.creatorId) === String(profile.creator_id)
        ) : [];
        setVideos(myVideos);
      }
      setLoading(false);
    }
    loadVideos();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this video? This cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setVideos(videos.filter(v => v.id !== id));
        showToast("✅ Video deleted successfully");
      }
    } catch (err) {
      showToast("❌ Failed to delete video");
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/videos?id=${editingVideo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingVideo)
      });
      
      if (res.ok) {
        setVideos(videos.map(v => v.id === editingVideo.id ? editingVideo : v));
        setEditingVideo(null);
        showToast("✅ Video updated successfully");
      }
    } catch (err) {
      showToast("❌ Failed to update video");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans">
      <TopBar />
      
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[500] bg-[#1c1c1e] border border-white/10 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-top-4">
          {toast.includes("✅") ? <CheckCircle2 size={16} className="text-[#1ed760]" /> : <AlertCircle size={16} className="text-red-500" />}
          {toast.replace("✅ ", "").replace("❌ ", "")}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/creator-dashboard" className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Manage Content</h1>
            <p className="text-sm text-white/50">Edit or delete your published videos.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 bg-[#1c1c1e] border border-white/10 rounded-2xl">
            <p className="text-white/50 mb-4">You haven't uploaded any content yet.</p>
            <Link href="/creator-dashboard/upload" className="bg-[#E53945] text-white font-bold px-6 py-2 rounded-full">Create your first video</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => (
              <div key={video.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 hover:border-white/20 transition-colors">
                <div className="relative w-32 h-20 rounded-xl overflow-hidden shrink-0 bg-black">
                  <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play size={20} fill="white" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{video.title}</h3>
                  <p className="text-xs text-white/50 mt-1">{video.category} • {video.type}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      video.visibility === 'premium' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#E53945]/20 text-[#E53945]'
                    }`}>
                      {video.visibility || 'Plus'}
                    </span>
                    <span className="text-[10px] text-white/40">{new Date(video.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditingVideo(video)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white transition">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(video.id)} className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingVideo && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold">Edit Video</h2>
              <button onClick={() => setEditingVideo(null)} className="p-1 text-white/50 hover:text-white bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="p-4 overflow-y-auto space-y-4 max-h-[60vh]">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Title</label>
                <input required type="text" value={editingVideo.title} onChange={e => setEditingVideo({...editingVideo, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Description</label>
                <textarea required value={editingVideo.description} onChange={e => setEditingVideo({...editingVideo, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none resize-none h-24" />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Category</label>
                <select value={editingVideo.category} onChange={e => setEditingVideo({...editingVideo, category: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none appearance-none">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEditingVideo({...editingVideo, visibility: 'plus'})} className={`p-2 rounded-lg border text-sm font-bold transition ${editingVideo.visibility === 'plus' ? 'bg-[#E53945]/20 border-[#E53945] text-[#E53945]' : 'bg-black/40 border-white/10 text-white/50'}`}>TrooPlus</button>
                  <button type="button" onClick={() => setEditingVideo({...editingVideo, visibility: 'premium'})} className={`p-2 rounded-lg border text-sm font-bold transition ${editingVideo.visibility === 'premium' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-black/40 border-white/10 text-white/50'}`}>Premium</button>
                </div>
              </div>
              
              <button disabled={isSaving} type="submit" className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3 rounded-xl transition mt-4">
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}
