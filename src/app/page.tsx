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
import DirectoryHome from "@/components/DirectoryHome";
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
              {/* MOBILE SECTION: Pills + Header + Avatars + Hero */}
              <div className="lg:hidden w-full flex flex-col relative z-10 bg-transparent overflow-hidden">
                <div className="w-full relative z-10 px-4 pt-24 pb-10">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-[radial-gradient(circle,rgba(229,57,69,0.22),rgba(229,57,69,0.08)_35%,transparent_70%)] blur-2xl pointer-events-none" />
                  <div className="absolute top-40 -left-16 w-56 h-56 bg-[radial-gradient(circle,rgba(212,175,55,0.18),transparent_70%)] blur-3xl pointer-events-none" />
                  <div className="absolute top-56 -right-10 w-56 h-56 bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_70%)] blur-3xl pointer-events-none" />

                  <div className="relative text-center mb-7">
                    <h1 className="text-[38px] leading-[0.98] font-black tracking-[-0.04em] text-white mb-3">
                      An entire ecosystem.
                      <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-[#E53945]">In one powerful platform.</span>
                    </h1>
                    <p className="text-[14px] text-white/60 max-w-sm mx-auto leading-relaxed">
                      Stream, create, chat, sell, and own your space — all in one cinematic Trooflix experience.
                    </p>
                  </div>

                  <div className="relative grid grid-cols-3 gap-2.5 max-w-md mx-auto">
                    {[
                      { icon: Radio, title: "Livestreaming", desc: "Go live in seconds", img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=500&auto=format&fit=crop" },
                      { icon: ShoppingBag, title: "Marketplace", desc: "Sell merch & products", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=500&auto=format&fit=crop" },
                      { icon: Film, title: "Docs & Indie Films", desc: "Long-form cinema", img: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=500&auto=format&fit=crop" },
                      { icon: MessageCircle, title: "Calls & Chat", desc: "Video, voice, messages", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=500&auto=format&fit=crop" },
                      { icon: Play, title: "Shorts", desc: "Fast viral content", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=500&auto=format&fit=crop" },
                      { icon: Monitor, title: "Any Screen", desc: "Desktop, phone & TV", img: "https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=500&auto=format&fit=crop" },
                      { icon: ShieldOff, title: "Uncensored", desc: "Your voice, your rules", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=500&auto=format&fit=crop" },
                      { icon: Wallet, title: "Bank Ecosystem", desc: "Wallet, tips, payouts", img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=500&auto=format&fit=crop" },
                      { icon: Palette, title: "Custom Themes", desc: "Make your page yours", img: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=500&auto=format&fit=crop" },
                    ].map((f, i) => (
                      <div
                        key={i}
                        className="group relative overflow-hidden rounded-[22px] border border-white/15 bg-[#0b0b10] min-h-[132px] shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
                      >
                        <img src={f.img} alt="" className="absolute inset-0 h-full w-full object-cover scale-105 transition-transform duration-700 group-active:scale-110 opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_40%)]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
                        <div className="relative h-full p-2.5 flex flex-col justify-between">
                          <div className="w-9 h-9 rounded-xl bg-black/35 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                            <f.icon size={16} />
                          </div>
                          <div>
                            <p className="text-[11.5px] font-black leading-tight text-white mb-0.5 tracking-tight drop-shadow">{f.title}</p>
                            <p className="text-[10px] leading-tight text-white/75">{f.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col w-full max-w-sm gap-3 mt-8 mx-auto">
                    <a
                      href="/signup"
                      className="group relative w-full flex items-center justify-center gap-2 overflow-hidden bg-gradient-to-r from-[#E53945] to-[#ff5a5f] text-white font-bold text-lg py-4 rounded-full transition shadow-[0_18px_40px_rgba(229,57,69,0.35)]"
                    >
                      <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.25),transparent)] translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700" />
                      <span className="relative">Join Today</span>
                    </a>
                    <a
                      href="/features"
                      className="w-full flex items-center justify-center gap-2 bg-white/[0.07] border border-white/15 text-white font-bold text-lg py-4 rounded-full hover:bg-white/[0.12] transition backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    >
                      Why Trooflix
                      <ArrowRight size={18} />
                    </a>
                  </div>
                </div>
              </div>

              {/* DESKTOP SECTION: Signed-out 3x3 hero */}
              <div className="hidden lg:block w-full max-w-[1600px] mx-auto px-4 md:px-12 pt-24 md:pt-28">
                <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#08080b] p-8 xl:p-12 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(229,57,69,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(212,175,55,0.16),transparent_22%),radial-gradient(circle_at_70%_85%,rgba(59,130,246,0.14),transparent_26%)] pointer-events-none" />
                  <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(circle at center, black, transparent 85%)" }} />
                  <div className="relative flex items-end justify-between gap-10 mb-10">
                    <div className="max-w-3xl">
                      <h1 className="text-5xl xl:text-7xl font-black tracking-[-0.05em] text-white leading-[0.95] mb-5">
                        An entire ecosystem.
                        <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-[#ffd9dc] to-[#E53945]">In one powerful platform.</span>
                      </h1>
                      <p className="text-lg xl:text-xl text-white/55 leading-relaxed max-w-2xl">
                        Create, stream, watch, message, sell, and build your world — with a premium all-in-one experience made to blow people away.
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0 pb-1">
                      <a href="/signup" className="group relative overflow-hidden flex items-center justify-center gap-2 bg-gradient-to-r from-[#E53945] to-[#ff5a5f] text-white font-bold text-base px-8 py-4 rounded-full transition shadow-[0_18px_45px_rgba(229,57,69,0.35)]">
                        <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.28),transparent)] translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-700" />
                        <span className="relative">Join Today</span>
                      </a>
                      <a href="/features" className="flex items-center justify-center gap-2 bg-white/[0.06] border border-white/15 text-white font-bold text-base px-8 py-4 rounded-full hover:bg-white/[0.1] transition backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Why Trooflix <ArrowRight size={18} /></a>
                    </div>
                  </div>

                  <div className="relative grid grid-cols-3 gap-4 xl:gap-5">
                    {[
                      { icon: Radio, title: "Livestreaming", desc: "Go live instantly and connect with your audience in real time.", img: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1200&auto=format&fit=crop", featured: true },
                      { icon: ShoppingBag, title: "Personal Marketplace", desc: "Sell merch, books, and products directly from your world.", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=900&auto=format&fit=crop" },
                      { icon: Film, title: "Long Docs & Indie Movies", desc: "Showcase powerful documentaries and independent films.", img: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=900&auto=format&fit=crop" },
                      { icon: MessageCircle, title: "Video, Voice & Messaging", desc: "Calls and chat built in so your community stays close.", img: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop" },
                      { icon: Play, title: "Shorts", desc: "Fast, addictive short-form content that grabs attention.", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=900&auto=format&fit=crop" },
                      { icon: Monitor, title: "Desktop, Phone & TV", desc: "A seamless experience wherever your audience watches.", img: "https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=1200&auto=format&fit=crop", featured: true },
                      { icon: ShieldOff, title: "Uncensored", desc: "A freer platform built for creators who won’t be boxed in.", img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=900&auto=format&fit=crop" },
                      { icon: Wallet, title: "Personal Bank Ecosystem", desc: "Wallet, tips, and earnings flowing through one ecosystem.", img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=900&auto=format&fit=crop" },
                      { icon: Palette, title: "Customisable Theme Page", desc: "Shape your profile and presence with your own style.", img: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=900&auto=format&fit=crop" },
                    ].map((f, i) => (
                      <div
                        key={i}
                        className={`group relative overflow-hidden rounded-[30px] border border-white/12 bg-[#0b0b10] min-h-[210px] transition-all duration-500 hover:-translate-y-1.5 hover:border-white/25 hover:shadow-[0_35px_90px_rgba(0,0,0,0.55)] ${f.featured ? "md:col-span-2" : ""}`}
                      >
                        <img src={f.img} alt="" className="absolute inset-0 h-full w-full object-cover scale-105 transition-transform duration-700 group-hover:scale-110 opacity-75" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%)]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
                        <div className="relative h-full p-6 xl:p-7 flex flex-col justify-between">
                          <div className="w-14 h-14 rounded-2xl bg-black/35 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_30px_rgba(0,0,0,0.3)]">
                            <f.icon size={24} />
                          </div>
                          <div className={f.featured ? "max-w-xl" : ""}>
                            <h3 className={`relative font-black text-white mb-2 leading-tight tracking-tight drop-shadow ${f.featured ? "text-3xl xl:text-[34px]" : "text-2xl"}`}>{f.title}</h3>
                            <p className={`relative text-white/75 leading-relaxed ${f.featured ? "text-base xl:text-lg max-w-[42ch]" : "text-sm xl:text-[15px] max-w-[30ch]"}`}>{f.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {showingFiltered && <div className="h-20 md:h-24" />}

          
                        {/* FEATURES ROW (DESKTOP) */}
      <div className={!user && authResolved ? "hidden lg:block w-full max-w-[1600px] mx-auto px-12 py-20" : "hidden"}>
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">
            Why Creators Are <span className="text-[#E53945]">Switching</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Landmark, title: "Keep 99% of Revenue", desc: "A flat 1% fee. No hidden cuts, no demonetization.", img: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=600&auto=format&fit=crop" },
            { icon: ShieldOff, title: "Zero Censorship", desc: "No shadowbans. No algorithmic suppression. Your audience gets your content. Only 2 rules: no adult content, no AI slop.", img: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop" },
            { icon: Radio, title: "Live Streaming", desc: "Broadcast-quality WebRTC live streams with multi-guest support.", img: "https://images.unsplash.com/photo-1470229722913-7ea0a4e88db9?q=80&w=600&auto=format&fit=crop" },
            { icon: Tv, title: "Watch on TV", desc: "Stream your favourite podcasts and documentaries directly on your Smart TV or Fire Stick for a cinematic experience.", img: "https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=600&auto=format&fit=crop" },
            { icon: Wallet, title: "TrooCoins Economy", desc: "Tip creators, buy merch, and manage your funds with our built-in wallet.", img: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?q=80&w=600&auto=format&fit=crop" },
            { icon: ShoppingBag, title: "Built-in Storefront", desc: "Sell merch, books, and digital goods directly on your profile.", img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=600&auto=format&fit=crop" }
          ].map((feat, i) => (
            <div key={i} className="relative bg-[#0f0f12] border border-white/5 rounded-3xl p-8 hover:border-[#E53945]/40 transition-all duration-500 group overflow-hidden shadow-2xl flex flex-col">
              {/* Background Image */}
              <div className="absolute inset-0 z-0">
                <img src={feat.img} alt="" className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-700 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f12] via-[#0f0f12]/90 to-transparent" />
              </div>
              
              <div className="relative z-10">
                <feat.icon size={28} className="text-[#E53945] mb-6 drop-shadow-[0_0_15px_rgba(229,57,69,0.4)] group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(229,57,69,0.7)] transition-all duration-300 origin-left" />
                <h3 className="text-xl font-bold text-white mb-3">
                  {feat.title}
                </h3>
                <p className="text-[15px] text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

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

function HeroVideoCard({ video, onMore, isMobile, inColumn }: { video: Video, onMore: (v: Video) => void, isMobile: boolean, inColumn?: boolean }) {
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
    <div className={`w-full mx-auto ${inColumn ? "" : isMobile ? "px-4 pb-6 mt-2" : "max-w-[1600px] px-4 md:px-12 mt-4 mb-8"}`}>
      <section 
        onClick={() => onMore(video)}
        className={`relative w-full ${inColumn ? "aspect-video min-h-[420px]" : isMobile ? "aspect-video min-h-[220px]" : "h-[45vh] min-h-[420px]"} rounded-2xl overflow-hidden bg-[#1c1c1e] shadow-2xl cursor-pointer group`}
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

function DesktopHero({ videos, activeIndex, onMore, inColumn }: { videos: Video[], activeIndex: number, onMore: (v: Video) => void, inColumn?: boolean }) {
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
        <HeroVideoCard video={activeVideo} onMore={onMore} isMobile={false} inColumn={inColumn} />
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
