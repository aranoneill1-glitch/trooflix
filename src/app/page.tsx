"use client";

if (typeof window !== "undefined") {
  window.onerror = function(msg, url, line, col, err) {
    console.error("Global Error:", msg, url, line, col, err);
    return false;
  };
  window.addEventListener("unhandledrejection", function(e) {
    const reason = e.reason;
    // Ignore standard AbortErrors from video players and React lifecycle
    if (reason && (reason.name === "AbortError" || String(reason).includes("AbortError") || String(reason).includes("aborted"))) {
      e.preventDefault();
      return;
    }
    console.error("Unhandled Promise Rejection:", reason);
  });
}

import HomeFeedCard from "@/components/HomeFeedCard";
import Link from "next/link";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play, Info, ChevronLeft, ChevronRight, X,
  Search, Bell, HomeIcon, Menu,
  Compass, LogOut, LogIn, Users, ShoppingBag, Sparkles, BookOpen, Flame, List,
  CheckCircle2, Pause, VolumeX, Volume2, MoreVertical, Plus, Maximize,
  ThumbsUp, MessageCircle, Share2, Bookmark
} from "lucide-react";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import PullToRefresh from "@/components/PullToRefresh";
import UserMenu from "@/components/UserMenu";
import { useSearch } from "@/context/SearchContext";
import TopBar from "@/components/TopBar";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import MerchRow from "@/components/MerchRow";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import SearchResults from "@/components/SearchResults";
import MobileBottomNav from "@/components/MobileBottomNav";
import TextOverlayRenderer from "@/components/TextOverlay";
import CommentSheet from "@/components/CommentSheet";
import { getAllProgress } from "@/lib/progress";
import { getCachedCreators, getCachedUser } from "@/lib/cache";

type Chapter = { title: string; time: number };

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  duration: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  textOverlays?: any[];
  progressSeconds?: number;
  progressDuration?: number;
  chapters?: Chapter[];
  visibility?: string;
  feed_visible?: boolean;
};

const CATEGORIES: string[] = [
  "History", "Politics & Geopolitics", "War & Conflict", "True Crime & Justice", 
  "Conspiracy & Unsolved", "Society & Culture", "Business & Finance", 
  "Science & Technology", "Environment & Nature", "Religion & Spirituality", 
  "Comedy & Satire", "News & Current Events",
];

