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
import {  Play, Info, ChevronLeft, ChevronRight, X,
  Search, Bell, HomeIcon, Menu,
  Compass, LogOut, LogIn, Users, ShoppingBag, Sparkles, BookOpen, Flame, List,
  CheckCircle2, Pause, VolumeX, Volume2, MoreVertical, Plus, Maximize,
  ThumbsUp, MessageCircle, Share2, Bookmark , DollarSign, ShieldOff, Radio, MessageSquare, Download , Wallet , ArrowRight , Tv , Landmark, Phone, Monitor, Smartphone, Palette, Film } from "lucide-react";
import AuthPlaybackGate from "@/components/AuthPlaybackGate";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import UserMenu from "@/components/UserMenu";
import { useSearch } from "@/context/SearchContext";
import TopBar from "@/components/TopBar";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import MerchRow from "@/components/MerchRow";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import SearchResults from "@/components/SearchResults";
import DirectoryHome, { FeaturedVideoHero } from "@/components/DirectoryHome";
import MobileBottomNav from "@/components/MobileBottomNav";
import TextOverlayRenderer from "@/components/TextOverlay";
import CommentSheet from "@/components/CommentSheet";
import { getAllProgress } from "@/lib/progress";
import { 
  getCachedCreators, 
  getCachedUser, 
  getCachedVideos, 
  getCachedProducts, 
  getSyncCachedVideos, 
  getSyncCachedCreators, 
  getSyncCachedProducts 
} from "@/lib/cache";

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

