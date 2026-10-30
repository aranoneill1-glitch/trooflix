"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2, LayoutGrid, List, ShoppingBag } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("All");
  const [contentView, setContentView] = useState("grid");

  // Force a router refresh to bust caches on load
  useEffect(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: prof } = await supabase.from("profiles").select("*").eq("username", username).single();
      
      if (!prof) { setLoading(false); return; }
      setProfile(prof);

      let cid = null;
      try {
        const cRes = await fetch(`/api/me/creator?user_id=${prof.user_id}`).then(r => r.json());
        if (cRes.creator) cid = cRes.creator.id;
      } catch (e) {}

      try {
        const vRes = await fetch("/api/videos").then(r => r.json());
        if (Array.isArray(vRes)) {
          setVideos(vRes.filter((v: any) => String(v.uploaderUserId) === String(prof.user_id) || String(v.creatorId) === String(cid)));
        }
      } catch (e) {}

      try {
        const mRes = await fetch("/api/products/global").then(r => r.json());
        if (mRes.products) {
          setMerch(mRes.products.filter((p: any) => String(p.creator_id) === String(cid) || String(p.creator_id) === String(prof.user_id)));
        }
      } catch (e) {}

      setLoading(false);
    }
    if (username) load();
  }, [username]);

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!profile) return <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center">User not found</div>;

  // Filter videos based on tab
  const filteredVideos = videos.filter(v => {
    if (activeTab === "Podcasts") return v.type?.toLowerCase().includes("podcast");
    if (activeTab === "Videos") return !v.type?.toLowerCase().includes("podcast");
    return true; // All
  });

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-24">
        
        {/* HEADER */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#09090B] ring-2 ring-[#E53945] mb-4">
            {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#1c1c1e] flex items-center justify-center text-5xl font-bold">{profile.display_name?.[0] || "?"}</div>}
          </div>
          <h1 className="text-2xl font-black flex items-center gap-2">{profile.display_name || "User"} {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}</h1>
          <p className="text-white/50">@{profile.username}</p>
        </div>

        {/* TABS */}
        <div className="flex items-center justify-between border-b border-white/10 mb-6">
          <div className="flex items-center gap-6">
            {["All", "Podcasts", "Videos", "Store"].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`pb-3 text-sm font-bold transition-colors ${activeTab === tab ? "text-white border-b-2 border-[#E53945]" : "text-white/50"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* HIDE THE GRID TOGGLE WHEN ON THE STORE TAB */}
          {activeTab !== "Store" && (
            <div className="flex gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
              <button onClick={() => setContentView("grid")} className={`p-1.5 rounded ${contentView === "grid" ? "bg-white text-black" : "text-white/50"}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setContentView("list")} className={`p-1.5 rounded ${contentView === "list" ? "bg-white text-black" : "text-white/50"}`}><List size={16} /></button>
            </div>
          )}
        </div>

        {/* --- RENDER LOGIC --- */}
        
        {/* IF STORE TAB IS ACTIVE, SHOW MERCH ONLY */}
        {activeTab === "Store" && (
          <div className="w-full">
            {merch.length === 0 ? (
              <div className="text-center py-12 bg-[#1c1c1e] rounded-2xl border border-white/5">
                <ShoppingBag size={32} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/50">No products available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {merch.map((item) => (
                  <div key={item.id} className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden p-3">
                    <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover rounded-lg mb-3" />
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <p className="text-emerald-400 font-bold text-xs mt-1">${(item.price_cents / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* IF ANY OTHER TAB IS ACTIVE, SHOW VIDEOS ONLY */}
        {activeTab !== "Store" && (
          <div className="w-full">
            {filteredVideos.length === 0 ? (
              <div className="text-center py-12 bg-[#1c1c1e] rounded-2xl border border-white/5">
                <p className="text-white/50">No content found.</p>
              </div>
            ) : contentView === "grid" ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden group cursor-pointer">
                    <div className="relative aspect-video">
                      <img src={video.posterUrl || video.backdropUrl} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-[#E53945] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">{video.type || "VIDEO"}</div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-bold text-white line-clamp-2">{video.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="flex gap-3 bg-[#1c1c1e] border border-white/10 rounded-xl p-3">
                    <img src={video.posterUrl || video.backdropUrl} className="w-24 aspect-video object-cover rounded-lg" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{video.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      <MobileBottomNav />
    </main>
  );
}
