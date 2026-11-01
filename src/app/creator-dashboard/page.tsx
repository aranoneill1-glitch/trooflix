"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Video, CheckCircle2, MessageSquare, Eye, Star, Pencil, 
  ShoppingBag, LayoutDashboard, LayoutGrid, List, Package, Palette, Camera, Trash2, X, Radio, Inbox, Plus, Play, Lock
} from "lucide-react";

import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import HomeFeedCard from "@/components/HomeFeedCard";

const MOCK_SUBSCRIBERS = 142;

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

function CreatorDashboardContent() {
  const searchParams = useSearchParams();
  const isPublicView = searchParams.get('view') === 'public';
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDashboardView, setIsDashboardView] = useState(true);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAddContentMenu, setShowAddContentMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (isPublicView) setIsDashboardView(false);
  }, [isPublicView]);
  
  const [contentView, setContentView] = useState<"grid" | "list">("grid");
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Videos" | "Premium" | "Shop">("All");
  const [creatorVideos, setCreatorVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (u) {
        setUser(u);
        
        const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", u.id).single();
        if (prof) setProfile(prof);
        setLoading(false);

        fetch("/api/videos")
          .then(r => r.json())
          .then(data => {
            const myVideos = Array.isArray(data) ? data.filter((v: any) => 
              String(v.uploaderUserId) === String(u.id)
            ) : [];
            setCreatorVideos(myVideos);
            setVideosLoading(false);
          })
          .catch(() => setVideosLoading(false));

        try {
          const cr = await fetch(`/api/me/creator?user_id=${u.id}`).then(r => r.json());
          const cid = cr.creator?.id;
          const mRes = await fetch("/api/products/global").then(r => r.json());
          if (mRes.products) {
            setMerch(mRes.products.filter((p: any) => String(p.creator_id) === String(cid) || String(p.creator_id) === String(u.id)));
          }
        } catch (e) {}
      } else {
        setLoading(false);
      }
    });
  }, [supabase]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);

    try {
      const r2Res = await fetch('/api/r2-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const r2Data = await r2Res.json();
      if (!r2Res.ok) throw new Error("Failed to get R2 upload URL");

      // Use XMLHttpRequest instead of fetch to fix iOS Safari 0-byte bug
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", r2Data.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(true);
          else reject(new Error(`Failed to upload image. Status: ${xhr.status}`));
        };
        
        xhr.onerror = () => reject(new Error("Network error during image upload."));
        xhr.send(file);
      });

      const { error } = await supabase.from("profiles").update({
        avatar_url: r2Data.publicUrl
      }).eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: r2Data.publicUrl });
      setShowAvatarMenu(false);
      clearUserCache();

    } catch (err) {
      alert("Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase.from("profiles").update({
        avatar_url: null
      }).eq("user_id", user.id);

      if (error) throw error;
      
      setProfile({ ...profile, avatar_url: null });
      setShowAvatarMenu(false);
      clearUserCache();
    } catch (err) {
      alert("Failed to remove avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!user) return <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4"><h1 className="text-2xl font-bold mb-4">Log in to view your profile</h1><Link href="/login" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Log In</Link></main>;

  const displayName = profile?.display_name || "Creator Name";
  const username = profile?.username || "creator";

  const filteredVideos = creatorVideos.filter(v => {
    if (activeContentTab === "Videos") return !v.type?.toLowerCase().includes("podcast");
    return true;
  });

  const bgStyle = profile?.backdrop_url
    ? profile.backdrop_url.startsWith("http")
      ? { backgroundImage: `url(${profile.backdrop_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: profile.backdrop_url }
    : { background: "#09090B" };

  return (
    <main className={`min-h-screen text-white pb-32 font-sans selection:bg-[#E53945]/30 relative overflow-hidden ${!isDashboardView && profile?.backdrop_url ? "bg-transparent" : "bg-[#09090B]"}`}>
      
      {!isDashboardView && (
        <div className="fixed inset-0 z-0" style={bgStyle}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      <div className="relative z-10">
        <TopBar />

        <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
          
          {!isPublicView && (
          <div className="flex items-center justify-center mb-6">
            <div className="flex bg-[#1c1c1e] p-1 rounded-full border border-white/10 shadow-lg">
              <button onClick={() => setIsDashboardView(false)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${!isDashboardView ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"}`}><Eye size={16} /> Profile</button>
              <button onClick={() => setIsDashboardView(true)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${isDashboardView ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"}`}><LayoutDashboard size={16} /> Dashboard</button>
            </div>
          </div>
          )}

          {!isDashboardView && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col mb-6 w-full">
                <div className="flex items-center gap-4 w-full mb-4">
                  
                  {/* CLICKABLE AVATAR */}
                  <div 
                    onClick={() => setShowAvatarMenu(true)}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 shrink-0 cursor-pointer group relative"
                  >
                    <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e] relative">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold">{displayName.charAt(0)}</div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex justify-around md:justify-start md:gap-8 px-2">
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">1.2K</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{MOCK_SUBSCRIBERS}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Subscribers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{creatorVideos.length}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span></div>
                  </div>
                </div>

                <div className="px-1">
                  <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">{displayName} {profile?.is_verified && <VerifiedBadge size={20} variant="gold" />}</h1>
                    
                    <Link href="/creator-dashboard/live" className="shrink-0 flex items-center gap-1.5 bg-[#E53945] text-white font-bold px-5 py-1.5 rounded-full hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20 text-sm">
                      <Radio size={16} /> Go Live
                    </Link>
                  </div>
                  <p className="text-sm md:text-base text-white/50 mb-3">@{username}</p>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><InstagramIcon size={14} /><span className="text-xs font-semibold">{profile?.instagram_handle || "@instagram"}</span></a>
                    <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><XIcon size={14} /><span className="text-xs font-semibold">{profile?.x_handle || "@x"}</span></a>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{profile?.bio || "No bio yet."}</p>
                </div>
              </div>

              <div className="flex gap-3 mb-8 w-full">
                <button className="flex-1 flex items-center justify-center gap-2 bg-[#E53945] text-white font-bold py-3 rounded-full hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20"><Star size={18} fill="currentColor" /> Subscribe</button>
                <Link href="/messages" className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-full transition border border-white/10">
                  <Inbox size={18} /> Inbox
                </Link>
              </div>

              <div className="flex items-center justify-between border-b border-white/10 mb-6">
                <div className="flex items-center gap-8">
                  {(["All", "Videos", "Premium", "Shop"] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveContentTab(tab)} className={`pb-3 text-sm font-bold transition-colors ${activeContentTab === tab ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>{tab}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
                  <button onClick={() => setContentView("grid")} className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><LayoutGrid size={16} /></button>
                  <button onClick={() => setContentView("list")} className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><List size={16} /></button>
                </div>
              </div>

              {activeContentTab === "All" && (
                <div className="w-full">
                  {videosLoading ? (
                    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
                  ) : creatorVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No posts yet.</div>
                  ) : (
                    <div className="flex flex-col gap-6 pb-20">
                      {creatorVideos.map((v) => (
                        <HomeFeedCard 
                          key={v.id} 
                          video={v} 
                          creator={profile} 
                          onMore={() => {}} 
                          onPlay={() => {}} 
                          isActive={false} 
                          onSetActive={() => {}} 
                          onOpenComments={() => {}} 
                          isLiked={false} 
                          onToggleLike={() => {}} 
                          hideCreatorInfo={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Premium" && (
                <div className="w-full">
                  {creatorVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {creatorVideos.map((video) => (
                        <div key={video.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden group cursor-pointer relative shadow-lg">
                          <div className="relative aspect-[3/4] md:aspect-square">
                            <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-md border border-white/10 m-2 rounded-xl">
                              <div className="w-10 h-10 rounded-full bg-[#E53945]/20 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(229,57,69,0.4)]">
                                <Lock size={18} className="text-[#E53945]" />
                              </div>
                              <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">Premium</span>
                            </div>
                          </div>
                          <div className="p-3 text-left">
                            <h3 className="text-sm font-bold leading-tight line-clamp-1 text-white/70">{video.title}</h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Shop" && (
                <div className="w-full">
                  {merch.length === 0 ? (
                    <div className="text-center py-12 bg-[#1c1c1e] border border-white/5 rounded-2xl"><ShoppingBag size={32} className="mx-auto text-white/20 mb-3" /><p className="text-white/50 text-sm">No products available yet.</p></div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {merch.map((item) => (
                        <div key={item.id} className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden flex flex-col">
                          <div className="relative aspect-square"><img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /></div>
                          <div className="p-3 flex-1 flex flex-col justify-between text-left"><h3 className="text-sm font-bold leading-tight line-clamp-2 text-white">{item.name}</h3><p className="text-emerald-400 font-bold text-xs mt-2">${(item.price_cents / 100).toFixed(2)}</p></div>
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

              {activeContentTab === "Videos" && (
                <div className="w-full">
                  {videosLoading ? (
                    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
                  ) : filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No {activeContentTab.toLowerCase()} found yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                          <div className="relative aspect-square">
                            <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>{video.type || "VIDEO"}</div>
                          </div>
                          <div className="p-3 text-left"><h3 className="text-sm font-bold leading-tight line-clamp-1">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-[#242426] transition-colors">
                          <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative"><img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0 text-left"><h3 className="text-sm font-bold text-white truncate">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isDashboardView && (
            <div className="animate-in fade-in duration-300 space-y-8 max-w-4xl mx-auto">
              
              <section>
                <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">
                  Content
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Link href="/creator-dashboard/manage-content" className="bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Video className="text-[#E53945]" size={24} />
                    <span className="text-xs font-bold text-center">Manage Content</span>
                  </Link>
                  <button onClick={() => setShowAddContentMenu(true)} className="bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Plus className="text-[#E53945]" size={24} />
                    <span className="text-xs font-bold text-center">Add Content</span>
                  </button>
                </div>
              </section>

              <section>
                <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">
                  Profile
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Link href="/creator-dashboard/settings" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Pencil className="text-white" size={24} />
                    <span className="text-xs font-bold text-center">Manage Profile</span>
                  </Link>
                  <Link href="/creator-dashboard/theme" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Palette className="text-white" size={24} />
                    <span className="text-xs font-bold text-center">Profile Theme</span>
                  </Link>
                </div>
              </section>

              <section>
                <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">
                  Marketplace
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Link href="/creator-dashboard/shop" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <ShoppingBag className="text-white" size={24} />
                    <span className="text-xs font-bold text-center">Manage Shop</span>
                  </Link>
                  <Link href="/creator-dashboard/orders" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Package className="text-white" size={24} />
                    <span className="text-xs font-bold text-center">Manage Orders</span>
                  </Link>
                </div>
              </section>

              <section>
                <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">
                  Subscriptions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <Link href="/creator-dashboard/subscriptions" className="bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Star className="text-[#E53945]" size={24} />
                    <span className="text-xs font-bold text-center">Manage Subscription</span>
                  </Link>
                </div>
              </section>

            </div>
          )}

        </div>

        {/* ADD CONTENT BOTTOM SHEET */}
        <AnimatePresence>
          {showAddContentMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddContentMenu(false)}
                className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12 lg:max-w-md lg:mx-auto lg:rounded-2xl lg:bottom-10 max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Create New</h3>
                  <button onClick={() => setShowAddContentMenu(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Link 
                    href="/creator-dashboard/upload" 
                    onClick={() => setShowAddContentMenu(false)}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#E53945]/20 flex items-center justify-center flex-shrink-0">
                      <Video className="text-[#E53945]" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Upload Video / Podcast</h4>
                      <p className="text-xs text-white/50">Publish a new piece of long-form content</p>
                    </div>
                  </Link>

                  <Link 
                    href="/creator-dashboard/upload?type=short" 
                    onClick={() => setShowAddContentMenu(false)}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Play className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Upload Short</h4>
                      <p className="text-xs text-white/50">Visible on shorts page and your profile</p>
                    </div>
                  </Link>
                  
                  <Link 
                    href="/creator-dashboard/upload?type=tweet" 
                    onClick={() => setShowAddContentMenu(false)}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="text-green-400" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Add a Tweet</h4>
                      <p className="text-xs text-white/50">Visible on home feed</p>
                    </div>
                  </Link>

                  <Link 
                    href="/creator-dashboard/live"
                    onClick={() => setShowAddContentMenu(false)}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#E53945]/20 flex items-center justify-center flex-shrink-0">
                      <Radio className="text-[#E53945]" size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Go Live</h4>
                      <p className="text-xs text-white/50">Stream a live Q&A with your fans</p>
                    </div>
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAvatarMenu && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                onClick={() => setShowAvatarMenu(false)}
                className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[201] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Profile Photo</h3>
                  <button onClick={() => setShowAvatarMenu(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-xl transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold">Change Image</h4>
                      <p className="text-xs text-white/50">Upload a new profile photo</p>
                    </div>
                  </button>

                  {profile?.avatar_url && (
                    <button 
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-4 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 p-4 rounded-xl transition text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Trash2 size={20} className="text-red-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-500">Remove Photo</h4>
                        <p className="text-xs text-red-500/50">Revert to default avatar</p>
                      </div>
                    </button>
                  )}
                </div>
                
                {uploadingAvatar && (
                  <p className="text-center text-sm text-[#E53945] font-bold mt-4 animate-pulse">Uploading...</p>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <input 
          type="file" 
          ref={avatarInputRef} 
          onChange={handleAvatarUpload} 
          accept="image/*" 
          className="hidden" 
        />

        <MobileBottomNav />
      </div>
    </main>
  );
}

export default function CreatorDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <CreatorDashboardContent />
    </Suspense>
  );
}
