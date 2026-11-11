"use client";
import { ChevronRight , Tag, MoreVertical , Download, Sparkles, Wallet , MessageCircle } from "lucide-react";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Video, CheckCircle2, MessageSquare, Eye, Star, Pencil, 
  ShoppingBag, LayoutDashboard, LayoutGrid, List, Package, Palette, Camera, Trash2, X, Radio, Inbox, Plus, Play, Lock, Shield, CreditCard
} from "lucide-react";

import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import MyTrooFlixContent from "@/components/MyTrooFlixContent";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import HomeFeedCard from "@/components/HomeFeedCard";
import CreatorStudioNav from "@/components/CreatorStudioNav";


const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

function CreatorDashboardContent() {
  const searchParams = useSearchParams();
  const isPublicView = searchParams.get('view') === 'public';
  const studioTab = searchParams.get("studioTab");
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const userTier: "free" | "plus" | "creator" = (() => {
    if (!profile?.tier) return "free";
    // Normalize legacy tier names
    const raw = String(profile.tier).toLowerCase();
    let normalized: "free" | "plus" | "creator";
    if (raw === "creator" || raw === "creator" || raw === "pro") normalized = "creator";
    else if (raw === "plus" || raw === "pass" || raw === "troopass") normalized = "plus";
    else normalized = "free"; // "user", null, unknown → free
    // Apply grace period expiry
    if (normalized !== "free" && profile.plus_expires_at) {
      if (new Date(profile.plus_expires_at) < new Date()) return "free";
    }
    return normalized;
  })();
  const isFreeTier = userTier === "free";
  const [loading, setLoading] = useState(true);
  const [isDashboardView, setIsDashboardView] = useState(false);
  const [showMyTrooFlix, setShowMyTrooFlix] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAddContentMenu, setShowAddContentMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (isPublicView || studioTab === "profile") {
      setIsDashboardView(false);
      setShowMyTrooFlix(false);
    } else if (studioTab === "dashboard") {
      setIsDashboardView(true);
      setShowMyTrooFlix(false);
    } else if (studioTab === "mytrooflix") {
      setIsDashboardView(false);
      setShowMyTrooFlix(true);
    }
  }, [isPublicView, studioTab]);
  
  const [contentView, setContentView] = useState<"grid" | "list">("grid");
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Videos" | "Premium" | "Shop">("All");
  const [creatorVideos, setCreatorVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedMerchItem, setSelectedMerchItem] = useState<any>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (u) {
        setUser(u);
        
        const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", u.id).single();
        if (prof) setProfile(prof);

        const targetCreatorId = prof?.creator_id || u.id;
        const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("creator_id", targetCreatorId);
        const { count: subs } = await supabase.from("creator_subscriptions").select("*", { count: "exact", head: true }).eq("creator_id", targetCreatorId);
        setFollowerCount(followers || 0);
        setSubscriberCount(subs || 0);
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
      let processedBlob: Blob;

      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const MAX = 512;
        let w = bitmap.width;
        let h = bitmap.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * MAX; h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(bitmap, 0, 0, w, h);
        
        processedBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed to export canvas")), "image/jpeg", 0.85);
        });
      } catch (decodeErr) {
        processedBlob = file;
      }

      if (processedBlob.size === 0) {
        throw new Error("Image is 0 bytes. Open Photos, wait for it to download from iCloud, then retry.");
      }

      const r2Res = await fetch("/api/r2-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "avatar.jpg", contentType: "image/jpeg" }),
      });
      const r2Data = await r2Res.json();
      if (!r2Res.ok) throw new Error("Failed to get R2 upload URL");

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", r2Data.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", "image/jpeg");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(true);
          else reject(new Error("Upload failed: " + xhr.status));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(processedBlob);
      });

      const { error } = await supabase.from("profiles").update({
        avatar_url: r2Data.publicUrl
      }).eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: r2Data.publicUrl });
      setShowAvatarMenu(false);
      clearUserCache();

    } catch (err: any) {
      alert(err.message || "Failed to upload avatar.");
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
    const type = (v.type || "").toLowerCase();
    
    if (activeContentTab === "Videos") {
      return type !== "tweet" && type !== "short" && v.visibility !== "premium";
    }
    if (activeContentTab === "Premium") {
      return v.visibility === "premium" && type !== "tweet" && type !== "short";
    }
    return true;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const bgStyle = profile?.backdrop_url
    ? profile.backdrop_url.startsWith("http")
      ? { backgroundImage: `url(${profile.backdrop_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: profile.backdrop_url }
    : { background: "#09090B" };



  
  const startPress = (item: any) => {
    pressTimer.current = setTimeout(() => {
      setSelectedMerchItem(item);
    }, 500);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", id);
    setMerch(prev => prev.filter(p => p.id !== id));
    setSelectedMerchItem(null);
  };

  const saveOrder = async () => {
    setIsReordering(false);
    const supabase = createClient();
    const updates = merch.map((item, index) => ({
      id: item.id,
      sort_order: index,
      name: item.name,
      price_cents: item.price_cents,
      image_url: item.image_url,
      creator_id: item.creator_id
    }));
    await supabase.from("products").upsert(updates);
    alert("Order saved successfully!");
  };

  // iOS anti-callout guard
  const iosGuardStyle = {
    WebkitTouchCallout: "none" as const,
    WebkitUserSelect: "none" as const,
    userSelect: "none" as const,
    WebkitTapHighlightColor: "transparent" as const,
  };

  return (
    <main className={`min-h-screen text-white pb-32 font-sans selection:bg-[#E53945]/30 relative overflow-hidden ${profile?.backdrop_url ? "bg-transparent" : "bg-[#09090B]"}`}>
      
      {profile?.backdrop_url && (
        <div className="fixed inset-0 z-0" style={bgStyle}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        </div>
      )}

      <div className="relative z-10">
        <TopBar />

        <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
          
          <div className="sticky top-[64px] z-[100] mb-5 pt-2 md:top-[72px] md:mb-7">
            <CreatorStudioNav
              active={showMyTrooFlix ? "mytrooflix" : isDashboardView ? "dashboard" : "profile"}
              dashboardLocked={userTier === "free"}
              onViewChange={(section) => {
                if (section === "dashboard" && userTier === "free") {
                  window.location.href = "/upgrade?feature=dashboard";
                  return;
                }
                setIsDashboardView(section === "dashboard");
                setShowMyTrooFlix(section === "mytrooflix");
              }}
            />
          </div>

          {showMyTrooFlix && <MyTrooFlixContent embedded />}

          {!isDashboardView && !showMyTrooFlix && (
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
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(followerCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(subscriberCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Subscribers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{creatorVideos.length}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span></div>
                  </div>
                </div>

                <div className="px-1">
                  <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">{displayName} {profile?.verification_tick && profile.verification_tick !== "none" && <VerifiedBadge size={20} variant={profile.verification_tick as any} />}</h1>
                    
                    
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
                <button onClick={() => setShowAddContentMenu(true)} className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold py-2.5 rounded-full hover:bg-white/20 transition shadow-[0_8px_32px_rgba(0,0,0,0.4)]"><Plus size={16} /> Add Content</button>
                {userTier === "creator" ? (
                  <Link href="/creator-dashboard/live" className="flex-1 flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-[#E53945] text-[#E53945] font-bold py-2.5 rounded-full hover:bg-[#E53945]/10 transition shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <Radio size={16} /> Go Live
                  </Link>
                ) : (
                  <button onClick={() => { window.location.href = "/upgrade?feature=go_live"; }} className="flex-1 flex items-center justify-center gap-2 bg-white/5 backdrop-blur-md border border-white/20 text-white/50 font-bold py-2.5 rounded-full hover:bg-white/10 transition shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <Radio size={16} /> Go Live <Lock size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between border-b border-white/10 mb-6">
                <div className="flex items-center gap-8">
                  {(["All", "Videos", "Premium", "Shop"] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveContentTab(tab)} className={`pb-3 text-sm font-bold transition-colors ${activeContentTab === tab ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>{tab}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-xl p-1 rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-2">
                  <button onClick={() => setContentView("grid")} className={`p-1.5 rounded-full transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><LayoutGrid size={16} /></button>
                  <button onClick={() => setContentView("list")} className={`p-1.5 rounded-full transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><List size={16} /></button>
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
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl overflow-hidden group cursor-pointer relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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
                    <div className="text-center py-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl"><ShoppingBag size={32} className="mx-auto text-white/20 mb-3" /><p className="text-white/50 text-sm">No products available yet.</p></div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {merch.map((item) => (
            <div 
              key={item.id} 
              onPointerDown={() => startPress(item)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onContextMenu={(e) => { e.preventDefault(); setSelectedMerchItem(item); }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden group cursor-pointer flex flex-col relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
            >
              <div className="relative aspect-square pointer-events-none">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <button onClick={(e) => { e.stopPropagation(); setSelectedMerchItem(item); }} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white z-20">
                <MoreVertical size={16} />
              </button>
              <div className="p-3 flex-1 flex flex-col justify-between text-left pointer-events-none">
                <h3 className="text-sm font-bold leading-tight line-clamp-2 text-white">{item.name}</h3>
                <p className="text-emerald-400 font-bold text-xs mt-2">${(item.price_cents / 100).toFixed(2)}</p>
              </div>
            </div>
          ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {merch.map((item) => (
            <div 
              key={item.id} 
              onPointerDown={() => startPress(item)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onContextMenu={(e) => { e.preventDefault(); setSelectedMerchItem(item); }}
              className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
            >
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative pointer-events-none">
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 text-left pointer-events-none">
                <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                <p className="text-xs text-white/50 mt-1">Merch</p>
              </div>
              <p className="text-emerald-400 font-bold text-sm shrink-0 pointer-events-none">${(item.price_cents / 100).toFixed(2)}</p>
              <button onClick={(e) => { e.stopPropagation(); setSelectedMerchItem(item); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white z-20">
                <MoreVertical size={16} />
              </button>
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
                        <div key={video.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden group cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                          <div className="relative aspect-square">
                            <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'long-video' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>{video.type || "VIDEO"}</div>
                          </div>
                          <div className="p-3 text-left"><h3 className="text-sm font-bold leading-tight line-clamp-1">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-white/10 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
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

          {isDashboardView && !showMyTrooFlix && !isFreeTier && (
      <>
        {/* DESKTOP BENTO BOX */}
        <div className="hidden lg:block animate-in fade-in duration-300 max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            
            <Link href="/creator-dashboard/import" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-[#E53945]/50 transition-all duration-300 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E53945]/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[#E53945]/20 transition-colors" />
              <div className="w-12 h-12 rounded-2xl bg-[#E53945]/20 flex items-center justify-center mb-6">
                <Download className="text-[#E53945]" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Import from YouTube</h3>
              <p className="text-sm text-white/50 mb-6">Bring your entire back-catalog to Trooflix seamlessly.</p>
              <div className="flex items-center text-sm font-bold text-[#E53945]">Open Tool <ChevronRight size={16} className="ml-1" /></div>
            </Link>

            <Link href="/creator-dashboard/manage-content" className="col-span-2 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-[#E53945]/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Video className="text-white" size={24} />
                  </div>
                  <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">{creatorVideos.length} Posts</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Manage Content</h3>
                <p className="text-sm text-white/50">Edit, delete, or reorder your videos and long-videos.</p>
              </div>
              <div className="flex items-center text-sm font-bold text-white group-hover:text-[#E53945] transition-colors mt-6">Open Dashboard <ChevronRight size={16} className="ml-1" /></div>
            </Link>

            <button onClick={() => setShowAddContentMenu(true)} className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-green-500/50 transition-all duration-300 text-left relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
                <Plus className="text-green-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Add Content</h3>
              <p className="text-sm text-white/50">Upload a new video, short, or tweet.</p>
            </button>

            <Link href="/creator-dashboard/fix-posters" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-orange-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6">
                <Sparkles className="text-orange-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Auto-Fix Posters</h3>
              <p className="text-sm text-white/50">Grab frames from your videos to use as posters.</p>
            </Link>

            <Link href="/creator-dashboard/settings" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-blue-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Pencil className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Profile</h3>
              <p className="text-sm text-white/50">Update your bio, links, and profile picture.</p>
            </Link>

            <Link href="/creator-dashboard/theme" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-purple-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                <Palette className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Profile Theme</h3>
              <p className="text-sm text-white/50">Customize your page with colors and gradients.</p>
            </Link>

            <Link href="/creator-dashboard/shop" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-yellow-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-6">
                <ShoppingBag className="text-yellow-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Shop</h3>
              <p className="text-sm text-white/50">Add merch, books, and manage your inventory.</p>
            </Link>

            <Link href="/creator-dashboard/orders" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-blue-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Package className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Orders</h3>
              <p className="text-sm text-white/50">Track shipments and update tracking numbers.</p>
            </Link>

            <Link href="/creator-dashboard/subscriptions" className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center mb-6">
                <Star className="text-[#D4AF37]" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Subscriptions</h3>
              <p className="text-sm text-white/50">Manage your premium tiers and pricing.</p>
            </Link>

            <Link href="/creator-dashboard/security-billing" className="col-span-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-white/30 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                  <Shield className="text-white/70" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Security & Billing</h3>
                  <p className="text-sm text-white/50">Update password, manage subscription and payouts.</p>
                </div>
              </div>
              <ChevronRight className="text-white/30 group-hover:text-white transition-colors shrink-0 hidden md:block" />
            </Link>
          </div>
        </div>

        {/* MOBILE OLD LIST */}
        <div className="lg:hidden animate-in fade-in duration-300 space-y-8 max-w-4xl mx-auto">
          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Content</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/import" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Download className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Import from YouTube</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <Link href="/creator-dashboard/manage-content" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Video className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Manage Content</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <Link href="/creator-dashboard/fix-posters" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Sparkles className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Auto-Fix Missing Posters</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <button onClick={() => setShowAddContentMenu(true)} className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full text-left">
                <div className="flex items-center gap-4"><Plus className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Add Content</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Profile</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/settings" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Pencil className="text-white/70" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Manage Profile</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <Link href="/creator-dashboard/theme" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Palette className="text-white/70" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Profile Theme</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Marketplace</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/shop" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><ShoppingBag className="text-white/70" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Manage Shop</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <Link href="/creator-dashboard/orders" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Package className="text-white/70" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Manage Orders</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Subscriptions</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/subscriptions" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Star className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Manage Subscription</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Security & Billing</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/security-billing" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Shield className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Change Password</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <Link href="/creator-dashboard/security-billing" className="bg-white/5 backdrop-blur-xl border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><CreditCard className="text-[#D4AF37]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Billing</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </section>
        </div>
      </>
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
                className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[301] bg-black/40 backdrop-blur-3xl rounded-t-[32px] border-t border-white/20 p-6 pb-28 lg:max-w-md lg:mx-auto lg:rounded-[32px] lg:bottom-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] max-h-[85vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 lg:hidden" />
                
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-white tracking-tight">Create New</h3>
                  <button onClick={() => setShowAddContentMenu(false)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition text-white border border-white/5">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Link 
                    href="/creator-dashboard/upload" 
                    onClick={() => setShowAddContentMenu(false)}
                    className="group relative flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/20 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#E53945]/0 via-[#E53945]/0 to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                      <Video className="text-[#E53945]" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5">Upload Video {userTier !== "creator" && <Lock size={12} className="text-yellow-400" />}</h4>
                      <p className="text-xs text-white/50">Publish a long-form video or long-video</p>
                    </div>
                  </Link>

                  <Link 
                    href="/creator-dashboard/upload?type=short" 
                    onClick={() => setShowAddContentMenu(false)}
                    className="group relative flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <Play className="text-blue-400" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base">Upload Short</h4>
                      <p className="text-xs text-white/50">Publish to the Shorts feed and your profile</p>
                    </div>
                  </Link>
                  
                  <Link 
                    href={userTier === "creator" ? "/creator-dashboard/live" : "/upgrade?feature=go_live"}
                    onClick={() => setShowAddContentMenu(false)}
                    className={`group relative flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E53945]/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden ${userTier !== "creator" ? "opacity-50" : ""}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#E53945]/0 via-[#E53945]/0 to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                      <Radio className="text-[#E53945]" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5">Go Live {userTier !== "creator" && <Lock size={12} className="text-yellow-400" />}</h4>
                      <p className="text-xs text-white/50">Start a live stream with your fans</p>
                    </div>
                  </Link>

                  <Link 
                    href={userTier !== "free" ? "/creator-dashboard/shop" : "/upgrade?feature=add_product"}
                    onClick={() => setShowAddContentMenu(false)}
                    className={`group relative flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden ${userTier === "free" ? "opacity-50" : ""}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <Tag className="text-purple-400" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5">Add an Item {userTier === "free" && <Lock size={12} className="text-yellow-400" />}</h4>
                      <p className="text-xs text-white/50">Add an item to your store</p>
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
                    className="group relative flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left"
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


      {/* LONG PRESS OPTIONS MENU */}
      <AnimatePresence>
        {selectedMerchItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedMerchItem(null)}
              className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12 max-w-md mx-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex flex-col gap-2">
                <button onClick={() => { setSelectedMerchItem(null); window.location.href = "/creator-dashboard/shop"; }} className="w-full py-4 text-center font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition">Edit Product</button>
                <button onClick={() => { setSelectedMerchItem(null); setIsReordering(true); }} className="w-full py-4 text-center font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition">Reorder Grid</button>
                <button onClick={() => handleDelete(selectedMerchItem.id)} className="w-full py-4 text-center font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition border border-red-500/20 mt-2">Delete Product</button>
                <button onClick={() => setSelectedMerchItem(null)} className="w-full py-3 mt-2 text-sm text-white/50 hover:text-white transition">Cancel</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