const NAV_TABS: string[] = ["Home", "Podcasts", "Feed"];

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [merchandise, setMerchandise] = useState<any[]>([]);
  const [books, setBooks] = useState<Video[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [creators, setCreators] = useState<any[]>([]);
  const { search } = useSearch();
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("Home");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    setDrawerOpen(false);
    router.push("/");
    router.refresh();
  };

  const [searchOpen, setSearchOpen] = useState(false);
  const [commentSheetVideoId, setCommentSheetVideoId] = useState<number | null>(null);
  const [likedVideos, setLikedVideos] = useState<Record<number, boolean>>({});
  const [scrolled, setScrolled] = useState(false);
  const [isTV, setIsTV] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const chromeMatch = ua.match(/Chrome\/(\d+)/);
    const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 999;
    const isOldChrome = chromeVersion <= 100;
    const isTVUA = /AFT|Silk|Android TV|BRAVIA|HbbTV|SmartTV|Tizen|Web0S|FireTV/i.test(ua);
    setIsTV(isTVUA || isOldChrome || window.location.search.includes("tv=1"));
  }, []);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("trooflix:visited");
      const isUnique = !seen;
      if (isUnique) localStorage.setItem("trooflix:visited", "1");
      fetch("/api/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUnique }),
      }).catch(() => {});
    } catch (_) {}
  }, []);

  const [loaded, setLoaded] = useState(false);
  const [progressList, setProgressList] = useState<any[]>([]);

  useEffect(() => {
    getCachedCreators().then(setCreators).catch(() => {});
    
    // Fetch all users for the search dropdown
    const supabase = createClient();
    supabase.from("profiles").select("user_id, display_name, username, avatar_url, is_verified, tier").then(({ data }) => {
      if (data) setAllUsers(data);
    });
    getCachedUser().then(setUser);
    
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setVideos(all);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    fetch("/api/products/global", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const _products = data.products || [];
        if (Array.isArray(_products)) setMerchandise(_products);
      }).catch(() => {});

    fetch("/api/books", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBooks(data.map((b: any) => ({
            id: b.id, title: b.title, description: b.description || "", category: "Books", type: "Book",
            featured: false, posterUrl: b.cover_url || "", backdropUrl: b.cover_url || "",
            year: new Date().getFullYear(), rating: "NR", match: 100, duration: "",
          })));
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    setProgressList(getAllProgress());
    const onProg = () => setProgressList(getAllProgress());
    window.addEventListener("progress-changed", onProg);
    return () => window.removeEventListener("progress-changed", onProg);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroPool = videos.filter((v) => {
    const t = v.type?.toLowerCase();
    // Only include public, feed-visible long-form videos (exclude shorts, tweets, and premium)
    return t !== "short" && t !== "tweet" && v.visibility !== "premium" && v.feed_visible !== false;
  });
  const [heroIndex, setHeroIndex] = useState(0);

  const isDocOrPodcast = (v: Video) => !v.uploaderUserId && (v.type === "Documentary" || v.type === "Podcast");

  const newReleases = videos.filter(isDocOrPodcast).sort((a, b) => b.id - a.id).slice(0, 20);
  const trending = videos.filter(isDocOrPodcast).sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0)).slice(0, 20);
  const latestDocs = videos.filter((v) => v.type === "Documentary").sort((a, b) => b.id - a.id).slice(0, 20);
  const latestPodcasts = videos.filter((v) => v.type === "Podcast").sort((a, b) => b.id - a.id).slice(0, 20);

  const continueWatching = progressList
    .map(p => {
      const video = videos.find(v => v.id === p.id);
      return video ? { ...video, progressSeconds: p.seconds, progressDuration: p.duration } : null;
    })
    .filter(Boolean).slice(0, 10) as Video[];

  let displayVideos = videos;
  if (activeCategory) displayVideos = videos.filter((v) => v.category === activeCategory);
  else if (activeTab === "Movies") displayVideos = videos.filter((v) => v.type === "Movie");
  else if (activeTab === "Documentaries") displayVideos = videos.filter((v) => v.type === "Documentary");
  else if (activeTab === "Podcasts") displayVideos = videos.filter((v) => v.type === "Podcast");
  else if (activeTab === "Series") displayVideos = videos.filter((v) => v.type === "Series");

  const filtered = search ? videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase())) : null;

  useEffect(() => {
    if (heroPool.length <= 1) {
      setHeroIndex(0);
      return;
    }
    const interval = setInterval(() => setHeroIndex((prev) => (prev + 1) % heroPool.length), 7000);
    return () => clearInterval(interval);
  }, [heroPool.length]);

  const hero = heroPool[heroIndex] || videos[0];
  const showingFiltered = activeCategory || activeTab !== "Home" || filtered;

  const handleCardSelect = (item: Video) => {
    if (item.type === "Merchandise") router.push("/merchandise");
    else if (item.type === "Book") router.push("/books");
    else setSelected(item);
  };

  const handleInstantPlay = (video: Video) => {
    setSelected(null); 
    setPlaying(video);
  };

  return (
    <>
    <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
    <main className="min-h-screen bg-[#0a0303] text-white overflow-x-hidden pb-20 lg:pb-0 relative">
      {/* Subtle ambient background gradient */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.05] via-transparent to-transparent pointer-events-none z-0" />
      
      <div className="relative z-[100]"><TopBar /></div>
      
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[290]" onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-screen w-[300px] bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 z-[300] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                <span className="text-2xl font-black tracking-tight"><span className="text-white">TROO</span><span className="text-red-600">FLIX</span></span>
                <button onClick={() => setDrawerOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 overscroll-contain">
                <div className="space-y-1">
                  <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white font-bold"><HomeIcon size={20} className="text-white/50" /> Home</Link>
                  <Link href="/creators" onClick={() => setDrawerOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/70 hover:text-white font-medium"><Users size={20} className="text-white/50" /> Creators</Link>
                  <Link href="/feed" onClick={() => setDrawerOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/70 hover:text-white font-medium"><Play size={20} className="text-white/50" /> Feed</Link>
                </div>
                <div className="h-px bg-white/5 mx-2" />
                <div className="space-y-1">
                  <details className="group">
                    <summary className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer list-none text-white/70 hover:text-white font-medium">
                      <div className="flex items-center gap-4"><Compass size={20} className="text-white/50" /> Categories</div>
                      <ChevronRight size={16} className="text-white/40 group-open:rotate-90 transition-transform duration-200" />
                    </summary>
                    <div className="mt-1 space-y-1 pl-12 pr-4">
                      {CATEGORIES.map((cat: string) => (
                        <button key={cat} onClick={() => { setActiveCategory(cat === activeCategory ? null : cat); setActiveTab("Home"); setDrawerOpen(false); }} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeCategory === cat ? "text-red-500 bg-red-500/10 font-semibold" : "text-white/50 hover:text-white hover:bg-white/5"}`}>{cat}</button>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="h-px bg-white/5 mx-2" />
                <div className="space-y-1">
                  <Link href="/books" onClick={() => setDrawerOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/70 hover:text-white font-medium"><BookOpen size={20} className="text-white/50" /> Book Store</Link>
                  <Link href="/merchandise" onClick={() => setDrawerOpen(false)} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/70 hover:text-white font-medium"><ShoppingBag size={20} className="text-white/50" /> Creator Merchandise</Link>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 shrink-0 space-y-3 bg-black/40">
                {user ? (
                  <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition font-bold shadow-lg shadow-red-600/20"><LogOut size={18} /> Log Out</button>
                ) : (
                  <Link href="/login" onClick={() => setDrawerOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition font-bold shadow-lg shadow-red-600/20"><LogIn size={18} /> Log In</Link>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {loaded && (
        <>
          {!showingFiltered && (
            <>
              {/* MOBILE SECTION: Pills + Header + Avatars + Hero */}
              <div className="lg:hidden w-full flex flex-col relative z-10 bg-[#0a0303]">
                {/* Ambient glow for glass refraction */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#E53945]/20 rounded-full blur-[100px] pointer-events-none z-0" />
                
                <div className="absolute top-0 left-0 w-full h-[300px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E53945]/15 via-[#0a0303]/0 to-transparent pointer-events-none z-0" />
                {/* Interactive Search Bar */}
                <div className="px-4 pt-20 pb-3 relative z-[100] w-full animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="relative w-full max-w-2xl mx-auto">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (searchQuery.trim()) {
                          setShowSearchDropdown(false);
                          router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                        }
                      }}
                      className="relative w-full"
                    >
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchDropdown(e.target.value.trim().length > 0);
                        }}
                        onFocus={() => {
                          if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                        placeholder="Search videos, creators, podcasts..."
                        className="w-full bg-white/[0.04] border border-white/10 rounded-full py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#E53945]/50 focus:bg-white/[0.08] transition-all backdrop-blur-xl shadow-lg"
                      />
                      {searchQuery && (
                        <button type="button" onClick={() => { setSearchQuery(""); setShowSearchDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-white/10 rounded-full hover:bg-white/20 transition">
                          <X size={14} />
                        </button>
                      )}
                    </form>

                    {/* GLASS DROPDOWN */}
                    {showSearchDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0303]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-[100] animate-in fade-in slide-in-from-top-2">
                        
                        {/* MATCHING CREATORS */}
                        {allUsers.filter(c => 
                          (c.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                          (c.username?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                        ).length > 0 && (
                          <div className="p-2 border-b border-white/5">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 py-1">Creators</p>
                            {allUsers.filter(c => 
                              (c.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                              (c.username?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                            ).slice(0, 3).map(c => (
                              <Link key={c.user_id} href={`/profile/${c.username}`} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl transition">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/10">
                                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{c.display_name?.[0] || "?"}</div>}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-bold text-white truncate">{c.display_name}</span>
                                  <span className="text-[11px] text-white/50 truncate">@{c.username}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* MATCHING VIDEOS */}
                        {videos.filter(v => (v.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())).length > 0 && (
                          <div className="p-2 border-b border-white/5">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 py-1">Videos</p>
                            {videos.filter(v => (v.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())).slice(0, 3).map(v => (
                              <Link key={v.id} href={`/watch/${v.id}`} className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl transition">
                                <div className="w-12 h-8 rounded overflow-hidden bg-[#1c1c1e] shrink-0 border border-white/10">
                                  <img src={v.posterUrl || v.backdropUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-bold text-white truncate">{v.title}</span>
                                  <span className="text-[11px] text-white/50 truncate">{v.type} • {v.category}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* NO RESULTS */}
                        {allUsers.filter(c => (c.display_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (c.username?.toLowerCase() || "").includes(searchQuery.toLowerCase())).length === 0 &&
                         videos.filter(v => (v.title?.toLowerCase() || "").includes(searchQuery.toLowerCase())).length === 0 && (
                          <div className="p-6 text-center text-sm text-white/50">
                            No quick results found for "{searchQuery}".
                          </div>
                        )}

                        {/* PRESS ENTER */}
                        <button 
                          onClick={() => {
                            if (searchQuery.trim()) {
                              setShowSearchDropdown(false);
                              router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                            }
                          }}
                          className="w-full p-3 bg-white/5 hover:bg-white/10 text-[#E53945] text-xs font-bold transition flex items-center justify-center gap-2"
                        >
                          Press Enter to see all results for "{searchQuery}"
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Header */}
                <div className="px-4 pb-2 relative z-30">
                  <p className="text-[10px] tracking-[0.4em] text-white/50 font-semibold mb-1 uppercase">
                    The Home of Independent Voices
                  </p>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      Discover <span className="text-[#E53945]">Creators</span>
                    </h2>
                    <Link href="/creators" className="text-xs font-bold text-white/50 hover:text-white transition flex items-center gap-1">
                      View All <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
                
                {/* Avatars with Follow (Moved up) */}
                {creators && creators.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 pb-4 relative z-10 mt-2 mb-3">
                    {[...creators].slice(0, 15).map((c: any) => (
                      <Link key={c.id} href={`/profile/${c.slug}`} className="flex flex-col items-center text-center flex-shrink-0 group w-[96px]">
                        <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-b from-white/40 to-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform mb-2 relative">
                          <div className="w-full h-full rounded-full border-2 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                            {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]?.toUpperCase() || "?"}</div>}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-full mb-2">{c.name || "Creator"}</span>
                        <button 
                          onClick={(e) => e.preventDefault()}
                          className="px-4 py-1 rounded-full border border-white/20 text-[10px] font-bold hover:bg-white hover:text-black transition"
                        >
                          Follow
                        </button>
                      </Link>
                    ))}
                  </div>
                )}

                {/* App Reel Hero (Moved below Avatars) */}
                {heroPool.length > 0 && (
                  <AppReelHero 
                    videos={heroPool} 
                    activeIndex={heroIndex} 
                    setActiveIndex={setHeroIndex} 
                    onPlay={handleInstantPlay}
                    onMore={(v) => setSelected(v)}
                  />
                )}

              </div>

              {/* DESKTOP SECTION: Hero + Avatars */}
              <div className="hidden lg:block w-full">
                {/* Hero */}
                {heroPool.length > 0 && (
                  <DesktopHero 
                    videos={heroPool}
                    activeIndex={heroIndex}
                    onPlay={handleInstantPlay}
                    onMore={(v) => setSelected(v)}
                  />
                )}
                
                {/* Header */}
                <div className="max-w-[1600px] mx-auto px-12 pt-10 pb-4">
                  <p className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-semibold mb-1 uppercase">
                    The Home of Independent Voices
                  </p>
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white">
                    Discover <span className="text-[#E53945]">Creators</span>
                  </h2>
                </div>
                
                {/* Avatars with Follow */}
                {creators && creators.length > 0 && (
                  <div className="max-w-[1600px] mx-auto px-12 pb-6 grid grid-cols-6 xl:grid-cols-8 gap-4">
                    {[...creators].slice(0, 8).map((c: any) => (
                      <Link key={c.id} href={`/profile/${c.slug}`} className="flex flex-col items-center text-center group cursor-pointer">
                        <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-b from-white/40 to-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform mb-3 relative">
                          <div className="w-full h-full rounded-full border-2 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                            {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]?.toUpperCase() || "?"}</div>}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white group-hover:text-[#E53945] transition truncate w-full mb-2">{c.name || "Creator"}</span>
                        <button 
                          onClick={(e) => e.preventDefault()}
                          className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold hover:bg-white hover:text-black transition"
                        >
                          Follow
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {showingFiltered && <div className="h-20 md:h-24" />}

          <div className="relative z-10 pt-0 md:pt-2 pb-32 md:pb-20 space-y-2 md:space-y-6">
            {filtered && <SearchResults search={search} videos={videos} creators={creators} onVideoClick={setSelected} />}

            {!filtered && showingFiltered && (
              <div className="px-4 md:px-12">
                <div className="mt-10 flex items-center justify-between mb-4">
                  <h2 className="text-2xl md:text-3xl font-bold">{activeCategory || activeTab}</h2>
                  {activeCategory && <button onClick={() => setActiveCategory(null)} className="text-sm text-white/50 hover:text-white transition">Clear filter</button>}
                </div>
                {displayVideos.length === 0 ? <p className="text-white/40">No videos yet.</p> : <Grid items={displayVideos} onSelect={setSelected} onPlay={handleInstantPlay} />}
              </div>
            )}

            {loaded && !filtered && !showingFiltered && (
              <>
                {/* 6. LATEST CONTENT FEED */}
                <div className="mt-2 pb-32">
                  <div className="px-4 md:px-12 mb-4 mt-0">
                    <p className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-semibold mb-1">
                      LATEST CONTENT
                    </p>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                      Don't Miss A <span className="text-red-600">Thing</span>
                    </h2>
                  </div>
                  <div className="flex flex-col gap-8 md:gap-12 px-4 md:px-12 max-w-3xl mx-auto lg:grid lg:grid-cols-3 lg:gap-6 lg:max-w-7xl">
                    {[...videos].filter((v: any) => v.feed_visible !== false && v.type?.toLowerCase() !== "short").sort((a: any, b: any) => {
                      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
                      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
                      return bt - at;
                    }).slice(0, 12).map((v: any) => {
                      const creator = creators.find((c: any) => 
                        (v.creatorId && c.id === v.creatorId) || 
                        (v.uploaderUserId && c.ownerUserId === v.uploaderUserId) ||
                        (v.uploaderUserId && c.user_id === v.uploaderUserId)
                      );
                      return <HomeFeedCard key={v.id} video={v} creator={creator} onMore={() => handleCardSelect(v)} onPlay={() => handleInstantPlay(v)} isActive={activeVideoId === v.id} onSetActive={() => setActiveVideoId(v.id)} onOpenComments={() => setCommentSheetVideoId(v.id)} isLiked={!!likedVideos[v.id]} onToggleLike={() => setLikedVideos(prev => ({ ...prev, [v.id]: !prev[v.id] }))} />;
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <CommentSheet
        videoId={commentSheetVideoId}
        open={commentSheetVideoId !== null}
        onClose={() => setCommentSheetVideoId(null)}
      />

      <AnimatePresence>
        {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onPlay={handleInstantPlay} creators={creators} />}
      </AnimatePresence>

      {playing && (
        <AppleVideoPlayer
          src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
          title={playing.title}
          textOverlays={playing?.textOverlays}
          chapters={playing.chapters || []}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
    </PullToRefresh>
    <MobileBottomNav />
    </>
  );
}

/* ============ DESKTOP NETFLIX HERO ============ */
function DesktopHero({ videos, activeIndex, onPlay, onMore }: { videos: Video[], activeIndex: number, onPlay: (v: Video) => void, onMore: (v: Video) => void }) {
  if (!videos || videos.length === 0) return null;
  const activeVideo = videos[activeIndex];

  return (
    <section className="relative w-full lg:h-[45vh] min-h-[350px] flex items-center justify-start overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeVideo.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0"
        >
          <img src={activeVideo.posterUrl || activeVideo.backdropUrl} alt={activeVideo.title} className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/60 to-transparent w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent w-full" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 px-8 md:px-12 lg:px-16 max-w-2xl flex flex-col items-start pt-10">
        <motion.div
           key={`text-${activeVideo.id}`}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-2xl lg:text-4xl font-black text-white leading-[1.1] mb-4 drop-shadow-2xl">
            {activeVideo.title}
          </h1>
          
          <div className="flex items-center gap-3 text-xs font-semibold mb-4">
            <span className="text-white/80">{activeVideo.year}</span>
            <span className="border border-white/30 px-2 py-0.5 rounded text-xs">{activeVideo.rating || "TV-MA"}</span>
            <span className="text-white/80">{activeVideo.duration}</span>
            <span className="text-[#1ed760] font-bold">{activeVideo.match}% Match</span>
          </div>

          <p className="text-sm text-white/80 leading-relaxed mb-6 line-clamp-3 drop-shadow-md max-w-2xl">
            {activeVideo.description || "No description available."}
          </p>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onPlay(activeVideo)}
              className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white px-5 py-2.5 rounded-full font-bold text-sm transition-transform hover:scale-105 shadow-xl"
            >
              <Play size={18} fill="currentColor" /> Play
            </button>
            <button 
              onClick={() => onMore(activeVideo)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-8 py-3.5 rounded-full font-bold text-lg transition-transform hover:scale-105 border border-white/10"
            >
              <Info size={18} /> More Info
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ============ MOBILE APP REEL HERO ============ */
function AppReelHero({ videos, activeIndex, setActiveIndex, onPlay, onMore }: { videos: Video[], activeIndex: number, setActiveIndex: (i: number) => void, onPlay: (v: Video) => void, onMore: (v: Video) => void }) {
  const dragX = useMotionValue(0);
  const currentIndex = useMotionValue(activeIndex);
  const pointerStartX = useRef(0);

  useEffect(() => {
    animate(currentIndex, activeIndex, { type: "spring", stiffness: 300, damping: 30 });
  }, [activeIndex]);

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (index !== activeIndex) return;
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerStartX.current = e.clientX;
    dragX.set(0);
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
    if (index !== activeIndex) return;
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    dragX.set(e.clientX - pointerStartX.current);
  };

  const handlePointerUp = (e: React.PointerEvent, index: number) => {
    if (index !== activeIndex) return;
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    const swipe = dragX.get();
    if (swipe < -40) setActiveIndex((activeIndex + 1) % videos.length);
    else if (swipe > 40) setActiveIndex((activeIndex - 1 + videos.length) % videos.length);
    animate(dragX, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <div className="relative w-full h-[240px] flex items-center justify-center mb-0 mt-0 bg-[#0a0303] overflow-visible">
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {videos.map((video, i) => (
          <AppReelCard
            key={video.id}
            video={video}
            i={i}
            activeIndex={activeIndex}
            currentIndex={currentIndex}
            dragX={dragX}
            onPlay={onPlay}
            onMore={onMore}
            isActive={i === activeIndex}
            onPointerDown={(e: React.PointerEvent) => handlePointerDown(e, i)}
            onPointerMove={(e: React.PointerEvent) => handlePointerMove(e, i)}
            onPointerUp={(e: React.PointerEvent) => handlePointerUp(e, i)}
          />
        ))}
      </div>
    </div>
  );
}

function AppReelCard({ video, i, activeIndex, currentIndex, dragX, onPlay, onMore, isActive, onPointerDown, onPointerMove, onPointerUp }: any) {
  const offset = useTransform([currentIndex, dragX], ([c, d]: any[]) => {
    return i - c + (d / 250);
  });

  const x = useTransform(offset, (o) => `${o * 70}%`); 
  const scale = useTransform(offset, (o) => Math.max(0.85, 1 - Math.abs(o) * 0.15)); 
  const opacity = useTransform(offset, (o) => Math.abs(o) > 1.5 ? 0 : 1); 
  const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10)); 

  return (
    <motion.div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => { if (isActive) onMore(video); }}
      style={{ x, scale, opacity, zIndex, touchAction: "pan-y" }}
      className="absolute w-[60vw] max-w-[180px] aspect-[3/4] rounded-[20px] cursor-pointer shadow-[0_15px_40px_rgba(0,0,0,0.9)] select-none bg-[#1c1c1e] border border-white/10"
    >
      <div className="relative w-full h-full rounded-[20px] overflow-hidden pointer-events-none">
        <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" draggable={false} />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-95" />

        <div className="absolute bottom-0 inset-x-0 p-2 flex flex-col items-start gap-1 pointer-events-auto">
          <h3 className="text-sm font-black tracking-tight text-white drop-shadow-lg leading-tight line-clamp-2">
            {video.title}
          </h3>
          
          <div className="flex items-center gap-1 text-[8px] font-semibold text-white/80">
             <span>{video.year}</span>
             <span className="border border-white/30 px-1 py-0.5 rounded">{video.rating || "TV-MA"}</span>
             <span>{video.duration}</span>
          </div>

          {isActive && (
            <div className="flex items-center gap-2 w-full mt-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onPlay(video); }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#E53945] text-white px-2 py-1.5 rounded-full font-bold text-[10px] hover:bg-[#d12e39] transition active:scale-95 shadow-lg"
              >
                <Play size={10} fill="currentColor" /> Play
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                className="w-6 h-6 flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full hover:bg-white/30 transition active:scale-95 shrink-0"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ============ GRID ============ */
function Grid({ items, onSelect, onPlay }: { items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
      {items.map((item) => (
        <Card key={item.id} item={item} hovered={hovered === item.id} onHover={() => setHovered(item.id)} onLeave={() => setHovered(null)} onSelect={onSelect} onPlay={onPlay} />
      ))}
    </div>
  );
}

/* ============ CARD ============ */
function Card({ item, hovered, onHover, onLeave, onSelect, onPlay, showCreator, creator }: any) {
  const progress = item.progressSeconds && item.progressDuration ? (item.progressSeconds / item.progressDuration) * 100 : 0;
  return (
    <motion.div onMouseEnter={onHover} onMouseLeave={onLeave} onClick={() => onSelect(item)} animate={{ scale: hovered ? 1.08 : 1 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} data-tv-focus
      className="relative flex-shrink-0 w-[110px] md:w-[140px] aspect-[2/3] rounded overflow-hidden cursor-pointer z-10 hover:z-40 shadow-lg">
      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
      {progress > 0 && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-20"><div className="h-full bg-red-600" style={{ width: `${progress}%` }} /></div>}
      <div className={`absolute inset-x-0 ${progress > 0 ? 'bottom-[3px]' : 'bottom-0'} bg-gradient-to-t from-black via-black/70 to-transparent p-2 md:p-2.5 flex items-center gap-2`}>
        {showCreator && creator && (creator.photoUrl ? <img src={creator.photoUrl} alt="" className="w-5 h-5 md:w-6 md:h-6 rounded-xl object-cover flex-shrink-0 border border-white/20" /> : <div className="w-5 h-5 md:w-6 md:h-6 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{(creator.name?.[0] || "?").toUpperCase()}</div>)}
        <p className="text-[11px] md:text-xs font-bold leading-tight line-clamp-2 text-white">{item.title}</p>
      </div>
      {hovered && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/40 p-3 flex-col justify-end">
          <p className="text-sm font-bold mb-2 line-clamp-2">{item.title}</p>
          <div className="flex items-center gap-2 text-[10px] mb-2.5 flex-wrap"><span className="text-green-500 font-bold">{item.match}%</span><span className="border border-white/50 px-1">{item.rating}</span><span className="text-white/80">{item.year}</span></div>
          <div className="flex gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onPlay(item); }} className="bg-white text-black rounded-full p-1.5 hover:bg-white/80"><Play size={12} fill="black" /></button>
            <div className="border border-white/60 rounded-full p-1.5 hover:border-white" onClick={(e) => e.stopPropagation()}><SaveButton videoId={item.id} variant="icon" size={12} /></div>
            <div className="border border-white/60 rounded-full p-1.5 hover:border-white" onClick={(e) => e.stopPropagation()}><LikeButton videoId={item.id} size={12} showCount={false} /></div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ============ MODAL ============ */
function DetailModal({ item, onClose, onPlay, creators }: { item: Video; onClose: () => void; onPlay: (v: Video) => void; creators?: any[] }) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (modalContentRef.current) modalContentRef.current.scrollTop = 0; }, [item.id]);

  const uploader = item.creatorId ? (creators || []).find((c: any) => c.id === item.creatorId) || null : null;
  const uploaderName = uploader?.name || "TROOFLIX";
  const uploaderPhoto = uploader?.photoUrl || "";
  const uploaderSlug = uploader?.slug || "";
  const uploaderInitial = uploaderName.charAt(0).toUpperCase();

  const previewRef = useRef<HTMLVideoElement>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const videoSrc = item.videoUrl ?? item.bitchuteUrl ?? "";

  useEffect(() => {
    if (!videoSrc) return;
    const v = previewRef.current;
    if (!v) return;
    const onMeta = () => { try { const dur = v.duration; if (isFinite(dur) && dur > 0) v.currentTime = Math.min(300, dur / 3); } catch {} };
    const onCanPlay = () => { setPreviewReady(true); v.play().catch(() => {}); };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("canplay", onCanPlay);
    return () => { v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("canplay", onCanPlay); v.pause(); try { v.removeAttribute("src"); v.load(); } catch {} };
  }, [videoSrc]);

  const metaParts: string[] = [item.category];
  if (item.duration && item.duration.trim()) metaParts.push(item.duration);
  if (item.year) metaParts.push(String(item.year));
  if (item.rating) metaParts.push(item.rating);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div key={item.id} ref={modalContentRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} 
        className="bg-[#141414] shadow-2xl rounded-lg relative w-full max-w-4xl overflow-y-auto" 
        style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative h-[260px] md:h-[420px] w-full overflow-hidden">
          <img src={item.backdropUrl} alt={item.title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${previewReady ? "opacity-0" : "opacity-100"}`} />
          {videoSrc && (
            <>
              <video ref={previewRef} src={videoSrc} muted playsInline preload="metadata" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${previewReady ? "opacity-100" : "opacity-0"}`} />
              <TextOverlayRenderer overlays={item.textOverlays} />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-black/70 hover:bg-black/90 rounded-full p-2 transition" aria-label="Close"><X size={20} /></button>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
            <h2 className="text-2xl md:text-4xl font-black mb-1 md:mb-2 drop-shadow-lg">{item.title}</h2>
            <p className="text-xs md:text-sm text-white/70 mb-3 md:mb-4">{metaParts.join(" · ")}</p>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-xl shadow-lg hover:bg-white/30 transition-all active:scale-95"><Play size={18} fill="currentColor" /> Play</button>
              
              <div className="flex items-center justify-center w-[36px] h-[36px] md:w-[40px] md:h-[40px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/20 transition-all text-white cursor-pointer">
                <SaveButton videoId={item.id} variant="icon" size={20} />
              </div>

              <div className="flex items-center gap-2 bg-[#000000]/40 backdrop-blur-md border border-white/10 rounded-xl px-2 py-1 md:py-1.5 ml-0 md:ml-2 shadow-lg">
                {uploaderPhoto ? <img src={uploaderPhoto} alt={uploaderName} className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-white/20" /> : <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[10px] font-bold text-white">{uploaderInitial}</div>}
                <div className="min-w-0 flex flex-col justify-center">
                  <p className="text-[7px] uppercase tracking-widest text-white/50 leading-none mb-0.5">Uploaded by</p>
                  {uploaderSlug ? <a href={`/podcaster/${uploaderSlug}`} className="text-[10px] md:text-xs font-semibold text-white hover:underline truncate leading-tight">{uploaderName}</a> : <p className="text-[10px] md:text-xs font-semibold text-white truncate leading-tight">{uploaderName}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5 md:p-10 flex items-start justify-between gap-4">
          <div className="flex-1">
            {item.description && <p className="text-white/90 leading-relaxed text-sm md:text-base">{item.description}</p>}
          </div>
          <div className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0 cursor-pointer"><LikeButton videoId={item.id} size={22} stacked /></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