const NAV_TABS: string[] = ["Home", "Feed"];

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>(() => (typeof window !== "undefined" ? getSyncCachedVideos() || [] : []));
  const [merchandise, setMerchandise] = useState<any[]>(() => (typeof window !== "undefined" ? getSyncCachedProducts() || [] : []));
  const [books, setBooks] = useState<Video[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [creators, setCreators] = useState<any[]>(() => (typeof window !== "undefined" ? getSyncCachedCreators() || [] : []));
  const { search } = useSearch();
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [gateVideo, setGateVideo] = useState<Video | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("Home");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<number[]>([]);
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

  const [loaded, setLoaded] = useState(() => (typeof window !== "undefined" && Boolean(getSyncCachedVideos()?.length)));
  const [progressList, setProgressList] = useState<any[]>([]);

  useEffect(() => {
    getCachedCreators().then(setCreators).catch(() => {});
    
    // Fetch all users for the search dropdown
    const supabase = createClient();
    supabase.from("profiles").select("user_id, display_name, username, avatar_url, is_verified, tier").then(({ data }) => {
      if (data) setAllUsers(data);
    });
    getCachedUser()
      .then((u) => {
        setUser(u);
        if (u) {
          fetch(`/api/follows?user_id=${u.id}`)
            .then((r) => r.json())
            .then((d) => setFollowedCreatorIds(d.ids || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setAuthResolved(true));
    
    getCachedVideos()
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setVideos(all);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));

    getCachedProducts()
      .then((_products) => {
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
    const t = String(v.type || "").toLowerCase().trim();
    // Strictly exclude Shorts, Reels, Tweets, Premium, and hidden videos from the Hero carousel
    return t !== "short" && t !== "reel" && t !== "tweet" && v.visibility !== "premium" && v.feed_visible !== false;
  });
  const featuredHeroVideos = heroPool.filter((video) => video.featured);

  const [heroIndex, setHeroIndex] = useState(0);

  const isLongVideo = (v: Video) => !v.uploaderUserId && v.type === "long-video";

  const newReleases = videos.filter(isLongVideo).sort((a, b) => b.id - a.id).slice(0, 20);
  const trending = videos.filter(isLongVideo).sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0)).slice(0, 20);

  const continueWatching = progressList
    .map(p => {
      const video = videos.find(v => v.id === p.id);
      return video ? { ...video, progressSeconds: p.seconds, progressDuration: p.duration } : null;
    })
    .filter(Boolean).slice(0, 10) as Video[];

  let displayVideos = videos;
  if (activeCategory) displayVideos = videos.filter((v) => v.category === activeCategory);
  else if (activeTab === "Movies") displayVideos = videos.filter((v) => v.type === "Movie");
  else if (activeTab === "Series") displayVideos = videos.filter((v) => v.type === "Series");

  const filtered = search ? videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase())) : null;

  useEffect(() => {
    if (heroPool.length <= 1) {
      setHeroIndex(0);
      return;
    }
    const interval = setInterval(() => setHeroIndex((prev) => (prev + 1) % heroPool.length), 10000);
    return () => clearInterval(interval);
  }, [heroPool.length]);

  const hero = heroPool[heroIndex] || null;
  const showingFiltered = activeCategory || activeTab !== "Home" || filtered;

  const handleCardSelect = (item: Video) => {
    if (item.type === "Merchandise") router.push("/merchandise");
    else if (item.type === "Book") router.push("/books");
    else setSelected(item);
  };

  const handleInstantPlay = (video: Video) => {
    setSelected(null);
    if (!user) {
      setGateVideo(video);
      return;
    }
    setPlaying(video);
  };

  const toggleFollow = async (e: React.MouseEvent, creatorId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    
    const isFollowing = followedCreatorIds.includes(creatorId);
    setFollowedCreatorIds(prev => isFollowing ? prev.filter(id => id !== creatorId) : [...prev, creatorId]);

    try {
      await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, creatorId })
      });
    } catch (err) {
      setFollowedCreatorIds(prev => isFollowing ? [...prev, creatorId] : prev.filter(id => id !== creatorId));
    }
  };

  return (
    <>
        <main className="min-h-screen bg-[#0a0303] text-white overflow-x-hidden pb-20 lg:pb-0 relative">
{/* Subtle ambient background gradient */}
      <div className="fixed top-0 left-0 w-full h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.05] via-transparent to-transparent pointer-events-none z-0" />
      
      <TopBar />
      
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
              {!user && authResolved && (<>
              <div className="lg:hidden w-full">
                <FeaturedVideoHero videos={featuredHeroVideos.length > 0 ? featuredHeroVideos : heroPool} onSelect={handleCardSelect} className="-mx-0" />
              </div>
              {/* MOBILE SECTION: Pills + Header + Avatars + Hero */}
              <div className="lg:hidden w-full flex flex-col relative z-10 bg-transparent overflow-hidden">
                <div className="w-full relative z-10 px-6 pt-4 pb-10 flex flex-col items-center justify-start text-center">
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-56 h-56 bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)] blur-3xl pointer-events-none" />

                  <h1 className="relative text-[46px] leading-[0.95] font-black tracking-[-0.05em] text-white mb-4 mt-2">
                    Create without <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E53945] to-orange-500">limits</span>.
                  </h1>
                  <p className="relative text-[15px] text-white/60 max-w-sm mx-auto leading-relaxed mb-8">
                    Stream, share, connect, and grow on a platform built for creators who want freedom, power, and a real home for their work.
                  </p>

                  <div className="relative flex flex-row w-full max-w-md gap-2.5">
                    <a
                      href="/signup"
                      className="group relative flex-1 min-w-0 flex items-center justify-center gap-1.5 overflow-hidden bg-gradient-to-r from-[#E53945] to-[#ff5a5f] text-white font-bold text-[15px] px-4 py-3.5 rounded-full transition shadow-[0_18px_40px_rgba(229,57,69,0.35)] whitespace-nowrap"
                    >
                      <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700" />
                      <span className="relative">Join Today</span>
                    </a>
                    <a
                      href="/features"
                      className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-white/[0.07] border border-white/15 text-white font-bold text-[15px] px-4 py-3.5 rounded-full hover:bg-white/[0.12] transition backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] whitespace-nowrap"
                    >
                      Why Trooflix
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              </div>

              {/* DESKTOP SECTION: Signed-out hero */}
              <div className="hidden lg:block w-full relative">
                <div className="relative w-full min-h-[100vh] -mt-[calc(env(safe-area-inset-top)+56px)] pt-[calc(env(safe-area-inset-top)+56px)] overflow-hidden bg-[#08090c]">
                  {heroPool.length > 0 ? (
                    <DesktopHero
                      videos={heroPool}
                      activeIndex={heroIndex}
                      onMore={handleCardSelect}
                      inColumn
                      fullBleed
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#111114]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0303] via-transparent to-transparent" />
                  <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 flex items-center justify-start px-8 xl:px-16">
                    <div className="max-w-2xl text-left lg:pl-8">
                      <h1 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">
                        Stop letting Big Tech <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E53945] to-orange-500">eat your lunch.</span>
                      </h1>
                      <p className="text-base xl:text-lg text-white/60 mb-10 leading-relaxed font-medium">
                        Tired of working countless hours making great content just to give half your earnings away to billionaires and get censored in the process? It&apos;s time to take your power back.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-start">
                        <a href="/signup" className="flex items-center justify-center gap-2 bg-[#1c1c1e] border border-white/10 text-white font-bold text-base px-8 py-4 rounded-full hover:bg-[#2c2c2e] transition">Join Today</a>
                        <a href="/features" className="flex items-center justify-center gap-2 bg-white text-black font-bold text-base px-8 py-4 rounded-full hover:bg-gray-200 transition">Why Trooflix <ArrowRight size={18} /></a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              {/* FEATURES HEROES (DESKTOP SIGNED-OUT) */}
              <div className="hidden lg:block w-full">
                {/* Page 1: Zero Censorship (custom) */}
                <section className="relative w-full min-h-[100vh] overflow-hidden bg-[#050308] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_110%,rgba(168,85,247,0.35),rgba(229,57,69,0.28)_28%,rgba(5,3,8,0.95)_62%,#050308_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.04),transparent_30%)]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-10">
                    <motion.div
                      className="w-full lg:w-[46%] max-w-3xl"
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.4 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45 mb-5">Page 1 of 6</p>
                      <h2 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">
                        Your Voice. <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E53945] to-orange-500">Unfiltered.</span>
                      </h2>
                      <p className="text-base xl:text-lg text-white/65 leading-relaxed font-medium max-w-2xl mb-10">
                        Broadcast-quality WebRTC live streams with multi-guest support. Post reels, docs, and podcasts without the shadowban.
                      </p>
                      <a href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E53945] px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(229,57,69,0.45),0_0_35px_rgba(229,57,69,0.35)] hover:bg-[#ff4b57] transition">
                        Start Broadcasting
                      </a>
                    </motion.div>

                    <motion.div
                      className="hidden lg:flex w-[46%] items-center justify-center"
                      initial={{ opacity: 0, y: 30, scale: 0.98 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: false, amount: 0.35 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    >
                      <div className="relative w-full max-w-[520px]">
                        <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.06] backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]"></span>
                              </span>
                              <span className="rounded-full bg-red-500/20 border border-red-400/40 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-red-300">LIVE</span>
                            </div>
                            <span className="text-xs text-white/50 font-medium">Multi-guest stream</span>
                          </div>
                          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#1a1020] via-[#120b16] to-[#09090c]">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(229,57,69,0.25),transparent_35%),radial-gradient(circle_at_70%_60%,rgba(168,85,247,0.25),transparent_35%)]" />
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute left-4 bottom-4 flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold">YV</div>
                              <div>
                                <div className="text-sm font-semibold text-white">Your Voice, Live</div>
                                <div className="text-xs text-white/55">Streaming now</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex items-center pl-2">
                          {[
                            { label: "A", bg: "from-[#E53945] to-[#ff7a45]", delay: 0 },
                            { label: "B", bg: "from-[#a855f7] to-[#6366f1]", delay: 0.2 },
                            { label: "C", bg: "from-[#14b8a6] to-[#22d3ee]", delay: 0.4 },
                          ].map((guest, idx) => (
                            <motion.div
                              key={guest.label}
                              className={`relative ${idx > 0 ? "-ml-4" : ""} h-16 w-16 rounded-full border border-white/25 bg-gradient-to-br ${guest.bg} backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center text-white font-bold`}
                              animate={{ y: [0, -8, 0] }}
                              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: guest.delay }}
                            >
                              <span className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-xl" />
                              <span className="relative">{guest.label}</span>
                            </motion.div>
                          ))}
                          <span className="ml-4 text-sm text-white/55 font-medium">3 guest slots live</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 2: Keep 99% of Earnings */}
                <section className="relative w-full min-h-[100vh] overflow-hidden bg-[#020805] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.22),transparent_30%),linear-gradient(135deg,#020805_0%,#04110a_45%,#000000_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.12),transparent_35%)]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-10">
                    <motion.div className="w-full lg:w-[45%] max-w-3xl" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45 mb-5">Page 2 of 6</p>
                      <h2 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">
                        Stop paying the <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#22c55e] to-emerald-300">Big Tech tax.</span>
                      </h2>
                      <p className="text-base xl:text-lg text-white/65 leading-relaxed font-medium max-w-2xl mb-10">Why give away 45% of your hard-earned money? Keep 99% of your earnings. A flat 1% fee.</p>
                      <a href="/wallet" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(16,185,129,0.35),0_0_30px_rgba(16,185,129,0.25)] hover:bg-emerald-400 transition">Calculate Your Earnings</a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[50%] items-center justify-center relative" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.35 }} transition={{ duration: 0.9, ease: "easeOut" }}>
                      <div className="relative w-full max-w-[560px] flex flex-col items-center">
                        <div className="flex items-end gap-6">
                          <div className="text-[140px] xl:text-[180px] leading-none font-black tracking-tighter text-white drop-shadow-[0_0_40px_rgba(34,197,94,0.45)]">99%</div>
                          <div className="relative mb-6 text-3xl xl:text-4xl font-black text-white/25">
                            45% <span className="text-white/20">(YouTube)</span>
                            <span className="absolute left-[-6%] right-[-6%] top-1/2 h-[4px] -translate-y-1/2 rotate-[-12deg] bg-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                          </div>
                        </div>
                        <motion.div className="mt-8 self-end mr-8 w-[320px] rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]" animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300"><CheckCircle2 size={20} /></div>
                            <div>
                              <div className="text-sm font-semibold text-white">Payout Received</div>
                              <div className="text-xs text-white/55">+$1,284.00 deposited to TrooBank</div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 3: Built-in Storefront */}
                <section className="relative w-full min-h-[100vh] overflow-hidden bg-[#120a03] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(245,158,11,0.28),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(249,115,22,0.22),transparent_30%),linear-gradient(180deg,#120a03_0%,#090603_100%)]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-10">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45 mb-5">Page 3 of 6</p>
                      <h2 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">Turn your audience into a <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#f59e0b] to-orange-400">business.</span></h2>
                      <p className="text-base xl:text-lg text-white/65 leading-relaxed font-medium max-w-2xl mb-10">Sell merch, books, and digital goods directly on your profile. No third-party store needed.</p>
                      <a href="/creator-dashboard/merch" className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(245,158,11,0.35),0_0_30px_rgba(245,158,11,0.25)] hover:bg-amber-400 transition">Open Your Store</a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[54%] justify-center" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.35 }} transition={{ duration: 0.9, ease: "easeOut" }}>
                      <div className="flex gap-5 items-end">
                        {[
                          { name: "Creator Hoodie", tag: "New Drop", icon: "🧥", price: "$48" },
                          { name: "Limited Book", tag: "Sold Out", icon: "📘", price: "$24" },
                          { name: "Digital Preset", tag: "New Drop", icon: "⬇️", price: "$12" },
                        ].map((item, idx) => (
                          <motion.div key={item.name} className={`relative w-[170px] rounded-[24px] border border-white/15 bg-white/[0.07] backdrop-blur-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] ${idx === 1 ? "mb-10" : idx === 2 ? "mb-4" : ""}`} animate={{ y: [0, idx === 1 ? -12 : -8, 0] }} transition={{ duration: 4 + idx * 0.4, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}>
                            <span className={`absolute -top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${item.tag === "Sold Out" ? "bg-red-500/90 text-white" : "bg-amber-400 text-black"}`}>{item.tag}</span>
                            <div className="h-28 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/10 flex items-center justify-center text-4xl mb-4">{item.icon}</div>
                            <div className="text-sm font-semibold text-white leading-tight">{item.name}</div>
                            <div className="mt-1 text-xs text-white/55">{item.price}</div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 4: Watch on All Platforms */}
                <section className="relative w-full min-h-[100vh] overflow-hidden bg-[#03070d] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(56,189,248,0.22),transparent_28%),linear-gradient(135deg,#02050a_0%,#04111f_45%,#020409_100%)]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-10">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45 mb-5">Page 4 of 6</p>
                      <h2 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">One platform. <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-cyan-200">Every screen.</span></h2>
                      <p className="text-base xl:text-lg text-white/65 leading-relaxed font-medium max-w-2xl mb-10">Stream on your phone, computer, Smart TV, or Fire Stick. Zero buffering, cinematic quality.</p>
                      <a href="/tv" className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(14,165,233,0.35),0_0_30px_rgba(56,189,248,0.25)] hover:bg-sky-400 transition"><Tv size={18} /> Cast to TV</a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[54%] justify-center relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.35 }} transition={{ duration: 0.9, ease: "easeOut" }}>
                      <div className="relative w-full max-w-[620px] h-[420px]">
                        <motion.div className="absolute left-8 top-4 right-16 h-[300px] rounded-[28px] border border-cyan-200/20 bg-gradient-to-br from-[#0b1624] to-[#050910] shadow-[0_0_80px_rgba(56,189,248,0.22),0_30px_80px_rgba(0,0,0,0.45)] overflow-hidden" animate={{ boxShadow: ["0 0 50px rgba(56,189,248,0.18),0 30px 80px rgba(0,0,0,0.45)", "0 0 90px rgba(56,189,248,0.30),0 30px 80px rgba(0,0,0,0.45)", "0 0 50px rgba(56,189,248,0.18),0 30px 80px rgba(0,0,0,0.45)"] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
                          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.18),transparent_35%,rgba(255,255,255,0.06))]" />
                          <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-[#10243a] via-[#0a1422] to-[#05070b] border border-white/10 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-white/80 text-sm font-semibold tracking-[0.2em] uppercase mb-2">Now Playing</div>
                              <div className="text-3xl font-black text-white">Cinematic Documentary</div>
                            </div>
                          </div>
                        </motion.div>
                        <motion.div className="absolute right-0 bottom-0 w-[150px] h-[300px] rounded-[30px] border border-white/20 bg-white/[0.08] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] p-3" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                          <div className="h-full rounded-[22px] bg-[#081018] border border-white/10 p-3 flex flex-col">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 mb-3">Mini Player</div>
                            <div className="flex-1 rounded-xl bg-gradient-to-br from-sky-500/30 to-cyan-300/10 border border-white/10 mb-3" />
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-2/3 bg-sky-400 rounded-full" /></div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 5: TrooChat */}
                <section className="relative w-full min-h-[100vh] overflow-hidden bg-[#090616] flex items-center">
                  <style>{`@keyframes waveBar { 0%,100% { transform: scaleY(0.35); opacity: .55; } 50% { transform: scaleY(1); opacity: 1; } }`}</style>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(168,85,247,0.28),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.2),transparent_30%),linear-gradient(180deg,#090616_0%,#05040b_100%)]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-10">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45 mb-5">Page 5 of 6</p>
                      <h2 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">Connect beyond the <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-blue-300">comment section.</span></h2>
                      <p className="text-base xl:text-lg text-white/65 leading-relaxed font-medium max-w-2xl mb-10">TrooChat messaging, voice, and video calls. No algorithms, just real conversations.</p>
                      <a href="/messages" className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(139,92,246,0.35),0_0_30px_rgba(139,92,246,0.25)] hover:bg-violet-400 transition">Start a Conversation</a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[52%] justify-center relative" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.35 }} transition={{ duration: 0.9, ease: "easeOut" }}>
                      <div className="relative w-full max-w-[520px] h-[420px]">
                        <div className="absolute left-8 top-6 max-w-[320px] rounded-3xl rounded-bl-md border border-white/15 bg-white/[0.08] backdrop-blur-2xl p-4 text-white/85 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">Loved the new episode — when’s the next live?</div>
                        <div className="absolute right-6 top-28 max-w-[320px] rounded-3xl rounded-br-md border border-violet-300/20 bg-violet-500/20 backdrop-blur-2xl p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                          <div className="text-sm text-white/90 mb-3">Voice message</div>
                          <div className="flex items-end gap-1 h-8">
                            {[8,14,22,12,26,18,10,24,16,20,12,18].map((h, idx) => (
                              <span key={idx} className="w-1.5 rounded-full bg-gradient-to-t from-violet-300 to-blue-300 origin-bottom" style={{ height: `${h}px`, animation: `waveBar 1s ease-in-out ${idx * 0.06}s infinite` }} />
                            ))}
                          </div>
                        </div>
                        <div className="absolute left-16 bottom-20 max-w-[300px] rounded-3xl rounded-bl-md border border-white/15 bg-white/[0.08] backdrop-blur-2xl p-4 text-white/85 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">Let’s hop on a quick call.</div>
                        <div className="absolute right-10 bottom-8">
                          <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
                          <button className="relative h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_0_8px_rgba(16,185,129,0.12),0_18px_40px_rgba(16,185,129,0.35)]"><Phone size={24} /></button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 6: Trooflix Economy */}
                <section className="relative w-full min-h-[100vh] overflow-hidden bg-[#090602] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(234,179,8,0.22),transparent_25%),radial-gradient(circle_at_70%_75%,rgba(245,158,11,0.15),transparent_30%),linear-gradient(180deg,#090602_0%,#040301_100%)]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-10">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.8, ease: "easeOut" }}>
                      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45 mb-5">Page 6 of 6</p>
                      <h2 className="text-[52px] xl:text-[68px] 2xl:text-[80px] font-black tracking-tighter text-white leading-[1.02] mb-6">The creator economy, <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-400">reimagined.</span></h2>
                      <p className="text-base xl:text-lg text-white/65 leading-relaxed font-medium max-w-2xl mb-10">Tip creators, buy merch, and manage your funds with TrooBank. All in one ecosystem.</p>
                      <a href="/wallet" className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_18px_45px_rgba(251,191,36,0.3),0_0_30px_rgba(251,191,36,0.2)] hover:bg-amber-300 transition">Explore TrooBank</a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[52%] justify-center relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.35 }} transition={{ duration: 0.9, ease: "easeOut" }}>
                      <div className="relative w-full max-w-[520px] h-[420px] flex items-center justify-center">
                        <motion.div className="absolute top-2 text-5xl drop-shadow-[0_0_20px_rgba(251,191,36,0.55)]" animate={{ y: [0, 130, 0], rotate: [0, 10, 0], scale: [1, 0.95, 1] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}>🪙</motion.div>
                        <div className="absolute top-[150px] h-20 w-20 rounded-2xl border border-amber-200/20 bg-white/[0.06] backdrop-blur-xl flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)]"><Wallet className="text-amber-300" size={34} /></div>
                        <motion.div whileHover={{ rotateX: 8, rotateY: -10, scale: 1.02 }} className="group relative mt-24 w-[360px] h-[220px] rounded-[28px] border border-amber-200/20 bg-gradient-to-br from-[#3b2a06] via-[#1f1606] to-[#0c0904] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45),0_0_40px_rgba(251,191,36,0.12)] [transform-style:preserve-3d]">
                          <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(120deg,rgba(251,191,36,0.18),transparent_35%,rgba(255,255,255,0.06))]" />
                          <div className="relative h-full flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold tracking-[0.2em] text-amber-200/90">TROOBANK</span>
                              <span className="h-8 w-10 rounded-md bg-gradient-to-br from-amber-200 to-yellow-500/70" />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-white/45 mb-1">Available Balance</div>
                              <div className="text-3xl font-black text-white group-hover:hidden">$2,480.00</div>
                              <div className="hidden group-hover:block text-3xl font-black text-amber-200">$2,480.00 • 12,400 TC</div>
                            </div>
                            <div className="text-sm text-white/55 tracking-[0.22em]">•••• •••• •••• 2048</div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </section>
              </div>
            </>
          )}

          {showingFiltered && <div className="h-20 md:h-24" />}

              </>)}

      <DirectoryHome
        videos={videos}
        creators={creators}
        featuredVideos={!user ? [] : showingFiltered ? [] : featuredHeroVideos.length > 0 ? featuredHeroVideos : heroPool}
        onVideoSelect={handleCardSelect}
      />
        <div className="hidden relative z-10 pt-0 md:pt-2 pb-32 md:pb-20 space-y-2 md:space-y-6">
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
                  <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-12 max-w-3xl mx-auto lg:grid lg:grid-cols-3 lg:gap-3 lg:max-w-7xl">
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

      {gateVideo && <AuthPlaybackGate onClose={() => setGateVideo(null)} videoTitle={gateVideo.title} />}
        {playing && (
          <AppleVideoPlayer
            src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
            title={playing.title}
            poster={playing.posterUrl}
            textOverlays={playing.textOverlays}
            chapters={playing.chapters || []}
            onClose={() => setPlaying(null)}
            creatorId={playing.creatorId}
            isPremium={playing.visibility === "premium"}
          />
        )}
    </main>
        <MobileBottomNav />
    </>
  );
}

