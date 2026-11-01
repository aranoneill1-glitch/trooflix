"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Play, Sparkles, Video, Check, Crown, Clock, Users, List, Heart, History, Mic, FolderHeart, Download, ArrowRight } from "lucide-react";
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
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Fetch profile for tier/avatar
        const supabase = createClient();
        const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", u.id).single();
        if (prof) setProfile(prof);

        // Fetch content for the logged-in dashboard
        Promise.all([
          fetch("/api/videos", { cache: "no-store" }).then(r => r.json()),
          fetch("/api/creators", { cache: "no-store" }).then(r => r.json()).catch(() => []),
          fetch(`/api/follows?user_id=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: [] })),
        ]).then(([vData, cData, fData]) => {
          setVideos(Array.isArray(vData) ? vData : []);
          setCreators(Array.isArray(cData) ? cData : []);
          setFollowedCreatorIds(Array.isArray(fData.ids) ? fData.ids : []);
          setProgressList(getAllProgress());
          
          // Count watchlist
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

  // Derived Data
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

  const isPremium = profile?.has_pass || profile?.tier === 'pro' || profile?.tier === 'creator';
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || "Member";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0303] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  // ==========================================
  // LOGGED IN: VIP PREMIUM DASHBOARD
  // ==========================================
  if (user) {
    return (
      <main className="min-h-screen bg-[#0a0303] text-white pb-32 font-sans selection:bg-[#E53945]/30">
        <div className="relative z-[100]"><TopBar onMenu={() => {}} /></div>

        {dashboardLoading ? (
          <div className="flex justify-center py-40">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-5 md:px-12 pt-24 md:pt-28 space-y-10">
            
            {/* A. PERSONAL WELCOME */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 md:p-8 shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E53945]/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-[#D4AF37] p-[2px] bg-[#1c1c1e] shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-black text-[#D4AF37]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] text-white/50 font-bold uppercase mb-1">
                      {isPremium ? "Premium Member" : "Free Member"}
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1">
                      {getGreeting()}, {displayName}.
                    </h1>
                    <p className="text-sm text-white/60">
                      Your Trooflix. Your World.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-3">
                  {isPremium ? (
                    <div className="flex items-center gap-2 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-full px-4 py-2">
                      <Crown size={14} className="text-[#D4AF37]" />
                      <span className="text-xs font-bold text-[#D4AF37] tracking-wide">PREMIUM</span>
                    </div>
                  ) : (
                    <Link href="/upgrade" className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] rounded-full px-4 py-2 transition">
                      <Sparkles size={14} className="text-white" />
                      <span className="text-xs font-bold text-white tracking-wide">UPGRADE TO TROOPASS</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Stat Pills */}
              <div className="relative z-10 flex flex-wrap gap-2 md:gap-3 mt-6">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                  <Clock size={14} className="text-[#E53945]" />
                  <span className="text-xs font-semibold text-white/90">{totalHours}h watched</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                  <Users size={14} className="text-[#E53945]" />
                  <span className="text-xs font-semibold text-white/90">{followedCreatorIds.length} creators</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                  <List size={14} className="text-[#E53945]" />
                  <span className="text-xs font-semibold text-white/90">{watchlistCount} in list</span>
                </div>
              </div>
            </motion.div>

            {/* B. CONTINUE WATCHING */}
            {continueWatching.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Continue Watching</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {continueWatching.map((v) => {
                    const progress = v.progressDuration ? Math.min((v.progressSeconds! / v.progressDuration) * 100, 100) : 0;
                    const remaining = Math.max(0, (v.progressDuration || 0) - (v.progressSeconds || 0));
                    const mins = Math.floor(remaining / 60);
                    return (
                      <div 
                        key={v.id}
                        onClick={() => setPlaying(v)}
                        className="flex-shrink-0 w-[220px] md:w-[280px] group cursor-pointer"
                      >
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-2 border border-white/5 shadow-lg">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                              <Play size={18} fill="black" className="text-black ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div className="h-full bg-[#E53945]" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition">{v.title}</h3>
                        <p className="text-[11px] text-white/40 mt-0.5">{mins} min left</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* C. MADE FOR YOU */}
            <section className="space-y-8">
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Made For You</h2>
                <Sparkles size={18} className="text-[#D4AF37]" />
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
              </div>

              {becauseYouWatched.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-white/60 mb-3 uppercase tracking-wider">Because you watched {topCategory}</h3>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {becauseYouWatched.map((v) => (
                      <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[140px] md:w-[180px] group cursor-pointer">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c1c1e] mb-2">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fromCreatorsYouFollow.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-white/60 mb-3 uppercase tracking-wider">From creators you follow</h3>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                    {fromCreatorsYouFollow.map((v) => (
                      <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[140px] md:w-[180px] group cursor-pointer">
                        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c1c1e] mb-2">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-white/60 mb-3 uppercase tracking-wider">Weekly picks</h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {weeklyPicks.map((v) => (
                    <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[140px] md:w-[180px] group cursor-pointer">
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1c1c1e] mb-2">
                        <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</h4>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* E. YOUR CREATORS */}
            {followedCreators.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Your Creators</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
                </div>
                <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2">
                  {followedCreators.map((c: any) => (
                    <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group w-[80px] md:w-[96px]">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-br from-[#E53945] to-[#D4AF37] group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full border-2 border-[#0a0303] overflow-hidden bg-[#1c1c1e]">
                          {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]}</div>}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-full text-center">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* D. YOUR LIBRARY */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Your Library</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: "Watchlist", icon: List, href: "/my-list", count: watchlistCount },
                  { name: "Favourites", icon: Heart, href: "/my-list?tab=favourites", count: null },
                  { name: "History", icon: History, href: "/my-list?tab=history", count: progressList.length },
                  { name: "Saved Podcasts", icon: Mic, href: "/podcasts", count: null },
                  { name: "Collections", icon: FolderHeart, href: "/collections", count: null },
                  { name: "Downloads", icon: Download, href: "#", count: null, badge: "App only" },
                ].map((tile) => (
                  <Link
                    key={tile.name}
                    href={tile.href}
                    className="relative flex flex-col justify-between p-4 md:p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-xl border border-white/10 transition group overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <tile.icon size={22} className="text-[#E53945]" />
                      {tile.count !== null && tile.count !== undefined && tile.count > 0 && (
                        <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white/70">{tile.count}</span>
                      )}
                      {tile.badge && (
                        <span className="text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full uppercase tracking-wide">{tile.badge}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-white group-hover:text-[#E53945] transition">{tile.name}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* H. YOUR ACTIVITY */}
            <section className="pb-10">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">Your Activity</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
              </div>
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="flex flex-col items-center justify-center p-5 md:p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-center">
                  <span className="text-2xl md:text-3xl font-black text-white">{totalHours}</span>
                  <span className="text-[10px] md:text-xs text-white/50 font-semibold uppercase tracking-wider mt-1">Hours Watched</span>
                </div>
                <div className="flex flex-col items-center justify-center p-5 md:p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-center">
                  <span className="text-2xl md:text-3xl font-black text-white">{videosCompleted}</span>
                  <span className="text-[10px] md:text-xs text-white/50 font-semibold uppercase tracking-wider mt-1">Completed</span>
                </div>
                <div className="flex flex-col items-center justify-center p-5 md:p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 text-center">
                  <span className="text-2xl md:text-3xl font-black text-white">{categoriesExplored}</span>
                  <span className="text-[10px] md:text-xs text-white/50 font-semibold uppercase tracking-wider mt-1">Categories</span>
                </div>
              </div>
            </section>

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

  // ==========================================
  // LOGGED OUT: SALES FUNNEL
  // ==========================================
  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 overflow-x-hidden selection:bg-red-600/30">
      <TopBar />
      
      <div className="relative pt-24 pb-24 px-6 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* SEGMENTED TOGGLE */}
        <div className="relative z-20 flex p-1 bg-[#1c1c1e] rounded-full border border-white/10 mb-16 w-full max-w-sm mx-auto shadow-2xl">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`flex-1 relative py-3 px-6 rounded-full text-sm font-bold transition-colors ${
              activeTab === "viewer" ? "text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {activeTab === "viewer" && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-full shadow-md" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Sparkles size={16} /> Viewer
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("creator")}
            className={`flex-1 relative py-3 px-6 rounded-full text-sm font-bold transition-colors ${
              activeTab === "creator" ? "text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {activeTab === "creator" && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-full shadow-md" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Video size={16} /> Creator
            </span>
          </button>
        </div>

        {/* DYNAMIC CONTENT AREA */}
        <AnimatePresence mode="wait">
          
          {/* VIEWER TAB */}
          {activeTab === "viewer" && (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-r from-red-600/20 to-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

              <h1 className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
                Uncensored. Unfiltered. <br className="hidden md:block"/>
                <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">Unbought.</span>
              </h1>
              
              <h2 className="relative z-10 text-xl md:text-2xl font-bold mb-12 text-white">
                Ad-free. No mainstream pollution. Just raw content.
              </h2>

              <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">Trooflix Plus</h3>
                    <p className="text-white/50 text-sm">For Viewers & Fans</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black">$3.99</span>
                    <span className="text-white/50 text-sm">/mo</span>
                  </div>
                </div>

                <div className="bg-[#E53945]/10 border border-[#E53945]/20 text-[#E53945] text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-6">
                  7-DAY FREE TRIAL
                </div>

                <ul className="space-y-3 mb-8">
                  {["Ad-free video streaming", "Exclusive Plus-only content", "Unlock commenting & community", "Plus badge on your profile"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                      <Check size={16} className="text-[#E53945] shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/signup" className="w-full flex items-center justify-center bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl transition shadow-lg shadow-[#E53945]/20 text-lg">
                  Start Free Trial
                </Link>
              </div>
            </motion.div>
          )}

          {/* CREATOR TAB */}
          {activeTab === "creator" && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-r from-red-600/20 to-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

              <h1 className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
                Stop letting Big Tech <br className="hidden md:block"/>
                <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">eat your lunch.</span>
              </h1>
              
              <p className="relative z-10 text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                Traditional platforms take massive cuts and hide your content behind algorithms. Trooflix was built for creators who are tired of sharing their revenue with billionaires and being censored in the process.
              </p>

              <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-2xl font-bold">Trooflix Creator</h3>
                    <p className="text-white/50 text-sm">For Filmmakers & Podcasters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black">$9.99</span>
                    <span className="text-white/50 text-sm">/mo</span>
                  </div>
                </div>
                
                <p className="text-xs text-[#1ed760] font-semibold mb-6 flex items-center gap-1">
                  <Check size={14} /> Free to start. No credit card required.
                </p>

                <ul className="space-y-3 mb-8">
                  {["Upload unlimited movies & podcasts", "Custom Creator Hub page", "Keep 90% of your subscriber revenue", "We take the first $10 you earn to cover the fee"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                      <Check size={16} className="text-white shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/why-us" className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition shadow-lg text-lg">
                  Become a Creator <ArrowRight size={20} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
