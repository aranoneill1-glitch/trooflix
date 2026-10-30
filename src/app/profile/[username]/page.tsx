"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2, LayoutGrid, List, ShoppingBag } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import LivePlayer from "@/components/LivePlayer";
import { createClient } from "@/utils/supabase/client";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Podcasts" | "Videos" | "Store">("All");
  const [contentView, setContentView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    async function loadProfileAndVideos() {
      const supabase = createClient();
      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("username", username).single();
      
      if (error || !profileData) { setLoading(false); return; }
      setProfile(profileData);

      let creatorId = null;
      try {
        const creatorRes = await fetch(`/api/me/creator?user_id=${profileData.user_id}`);
        const creatorData = await creatorRes.json();
        if (creatorData.creator) creatorId = creatorData.creator.id;
      } catch (err) {}

      try {
        const videosRes = await fetch("/api/videos", { cache: "no-store" });
        const allVideos = await videosRes.json();
        if (Array.isArray(allVideos)) {
          const creatorVideos = allVideos.filter((v: any) => 
            String(v.uploaderUserId) === String(profileData.user_id) || String(v.creatorId) === String(creatorId)
          );
          setVideos(creatorVideos);
        }
      } catch (err) {}

      try {
        const merchRes = await fetch("/api/products/global");
        const merchData = await merchRes.json();
        if (merchData.products) {
          const creatorMerch = merchData.products.filter((p: any) => 
            String(p.creatorSlug) === String(username) || String(p.creator_id) === String(creatorId)
          );
          setMerch(creatorMerch);
        }
      } catch (err) {}

      setLoading(false);
    }
    if (username) loadProfileAndVideos();
  }, [username]);

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!profile) return <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4"><h1 className="text-2xl font-bold mb-4">User not found</h1><Link href="/" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Go Home</Link></main>;

  const displayName = profile.display_name || "User";

  const filteredVideos = videos.filter(v => {
    if (activeContentTab === "Podcasts") return v.type?.toLowerCase().includes("podcast");
    if (activeContentTab === "Videos") return !v.type?.toLowerCase().includes("podcast");
    return true;
  });

  const bgStyle = profile.backdrop_url
    ? profile.backdrop_url.startsWith("http")
      ? { backgroundImage: `url(${profile.backdrop_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: profile.backdrop_url }
    : { background: "#09090B" };

  return (
    <main className="fixed inset-0 overflow-y-auto overscroll-none text-white pb-32 font-sans">
      <div className="absolute inset-0 z-0" style={bgStyle}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 min-h-full">
        <TopBar />
        
        <div className="max-w-2xl mx-auto px-4 pt-24">
          <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-8 text-sm font-semibold">
            <ArrowLeft size={16} /> Back
          </Link>

          <div className="flex flex-col items-center text-center">
            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full p-[3px] mb-4 shrink-0 ${profile.is_live ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-tr from-[#E53945] to-orange-500'}`}>
              <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl font-bold">{displayName.charAt(0)}</div>}
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-black flex items-center justify-center gap-2 text-white mb-1">
              {displayName} {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}
              {profile.is_live && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-sm ml-2 animate-pulse">LIVE</span>}
            </h1>
            <p className="text-white/50 mb-6">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-white/70 max-w-md mb-8 leading-relaxed">{profile.bio}</p>}

            {/* LIVE PLAYER */}
            {profile.is_live && profile.live_playback_url && (
              <div className="w-full mb-8">
                <LivePlayer whepUrl={profile.live_playback_url} />
              </div>
            )}

            <div className="flex items-center justify-center gap-12 mb-8 w-full">
              <div className="text-center"><span className="font-bold text-white block text-xl">0</span><span className="text-white/50 text-[11px] uppercase tracking-wider">Following</span></div>
              <div className="text-center"><span className="font-bold text-white block text-xl">0</span><span className="text-white/50 tracking-wider uppercase text-[11px]">Followers</span></div>
              <div className="text-center"><span className="font-bold text-white block text-xl">{videos.length}</span><span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span></div>
            </div>

            <div className="flex gap-3 w-full max-w-sm mx-auto mb-10">
              <button className="flex-1 flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition shadow-lg text-sm"><UserPlus size={18} /> Follow</button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-full transition border border-white/10 text-sm"><MessageSquare size={18} /> Message</button>
            </div>

            <div className="flex items-center justify-between border-b border-white/10 mb-6 w-full text-left">
              <div className="flex items-center gap-8">
                {(["All", "Podcasts", "Videos", "Store"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveContentTab(tab)} className={`pb-3 text-sm font-bold transition-colors ${activeContentTab === tab ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>{tab}</button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
                <button onClick={() => setContentView("grid")} className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setContentView("list")} className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><List size={16} /></button>
              </div>
            </div>

            <div className="w-full">
              {activeContentTab === "Store" && (
                <div className="w-full">
                  {merch.length === 0 ? (
                    <div className="text-center py-12 bg-[#1c1c1e] border border-white/5 rounded-2xl"><ShoppingBag size={32} className="mx-auto text-white/20 mb-3" /><p className="text-white/50 text-sm">No products available yet.</p></div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-3">
                      {merch.map((item) => (
                        <div key={item.id} className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden group cursor-pointer flex flex-col">
                          <div className="relative aspect-square">
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between text-left">
                            <h3 className="text-sm font-bold leading-tight line-clamp-2 text-white">{item.name}</h3>
                            <p className="text-emerald-400 font-bold text-xs mt-2">${(item.price_cents / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {merch.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3">
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative"><img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0 text-left"><h3 className="text-sm font-bold text-white truncate">{item.name}</h3><p className="text-xs text-white/50 mt-1">Merch</p></div>
                          <p className="text-emerald-400 font-bold text-sm shrink-0">${(item.price_cents / 100).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab !== "Store" && (
                filteredVideos.length === 0 ? (
                  <div className="text-center py-12 bg-[#1c1c1e] border border-white/5 rounded-2xl"><p className="text-white/50 text-sm">No content found yet.</p></div>
                ) : contentView === "grid" ? (
                  <div className="grid grid-cols-3 gap-3">
                    {filteredVideos.map((video) => (
                      <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden group cursor-pointer">
                        <div className="relative aspect-video">
                          <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className={`absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${video.type?.toLowerCase().includes('podcast') ? 'bg-blue-500' : 'bg-[#E53945]'}`}>{video.type || "VIDEO"}</div>
                        </div>
                        <div className="p-3 text-left"><h3 className="text-xs font-bold leading-tight line-clamp-2 text-white">{video.title}</h3></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 rounded-xl p-2.5 cursor-pointer hover:bg-[#242426] transition-colors">
                        <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 relative"><img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0 text-left"><h3 className="text-sm font-bold text-white truncate">{video.title}</h3></div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

          </div>

        </div>

        <MobileBottomNav />
      </div>
    </main>
  );
}
