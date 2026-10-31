"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2, LayoutGrid, List, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
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
  const subscriptionPrice = profile.subscription_price_cents ? (profile.subscription_price_cents / 100).toFixed(2) : "3.99";

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
        
        <div className="max-w-3xl mx-auto px-4 pt-24 pb-10">
          <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition mb-8 text-sm font-semibold">
            <ArrowLeft size={16} /> Back
          </Link>

          {/* HEADER: AVATAR LEFT, INFO RIGHT */}
          <div className="flex flex-row items-start gap-4 md:gap-6 mb-6">
            
            {/* CLICKABLE AVATAR FOR LIVE */}
            <div 
              onClick={() => profile.is_live && router.push(`/live/${profile.username}`)}
              className={`relative shrink-0 rounded-full p-[3px] ${profile.is_live ? 'cursor-pointer bg-red-600 animate-pulse' : 'bg-gradient-to-tr from-[#E53945] to-orange-500'}`}
            >
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-bold">{displayName.charAt(0)}</div>}
              </div>
              {profile.is_live && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm shadow-lg whitespace-nowrap">
                  Watch Live
                </div>
              )}
            </div>

            {/* INFO SECTION */}
            <div className="flex-1 flex flex-col items-start pt-1 md:pt-2">
              <div className="w-full flex items-center justify-between gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white truncate">
                  {displayName} {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760] shrink-0" fill="currentColor" />}
                </h1>
                
                <button className="shrink-0 flex items-center justify-center gap-1.5 bg-white text-black font-bold px-4 py-1.5 rounded-full hover:bg-gray-200 transition shadow-lg text-xs md:text-sm">
                  <UserPlus size={14} /> Follow
                </button>
              </div>
              
              <p className="text-sm text-white/50 mb-3">@{profile.username}</p>

              {/* SOCIAL HANDLES */}
              <div className="flex items-center gap-4 mb-3">
                {profile.instagram_handle && (
                  <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                    <InstagramIcon size={14} />
                    <span className="text-xs font-semibold">{profile.instagram_handle}</span>
                  </a>
                )}
                {profile.x_handle && (
                  <a href={`https://x.com/${profile.x_handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                    <XIcon size={14} />
                    <span className="text-xs font-semibold">{profile.x_handle}</span>
                  </a>
                )}
              </div>

              {profile.bio && <p className="text-sm text-white/70 leading-relaxed max-w-md mb-4">{profile.bio}</p>}
              
              <div className="flex items-center gap-6 mt-1">
                <div className="text-left"><span className="font-bold text-white block text-lg">0</span><span className="text-white/50 text-[10px] uppercase tracking-wider">Following</span></div>
                <div className="text-left"><span className="font-bold text-white block text-lg">0</span><span className="text-white/50 tracking-wider uppercase text-[10px]">Followers</span></div>
                <div className="text-left"><span className="font-bold text-white block text-lg">{videos.length}</span><span className="text-white/50 text-[10px] uppercase tracking-wider">Posts</span></div>
              </div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 w-full mb-10">
            <button className="flex-1 flex items-center justify-center gap-2 bg-[#E53945] text-white font-bold py-3 rounded-xl hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20 text-sm">
              <Star size={18} fill="currentColor" /> Subscribe - ${subscriptionPrice}
            </button>
            <Link href={`/messages/${profile.user_id}`} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10 text-sm">
              <MessageSquare size={18} /> Message
            </Link>
          </div>

          {/* TABS */}
          <div className="flex items-center justify-between border-b border-white/10 mb-6">
            <div className="flex items-center gap-6 md:gap-8">
              {(["All", "Podcasts", "Videos", "Store"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveContentTab(tab)} className={`pb-3 text-sm font-bold transition-colors ${activeContentTab === tab ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>{tab}</button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
              <button onClick={() => setContentView("grid")} className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setContentView("list")} className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><List size={16} /></button>
            </div>
          </div>

          {/* CONTENT GRID */}
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

        <MobileBottomNav />
      </div>
    </main>
  );
}
