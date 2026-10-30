"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2, Play, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs & View state
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Podcasts" | "Videos" | "Store">("All");
  const [contentView, setContentView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    async function loadProfileAndVideos() {
      const supabase = createClient();
      
      // 1. Fetch Profile by Username
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      
      if (error || !profileData) {
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // 2. Fetch Creator ID (Optional, but helps find older videos)
      let creatorId = null;
      try {
        const creatorRes = await fetch(`/api/me/creator?user_id=${profileData.user_id}`);
        const creatorData = await creatorRes.json();
        if (creatorData.creator) {
          creatorId = creatorData.creator.id;
        }
      } catch (err) {}

      // 3. Fetch ALL videos and filter STRICTLY by ID
      try {
        const videosRes = await fetch("/api/videos", { cache: "no-store" });
        const allVideos = await videosRes.json();
        
        if (Array.isArray(allVideos)) {
          const creatorVideos = allVideos.filter((v: any) => 
            String(v.uploaderUserId) === String(profileData.user_id) || 
            String(v.creatorId) === String(creatorId)
          );
          setVideos(creatorVideos);
        }
      } catch (err) {}

      setLoading(false);
    }
    
    if (username) loadProfileAndVideos();
  }, [username]);

  const displayedVideos = useMemo(() => {
    if (activeContentTab === "Podcasts") return videos.filter(v => v.type?.toLowerCase() === "podcast");
    if (activeContentTab === "Videos") return videos.filter(v => v.type?.toLowerCase() !== "podcast");
    if (activeContentTab === "Store") return [];
    return videos;
  }, [videos, activeContentTab]);

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!profile) return <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4"><h1 className="text-2xl font-bold mb-4">User not found</h1><Link href="/" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Go Home</Link></main>;

  const displayName = profile.display_name || "User";

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      
      <div className="max-w-2xl mx-auto px-4 pt-24">
        <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-8 text-sm font-semibold"><ArrowLeft size={16} /> Back</Link>
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 mb-4 shrink-0">
            <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl font-bold">{displayName.charAt(0)}</div>}
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center justify-center gap-2 text-white mb-1">
            {displayName} {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}
          </h1>
          <p className="text-white/50 mb-6">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-white/70 max-w-md mb-8 leading-relaxed">{profile.bio}</p>}
          <div className="flex items-center justify-center gap-12 mb-8 w-full">
            <div className="text-center"><span className="font-bold text-white block text-xl">0</span><span className="text-white/50 text-[11px] uppercase tracking-wider">Following</span></div>
            <div className="text-center"><span className="font-bold text-white block text-xl">0</span><span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span></div>
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
            {displayedVideos.length === 0 ? (
              <div className="text-center py-12 bg-[#1c1c1e] border border-white/5 rounded-2xl"><p className="text-white/50 text-sm">No content published here yet.</p></div>
            ) : contentView === "grid" ? (
              <div className="grid grid-cols-2 gap-3">
                {displayedVideos.map((video) => (
                  <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden group cursor-pointer">
                    <div className="relative aspect-video">
                      <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className={`absolute top-2 left-2 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>{video.type || "VIDEO"}</div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-bold leading-tight line-clamp-2 text-white">{video.title}</h3>
                      <p className="text-[10px] text-white/50 mt-1">{video.duration || "Recently added"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedVideos.map((video) => (
                  <div key={video.id} className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 rounded-xl p-2.5 cursor-pointer hover:bg-[#242426] transition-colors">
                    <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 relative"><img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0"><h3 className="text-sm font-bold text-white truncate">{video.title}</h3><p className="text-[11px] text-white/50 mt-1">{video.duration || "Recently added"}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