function HeroVideoCard({ video, onMore, isMobile, inColumn, fullBleed }: { video: Video, onMore: (v: Video) => void, isMobile: boolean, inColumn?: boolean, fullBleed?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const dur = v.duration || 0;
      setDuration(dur);
      try {
        // Seek to 5 min or middle
        const seekTime = Math.min(300, dur / 2);
        if (seekTime > 0) v.currentTime = seekTime;
        v.play().catch(() => {});
      } catch {}
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [video.id]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={fullBleed ? "absolute inset-0 w-full h-full" : `w-full mx-auto ${inColumn ? "" : isMobile ? "px-4 pb-6 mt-2" : "max-w-[1600px] px-4 md:px-12 mt-4 mb-8"}`}>
      <section 
        onClick={() => onMore(video)}
        className={`relative w-full ${fullBleed ? "h-full" : inColumn ? "aspect-video min-h-[420px]" : isMobile ? "aspect-video min-h-[220px]" : "h-[45vh] min-h-[420px]"} ${fullBleed ? "" : "rounded-2xl"} overflow-hidden bg-[#1c1c1e] ${fullBleed ? "" : "shadow-2xl"} cursor-pointer group`}
      >
        {/* Always show the image fallback behind the video */}
        <img 
          src={video.posterUrl || video.backdropUrl} 
          alt={video.title} 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        
        {(video.videoUrl || video.bitchuteUrl) && (
          <video
            ref={videoRef}
            src={video.videoUrl || video.bitchuteUrl || ""}
            autoPlay
            muted={muted}
            loop
            playsInline
            onPlaying={(e) => e.currentTarget.classList.remove("opacity-0")}
            className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700"
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between z-20">
          <span className="text-white text-xs font-semibold tabular-nums drop-shadow-md">
            {formatTime(duration)}
          </span>

          <button onClick={toggleMute} className="p-1.5 text-white/90 hover:text-white drop-shadow-md">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </section>
    </div>
  );
}

function DesktopHero({ videos, activeIndex, onMore, inColumn, fullBleed }: { videos: Video[], activeIndex: number, onMore: (v: Video) => void, inColumn?: boolean, fullBleed?: boolean }) {
  if (!videos || videos.length === 0) return null;
  const activeVideo = videos[activeIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeVideo.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className={fullBleed ? "absolute inset-0 w-full h-full" : "w-full"}
      >
        <HeroVideoCard video={activeVideo} onMore={onMore} isMobile={false} inColumn={inColumn} fullBleed={fullBleed} />
      </motion.div>
    </AnimatePresence>
  );
}

function AppReelHero({ videos, activeIndex, onMore }: { videos: Video[], activeIndex: number, onMore: (v: Video) => void }) {
  if (!videos || videos.length === 0) return null;
  const activeVideo = videos[activeIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeVideo.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="w-full"
      >
        <HeroVideoCard video={activeVideo} onMore={onMore} isMobile={true} />
      </motion.div>
    </AnimatePresence>
  );
}

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
        className="bg-black shadow-2xl rounded-lg relative w-full max-w-4xl overflow-y-auto" 
        style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative h-[260px] md:h-[420px] w-full overflow-hidden">
          
          {videoSrc && (
            <>
              <video ref={previewRef} src={videoSrc} muted playsInline preload="metadata" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${previewReady ? "opacity-100" : "opacity-0"}`} />
              <TextOverlayRenderer overlays={item.textOverlays} />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-black/70 hover:bg-black/90 rounded-full p-2 transition" aria-label="Close"><X size={20} /></button>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
            
            <p className="text-xs md:text-sm text-white/70 mb-3 md:mb-4">{metaParts.join(" · ")}</p>
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white/[0.16] backdrop-blur-2xl backdrop-saturate-150 border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] text-white font-bold text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-xl shadow-lg hover:bg-white/30 transition-all active:scale-95"><Play size={18} fill="currentColor" /> Play</button>
              
              <div className="flex items-center justify-center w-[36px] h-[36px] md:w-[40px] md:h-[40px] bg-white/[0.12] backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] rounded-xl hover:bg-white/20 transition-all text-white cursor-pointer">
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
          
        </div>
      </motion.div>
    </motion.div>
  );
}
