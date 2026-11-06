"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Sparkles, Video, Check, Crown, Clock, Users, List, Heart, Star, History, Mic, FolderHeart, Download, ArrowRight, Package, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCachedUser } from "@/lib/cache";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import { getAllProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  duration: string;
  creatorId?: number | null;
  progressSeconds?: number;
  progressDuration?: number;
  chapters?: any[];
  textOverlays?: any[];
};

export default function PlusPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"viewer" | "creator">("viewer");
  
  // Dashboard State
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<number[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        const supabase = createClient();
        const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", u.id).single();
        if (prof) setProfile(prof);

        Promise.all([
          fetch("/api/videos", { cache: "no-store" }).then(r => r.json()),
          fetch("/api/creators", { cache: "no-store" }).then(r => r.json()).catch(() => []),
          fetch(`/api/follows?user_id=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: [] })),
          fetch(`/api/wishlist?userId=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ items: [] })),
        ]).then(([vData, cData, fData, wData]) => {
          setVideos(Array.isArray(vData) ? vData.filter(v => v.type?.toLowerCase() !== "tweet" && v.type?.toLowerCase() !== "short") : []);
          setCreators(Array.isArray(cData) ? cData : []);
          setFollowedCreatorIds(Array.isArray(fData.ids) ? fData.ids : []);
          setWishlistItems(Array.isArray(wData.items) ? wData.items : []);
          setProgressList(getAllProgress());
          
          try {
            const ml = localStorage.getItem("trooflix:mylist");
            if (ml) {
              const arr = JSON.parse(ml);
              setWatchlistCount(Array.isArray(arr) ? arr.length : 0);
            }
          } catch (e) {}
          
          setDashboardLoading(false);
        }).catch(() => setDashboardLoading(false));
      }
    });
  }, []);

  type VideoWithProgress = Video & { progressSeconds: number; progressDuration: number };

  const continueWatching = useMemo<VideoWithProgress[]>(() => {
    const items: VideoWithProgress[] = [];
    for (const p of progressList) {
      const video = videos.find((v) => v.id === p.id);
      if (!video) continue;
      const seconds = Number(p.seconds) || 0;
      const duration = Number(p.duration) || 0;
      if (seconds > 0 && duration > 0 && seconds / duration < 0.95) {
        items.push({ ...video, progressSeconds: seconds, progressDuration: duration });
      }
    }
    items.sort((a, b) => b.progressSeconds - a.progressSeconds);
    
    // FALLBACK: If no local progress, show recent videos so it's never empty
    if (items.length === 0 && videos.length > 0) {
      return videos.slice(0, 8).map(v => ({ ...v, progressSeconds: 30, progressDuration: 600 })); // Fake 5% progress for visual
    }
    return items.slice(0, 10);
  }, [progressList, videos]);

  const followedCreators = useMemo(() => {
    return creators.filter(c => followedCreatorIds.includes(c.id));
  }, [creators, followedCreatorIds]);

  const topCategory = useMemo(() => {
    if (progressList.length === 0) return "History";
    const catCounts: Record<string, number> = {};
    progressList.forEach(p => {
      const v = videos.find(x => x.id === p.id);
      if (v && v.category) catCounts[v.category] = (catCounts[v.category] || 0) + 1;
    });
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "History";
  }, [progressList, videos]);

  const becauseYouWatched = useMemo(() => {
    return videos.filter(v => v.category === topCategory && !continueWatching.some(cw => cw.id === v.id)).slice(0, 10);
  }, [videos, topCategory, continueWatching]);

  const fromCreatorsYouFollow = useMemo(() => {
    return videos.filter(v => v.creatorId && followedCreatorIds.includes(v.creatorId)).slice(0, 10);
  }, [videos, followedCreatorIds]);

  const weeklyPicks = useMemo(() => {
    return [...videos].sort((a, b) => b.id - a.id).slice(0, 10);
  }, [videos]);

  const totalHours = useMemo(() => {
    const secs = progressList.reduce((acc, p) => acc + (p.seconds || 0), 0);
    return (secs / 3600).toFixed(1);
  }, [progressList]);

  const videosCompleted = useMemo(() => {
    return progressList.filter(p => p.seconds && p.duration && p.seconds / p.duration > 0.95).length;
  }, [progressList]);

  const categoriesExplored = useMemo(() => {
    const cats = new Set<string>();
    progressList.forEach(p => {
      const v = videos.find(x => x.id === p.id);
      if (v && v.category) cats.add(v.category);
    });
    return cats.size;
  }, [progressList, videos]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  };

  const isCreator = profile?.tier === "creator" || profile?.tier === "podcaster" || profile?.tier === "pro";
  const isTrooPass = profile?.has_pass === true;
  const memberStatusLabel = isCreator ? "Creator" : "TrooPass Member";
  const badgeLabel = isCreator ? "CREATOR ACCESS" : "VIP ACCESS";
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "Member";
  
  // Cinematic Hero Poster (Most recent watch, or newest video)
  const heroBackdrop = continueWatching[0]?.backdropUrl || videos[0]?.backdropUrl || "";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0303] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  // ==========================================
  // LOGGED IN: CINEMATIC VIP DASHBOARD
  // ==========================================
  if (user) {
    return (
      <main className="min-h-screen bg-[#0a0303] text-white pb-32 font-sans selection:bg-[#E53945]/30">
        <div className="relative z-[100]"><TopBar /></div>

        {dashboardLoading ? (
          <div className="flex justify-center py-40">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full">
            
            {/* A. CINEMATIC WELCOME HERO (No Boxes) */}
            <div className="relative w-full h-[40vh] min-h-[320px] flex items-center pt-16 pb-8">


              {/* Content */}
              <div className="relative z-10 w-full max-w-7xl mx-auto px-5 md:px-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border border-white/20 p-1 bg-black/50 backdrop-blur-md shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center text-2xl md:text-4xl font-black text-white">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] md:text-xs tracking-[0.3em] text-[#E53945] font-bold uppercase mb-1 md:mb-2 drop-shadow-md">
                      {memberStatusLabel}
                    </p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-1 md:mb-2 drop-shadow-lg">
                      {getGreeting()}, {displayName}.
                    </h1>
                    <p className="text-sm md:text-lg text-white/70 font-medium drop-shadow-md">
                      Your Trooflix. Your World.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {true ? (
                    <div className="flex items-center gap-2 bg-[#D4AF37]/20 backdrop-blur-md border border-[#D4AF37]/50 rounded-full px-4 py-2 shadow-lg">
                      <Crown size={14} className="text-[#D4AF37]" />
                      <span className="text-xs font-bold text-[#D4AF37] tracking-wide drop-shadow-sm">{badgeLabel}</span>
                    </div>
                  ) : (
                    <Link href="/upgrade" className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] rounded-full px-5 py-2.5 transition shadow-xl">
                      <Sparkles size={14} className="text-white" />
                      <span className="text-xs font-bold text-white tracking-wide">UPGRADE</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* STATS TICKER (Text only, no boxes) */}
            <div className="relative z-20 w-full max-w-7xl mx-auto px-5 md:px-12 mt-2 mb-8 flex flex-wrap items-center gap-4 md:gap-8 text-xs md:text-sm font-semibold text-white/50 tracking-wider">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#E53945]" /> {totalHours} HRS WATCHED
              </div>
              <span className="hidden md:inline text-white/20">|</span>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#E53945]" /> {followedCreatorIds.length} CREATORS
              </div>
              <span className="hidden md:inline text-white/20">|</span>
              <div className="flex items-center gap-2">
                <List size={14} className="text-[#E53945]" /> {watchlistCount} IN LIST
              </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-10">
              
              {/* B. CONTINUE WATCHING (Edge-to-edge, no boxes) */}
              {continueWatching.length > 0 && (
                <section>
                  <div className="flex items-center justify-between px-5 md:px-12 mb-4">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Continue Watching</h2>
                    <Link href="/my-list" className="text-xs font-bold text-white/50 hover:text-white transition flex items-center gap-1">See All <ChevronRight size={14} /></Link>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-4">
                    {continueWatching.map((v) => {
                      const progress = v.progressDuration ? Math.min((v.progressSeconds! / v.progressDuration) * 100, 100) : 0;
                      const remaining = Math.max(0, (v.progressDuration || 0) - (v.progressSeconds || 0));
                      const mins = Math.floor(remaining / 60);
                      return (
                        <div 
                          key={v.id}
                          onClick={() => setPlaying(v)}
                          className="flex-shrink-0 w-[240px] md:w-[320px] group cursor-pointer"
                        >
                          <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-3 shadow-2xl">
                            <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            
                            {/* Play Icon on hover */}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                                <Play size={20} fill="white" className="text-white ml-1" />
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                              <div className="h-full bg-[#E53945]" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                          <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition">{v.title}</h3>
                          <p className="text-[11px] text-white/40 mt-1 font-medium">{mins} min left</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* C. MADE FOR YOU (No boxes) */}
              <section className="space-y-10">
                <div className="px-5 md:px-12">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                    Made For You <Sparkles size={18} className="text-[#D4AF37]" />
                  </h2>
                </div>

                {becauseYouWatched.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-white/50 mb-3 uppercase tracking-wider px-5 md:px-12">Because you watched {topCategory}</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-4">
                      {becauseYouWatched.map((v) => (
                        <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[150px] md:w-[200px] group cursor-pointer">
                          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c1c1e] mb-3 shadow-xl">
                            <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fromCreatorsYouFollow.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-white/50 mb-3 uppercase tracking-wider px-5 md:px-12">From creators you follow</h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-4">
                      {fromCreatorsYouFollow.map((v) => (
                        <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[150px] md:w-[200px] group cursor-pointer">
                          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c1c1e] mb-3 shadow-xl">
                            <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-white/50 mb-3 uppercase tracking-wider px-5 md:px-12">Weekly picks</h3>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-4">
                    {weeklyPicks.map((v) => (
                      <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[150px] md:w-[200px] group cursor-pointer">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c1c1e] mb-3 shadow-xl">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* E. YOUR CREATORS */}
              {followedCreators.length > 0 && (
                <section>
                  <div className="px-5 md:px-12 mb-4">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Your Creators</h2>
                  </div>
                  <div className="flex gap-6 overflow-x-auto scrollbar-hide px-5 md:px-12 pb-4">
                    {followedCreators.map((c: any) => (
                      <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-3 flex-shrink-0 group w-[80px] md:w-[100px]">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-br from-[#E53945] to-[#D4AF37] group-hover:scale-105 transition-transform shadow-lg">
                          <div className="w-full h-full rounded-full border-2 border-[#0a0303] overflow-hidden bg-[#1c1c1e]">
                            {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]}</div>}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-white/70 group-hover:text-white transition truncate w-full text-center">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* D. YOUR LIBRARY (Minimal Text Menu, no boxes) */}
              <section className="px-5 md:px-12">
                <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6">Your Library</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
                  {[
                    { name: "Watchlist", icon: List, href: "/my-list", count: watchlistCount },
                    { name: "Favourites", icon: Heart, href: "/my-list?tab=favourites", count: null },
                    { name: "History", icon: History, href: "/my-list?tab=history", count: progressList.length },
                    { name: "Saved Podcasts", icon: Mic, href: "/podcasts", count: null },
                    { name: "Collections", icon: FolderHeart, href: "/collections", count: null },
                    { name: "Downloads", icon: Download, href: "#", count: null, badge: "App" },
                  ].map((tile) => (
                    <Link
                      key={tile.name}
                      href={tile.href}
                      className="flex items-center justify-between py-4 border-b border-white/5 hover:border-white/20 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <tile.icon size={18} className="text-white/40 group-hover:text-[#E53945] transition-colors" />
                        <span className="text-sm font-bold text-white/80 group-hover:text-white transition">{tile.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tile.count !== null && tile.count !== undefined && tile.count > 0 && (
                          <span className="text-[10px] font-bold text-white/40">{tile.count}</span>
                        )}
                        {tile.badge && (
                          <span className="text-[9px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded uppercase">{tile.badge}</span>
                        )}
                        <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 transition" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* SHOP ORDERS + WISHLIST (in Your Library area) */}
              {myOrders.length > 0 && (
                <section className="px-5 md:px-12 mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                      Shop Orders <Package size={20} className="text-[#E53945]" />
                    </h2>
                    <Link href="/orders" className="text-xs font-bold text-white/50 hover:text-white transition flex items-center gap-1">See All <ChevronRight size={14} /></Link>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                    {myOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="flex flex-col w-[160px] md:w-[220px] shrink-0 bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                        <div className="relative aspect-square w-full bg-black/50">
                          <img src={order.product?.image_url} alt={order.product?.name} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2">
                            <span className={"px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider " + (order.status === "shipped" ? "bg-green-500/90 text-white" : "bg-yellow-500/90 text-black")}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] text-white/40 font-mono mb-1">{order.order_code}</p>
                          <p className="text-sm font-bold text-white truncate">{order.product?.name}</p>
                          <p className="text-xs text-[#1DB954] font-bold mb-2">{"$" + (order.amount_cents / 100).toFixed(2)}</p>
                          {order.status === "shipped" && order.tracking_number && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-[10px] text-white/50">Tracking:</p>
                              <p className="text-[10px] font-mono text-white/80 truncate">{order.shipping_carrier} - {order.tracking_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {wishlistItems.length > 0 && (
                <section className="px-5 md:px-12 mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                      Shop Wishlist <Heart size={20} className="text-[#E53945]" />
                    </h2>
                    <Link href="/merchandise" className="text-xs font-bold text-white/50 hover:text-white transition flex items-center gap-1">Shop More <ChevronRight size={14} /></Link>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                    {wishlistItems.map((p) => (
                      <Link key={p.id} href="/merchandise" className="flex flex-col w-[140px] md:w-[180px] shrink-0 group">
                        <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-2 border border-white/5 bg-[#1c1c1e]">
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded-full shadow-md">
                            <Star size={12} fill="currentColor" />
                          </div>
                        </div>
                        <p className="text-[#1DB954] font-black text-sm md:text-base tracking-tight leading-none mb-1">{"$" + (p.price_cents / 100).toFixed(2)}</p>
                        <h3 className="text-[11px] md:text-sm font-semibold text-white/90 line-clamp-2 leading-tight">{p.name}</h3>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* H. YOUR ACTIVITY */}
              <section className="px-5 md:px-12 pb-10">
                <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6">Your Activity</h2>
                <div className="flex flex-wrap gap-8 md:gap-16">
                  <div>
                    <p className="text-3xl md:text-5xl font-black text-white">{totalHours}</p>
                    <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Hours Watched</p>
                  </div>
                  <div>
                    <p className="text-3xl md:text-5xl font-black text-white">{videosCompleted}</p>
                    <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Completed</p>
                  </div>
                  <div>
                    <p className="text-3xl md:text-5xl font-black text-white">{categoriesExplored}</p>
                    <p className="text-[10px] md:text-xs text-white/40 font-bold uppercase tracking-widest mt-1">Categories</p>
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}

        {/* Inline Video Player */}
        {playing && (
          <AppleVideoPlayer
            src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
            title={playing.title}
            poster={playing.posterUrl}
            textOverlays={playing.textOverlays}
            chapters={playing.chapters || []}
            onClose={() => setPlaying(null)}
          />
        )}

        <MobileBottomNav />
      </main>
    );
  }

  // If not logged in, the useEffect above redirects instantly.
  return null;
}
