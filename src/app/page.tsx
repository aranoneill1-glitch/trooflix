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
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useScroll, useSpring, useInView } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
    if (typeof window === "undefined") return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    let lenis: Lenis | null = null;
    let rafId = 0;
    const raf = (time: number) => {
      lenis?.raf(time);
      ScrollTrigger.update();
      rafId = requestAnimationFrame(raf);
    };
    const enable = () => {
      if (!desktop.matches || lenis) return;
      lenis = new Lenis({ smoothWheel: true, duration: 1.05 });
      rafId = requestAnimationFrame(raf);
    };
    const disable = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lenis?.destroy();
      lenis = null;
      ScrollTrigger.refresh();
    };
    const onChange = () => {
      if (desktop.matches) enable();
      else disable();
    };
    onChange();
    desktop.addEventListener("change", onChange);
    return () => {
      desktop.removeEventListener("change", onChange);
      disable();
    };
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
              <SignedOutDesktopHero />
              {/* FEATURES HEROES (DESKTOP SIGNED-OUT) */}
              <div className="hidden lg:block w-full relative">
                <style>{`
                  @keyframes waveBar { 0%,100% { transform: scaleY(0.35); opacity: .55; } 50% { transform: scaleY(1); opacity: 1; } }
                  @keyframes floatSlow { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
                  @keyframes sheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
                `}</style>
                <div className="pointer-events-none fixed right-8 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
                  {['Voice', 'Earnings', 'Store', 'Screens', 'Chat', 'Economy'].map((label, i) => (
                    <div key={label} className="group pointer-events-auto flex items-center justify-end gap-3">
                      <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/0 backdrop-blur-md transition group-hover:text-white/70">{label}</span>
                      <span className="h-2.5 w-2.5 rounded-full border border-white/30 bg-white/20 shadow-[0_0_0_4px_rgba(255,255,255,0.03)]" />
                    </div>
                  ))}
                </div>
                <div className="snap-y snap-proximity">
                {/* Page 1: Content Power / Your Voice. Unfiltered. */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#040406] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.05),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(120,80,255,0.10),transparent_24%),linear-gradient(180deg,#050507_0%,#020203_100%)]" />
                  <motion.div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-white/[0.04] blur-[120px]" animate={{ x:[0,40,0], y:[0,-20,0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
                  <motion.div className="absolute right-[-5%] bottom-[10%] h-80 w-80 rounded-full bg-fuchsia-500/[0.08] blur-[130px]" animate={{ x:[0,-30,0], y:[0,25,0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.03)_45%,transparent_70%)] opacity-60" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 py-20">
                    <motion.div className="mx-auto max-w-4xl text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.45 }} transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}>
                      <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-white/45">CREATE WITHOUT LIMITS</p>
                      <h2 className="text-[56px] xl:text-[74px] 2xl:text-[88px] font-black tracking-tighter text-white leading-[0.98] mb-6">
                        Your Voice.<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">Unfiltered.</span>
                      </h2>
                      <p className="mx-auto max-w-3xl text-lg xl:text-xl text-white/65 leading-relaxed font-medium">
                        Go live in broadcast quality. Drop cinematic shorts. Publish full documentaries.<br className="hidden xl:block" />
                        All on one platform that doesn’t censor, demonetize, or hide your work.
                      </p>
                    </motion.div>

                    <motion.div className="mt-14 grid grid-cols-3 gap-6 items-end" initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.3 }} variants={{ visible: { transition: { staggerChildren: 0.14 } } }}>
                      {/* Livestream */}
                      <motion.div variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }} className="flex flex-col items-center">
                        <motion.div whileHover={{ y: -8, boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(239,68,68,0.12)' }} className="group relative w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/12 bg-[#0b0b10]/80 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition cursor-pointer">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.18),transparent_30%),linear-gradient(180deg,#15151d_0%,#09090d_100%)]" />
                          <div className="relative p-5">
                            <div className="mb-4 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70"></span><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]"></span></span>
                                <span className="rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-red-200">LIVE</span>
                              </div>
                              <span className="text-xs text-white/55 font-medium">8.2k watching</span>
                            </div>
                            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#201018] via-[#120d14] to-[#070709]">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_70%_70%,rgba(239,68,68,0.18),transparent_35%)]" />
                              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70">Broadcast Studio</div>
                              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
                              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-white">Live Session</div>
                                  <div className="text-xs text-white/50">Studio quality</div>
                                </div>
                                <div className="flex items-end gap-1 h-8">
                                  {[7,13,18,10,22,14,9,16,12].map((h,idx)=>(
                                    <span key={idx} className="w-1 rounded-full bg-gradient-to-t from-red-400 to-orange-300 origin-bottom" style={{ height:`${h}px`, animation:`waveBar 1s ease-in-out ${idx*0.08}s infinite` }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Livestream</p>
                      </motion.div>

                      {/* Shorts */}
                      <motion.div variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }} className="flex flex-col items-center">
                        <motion.div whileHover={{ y: -8, boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(255,255,255,0.08)' }} className="group relative w-full max-w-[300px] overflow-hidden rounded-[34px] border border-white/12 bg-[#0b0b10]/80 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition cursor-pointer p-3">
                          <div className="relative mx-auto aspect-[9/16] overflow-hidden rounded-[26px] border border-white/10 bg-[#050507]">
                            <motion.div className="absolute inset-[-10%]" animate={{ y: [0, -18, 0], scale: [1.02, 1.06, 1.02] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}>
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(180deg,#1a1a22_0%,#0a0a0f_55%,#050507_100%)]" />
                              <div className="absolute inset-x-8 top-16 h-40 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/10" />
                              <div className="absolute inset-x-8 top-60 h-20 rounded-2xl bg-white/[0.05] border border-white/10" />
                            </motion.div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                            <div className="absolute left-1/2 top-3 h-1.5 w-20 -translate-x-1/2 rounded-full bg-white/15" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                              {[1,2,3].map((i)=>(<div key={i} className="h-8 w-8 rounded-full border border-white/15 bg-black/30 backdrop-blur-md" />))}
                            </div>
                            <div className="absolute bottom-5 left-4 right-4">
                              <div className="mb-2 h-2 w-28 rounded-full bg-white/25" />
                              <div className="h-2 w-40 rounded-full bg-white/15" />
                            </div>
                          </div>
                        </motion.div>
                        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Shorts</p>
                      </motion.div>

                      {/* Documentaries */}
                      <motion.div variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }} className="flex flex-col items-center">
                        <motion.div whileHover={{ y: -8, boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(251,191,36,0.10)' }} className="group relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-[#0b0b10]/80 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition cursor-pointer">
                          <div className="relative aspect-[16/10] overflow-hidden">
                            <motion.div className="absolute inset-[-6%]" animate={{ scale: [1.02, 1.08, 1.02], x: [0, -12, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}>
                              <img src="https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1800&auto=format&fit=crop" alt="" className="h-full w-full object-cover brightness-[0.7] contrast-[1.05] saturate-[0.85]" />
                            </motion.div>
                            <div className="absolute inset-x-0 top-0 h-[14%] bg-black/85" />
                            <div className="absolute inset-x-0 bottom-0 h-[14%] bg-black/85" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
                            <div className="absolute left-5 bottom-[18%]">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80 mb-1">Original Documentary</div>
                              <div className="text-xl font-black tracking-tight text-white">The Untold Signal</div>
                            </div>
                          </div>
                        </motion.div>
                        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Documentaries</p>
                      </motion.div>
                    </motion.div>

                    <motion.div className="mt-12 flex items-center justify-center gap-4" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22,1,0.36,1] }}>
                      <motion.a href="/creator-dashboard/upload" whileHover={{ scale: 1.03, boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 20px 50px rgba(229,57,69,0.4)' }} whileTap={{ scale: 0.99 }} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(229,57,69,0.35)]">
                        Start Creating <ArrowRight size={18} />
                      </motion.a>
                      <motion.a href="/features" whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition">
                        See How It Works
                      </motion.a>
                    </motion.div>
                  </div>
                </section>

                {/* Page 2: Keep 99% of Earnings */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#020805] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.24),transparent_30%),linear-gradient(135deg,#020805_0%,#04110a_45%,#000000_100%)]" />
                  <motion.div className="absolute left-[10%] bottom-[10%] h-72 w-72 rounded-full bg-emerald-400/10 blur-[120px]" animate={{ scale:[1,1.15,1], opacity:[0.5,0.8,0.5] }} transition={{ duration:8, repeat:Infinity }} />
                  <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:26px_26px]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-12">
                    <motion.div className="w-full lg:w-[45%] max-w-3xl" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.45 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="mb-6 flex items-center gap-3"><span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">Creator-first economics</span><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">02 / 06</span></div>
                      <h2 className="text-[56px] xl:text-[74px] 2xl:text-[88px] font-black tracking-tighter text-white leading-[0.98] mb-6">Stop paying the<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#34d399] to-emerald-200">Big Tech tax.</span></h2>
                      <p className="text-lg xl:text-xl text-white/70 leading-relaxed font-medium max-w-2xl mb-8">Legacy platforms can take nearly half before you ever see it. Trooflix flips the model: keep <span className="text-white font-semibold">99%</span> with a flat <span className="text-white font-semibold">1% fee</span>.</p>
                      <div className="mb-10 flex flex-wrap gap-3">{['Flat 1% fee','Predictable payouts','No surprise cuts'].map((t)=>(<span key={t} className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-50/90 backdrop-blur-md">{t}</span>))}</div>
                      <a href="/wallet" className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(16,185,129,0.35),0_0_30px_rgba(16,185,129,0.25)] transition hover:scale-[1.02] hover:bg-emerald-400">Calculate Your Earnings <ArrowRight size={18} /></a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[50%] items-center justify-center relative" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="relative w-full max-w-[560px]">
                        <div className="mb-8 flex items-end gap-6 justify-center">
                          <div className="text-[150px] xl:text-[190px] leading-none font-black tracking-tighter text-white drop-shadow-[0_0_50px_rgba(34,197,94,0.5)]">99%</div>
                          <div className="relative mb-8 text-4xl xl:text-5xl font-black text-white/25">45% <span className="text-white/20">(YouTube)</span><span className="absolute left-[-8%] right-[-8%] top-1/2 h-[5px] -translate-y-1/2 rotate-[-12deg] bg-red-500/90 shadow-[0_0_16px_rgba(239,68,68,0.7)]" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <motion.div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-2xl" whileHover={{ y: -4 }}><div className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2">On $10,000</div><div className="text-3xl font-black text-emerald-300">$9,900</div><div className="text-sm text-white/45 mt-1">kept with Trooflix</div></motion.div>
                          <motion.div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-2xl" whileHover={{ y: -4 }}><div className="text-xs uppercase tracking-[0.18em] text-white/45 mb-2">Old model</div><div className="text-3xl font-black text-white/45">$5,500</div><div className="text-sm text-white/35 mt-1">after 45% platform take</div></motion.div>
                        </div>
                        <motion.div className="mt-5 ml-auto w-[330px] rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]" animate={{ y: [0, -10, 0] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300"><CheckCircle2 size={20} /></div><div><div className="text-sm font-semibold text-white">Payout Received</div><div className="text-xs text-white/55">+$1,284.00 deposited to TrooBank</div></div></div></motion.div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 3: Built-in Storefront */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#120a03] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(245,158,11,0.3),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(249,115,22,0.24),transparent_30%),linear-gradient(180deg,#120a03_0%,#090603_100%)]" />
                  <motion.div className="absolute right-[15%] top-[15%] h-64 w-64 rounded-full bg-orange-400/15 blur-[110px]" animate={{ y:[0,25,0] }} transition={{ duration:9, repeat:Infinity }} />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-12">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.45 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="mb-6 flex items-center gap-3"><span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Own the relationship</span><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">03 / 06</span></div>
                      <h2 className="text-[56px] xl:text-[74px] 2xl:text-[88px] font-black tracking-tighter text-white leading-[0.98] mb-6">Turn your audience into a <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#fbbf24] to-orange-400">business.</span></h2>
                      <p className="text-lg xl:text-xl text-white/70 leading-relaxed font-medium max-w-2xl mb-8">Launch products where your audience already watches. Sell merch, books, and digital downloads directly from your profile — no plugins, no detours.</p>
                      <div className="mb-10 grid grid-cols-3 gap-3 max-w-xl">{[{k:'Merch',v:'Apparel'},{k:'Books',v:'Print & digital'},{k:'Downloads',v:'Instant access'}].map(s=>(<div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-xl"><div className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1">{s.k}</div><div className="text-base font-bold text-white">{s.v}</div></div>))}</div>
                      <a href="/creator-dashboard/merch" className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(245,158,11,0.35),0_0_30px_rgba(245,158,11,0.25)] transition hover:scale-[1.02] hover:bg-amber-400">Open Your Store <ArrowRight size={18} /></a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[54%] justify-center" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="flex items-end gap-5">
                        {[{name:'Signature Hoodie',tag:'New Drop',icon:'🧥',price:'$48',meta:'12 colors'},{name:'Field Notes Book',tag:'Sold Out',icon:'📘',price:'$24',meta:'2k sold'},{name:'Creator Presets',tag:'New Drop',icon:'⬇️',price:'$12',meta:'Instant'}].map((item,idx)=>(
                          <motion.div key={item.name} whileHover={{ y:-10, rotateX:4, rotateY: idx===0?4:idx===2?-4:0 }} className={`relative w-[175px] rounded-[26px] border border-white/15 bg-white/[0.07] p-4 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.14)] ${idx===1?'mb-12':idx===2?'mb-5':''}`} animate={{ y:[0, idx===1?-12:-8, 0] }} transition={{ duration:4.2+idx*0.35, repeat:Infinity, ease:'easeInOut', delay:idx*0.2 }}>
                            <span className={`absolute -top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${item.tag==='Sold Out'?'bg-red-500/90 text-white':'bg-amber-400 text-black shadow-[0_0_18px_rgba(251,191,36,0.35)]'}`}>{item.tag}</span>
                            <div className="mb-4 flex h-32 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/12 to-white/[0.03] text-5xl">{item.icon}</div>
                            <div className="text-sm font-semibold leading-tight text-white">{item.name}</div>
                            <div className="mt-1 flex items-center justify-between text-xs text-white/55"><span>{item.meta}</span><span className="font-semibold text-white/80">{item.price}</span></div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 4: Watch on All Platforms */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#03070d] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(56,189,248,0.24),transparent_28%),linear-gradient(135deg,#02050a_0%,#04111f_45%,#020409_100%)]" />
                  <motion.div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-[120px]" animate={{ x:[0,30,0] }} transition={{ duration:10, repeat:Infinity }} />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-12">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.45 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="mb-6 flex items-center gap-3"><span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200">Cinematic everywhere</span><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">04 / 06</span></div>
                      <h2 className="text-[56px] xl:text-[74px] 2xl:text-[88px] font-black tracking-tighter text-white leading-[0.98] mb-6">One platform.<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-300 to-cyan-200">Every screen.</span></h2>
                      <p className="text-lg xl:text-xl text-white/70 leading-relaxed font-medium max-w-2xl mb-8">From pocket to living room, Trooflix keeps playback smooth and beautiful. Watch on phone, desktop, Smart TV, or Fire Stick with a premium, zero-buffer feel.</p>
                      <div className="mb-10 flex flex-wrap gap-3">{['Phone','Desktop','Smart TV','Fire Stick'].map(t=>(<span key={t} className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-50/90 backdrop-blur-md">{t}</span>))}</div>
                      <a href="/tv" className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(14,165,233,0.35),0_0_30px_rgba(56,189,248,0.25)] transition hover:scale-[1.02] hover:bg-sky-400"><Tv size={18} /> Cast to TV</a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[54%] justify-center relative" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="relative w-full max-w-[620px] h-[430px]">
                        <motion.div className="absolute left-8 top-4 right-16 h-[305px] rounded-[30px] border border-cyan-200/20 bg-gradient-to-br from-[#0b1624] to-[#050910] shadow-[0_0_90px_rgba(56,189,248,0.24),0_30px_80px_rgba(0,0,0,0.45)] overflow-hidden" animate={{ boxShadow: ['0 0 50px rgba(56,189,248,0.18),0 30px 80px rgba(0,0,0,0.45)','0 0 100px rgba(56,189,248,0.32),0 30px 80px rgba(0,0,0,0.45)','0 0 50px rgba(56,189,248,0.18),0 30px 80px rgba(0,0,0,0.45)'] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}>
                          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.2),transparent_35%,rgba(255,255,255,0.08))]" />
                          <div className="absolute inset-6 flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#10243a] via-[#0a1422] to-[#05070b]"><div className="text-center"><div className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Now Playing</div><div className="text-3xl font-black text-white">Cinematic Documentary</div><div className="mt-2 text-sm text-cyan-100/60">4K • Dolby-like clarity • Zero buffering</div></div></div>
                        </motion.div>
                        <motion.div className="absolute right-0 bottom-0 w-[155px] h-[305px] rounded-[32px] border border-white/20 bg-white/[0.08] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)] p-3" animate={{ y:[0,-10,0] }} transition={{ duration:4.2, repeat:Infinity, ease:'easeInOut' }}>
                          <div className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[#081018] p-3"><div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/45">Mini Player</div><div className="mb-3 flex-1 rounded-xl border border-white/10 bg-gradient-to-br from-sky-500/30 to-cyan-300/10" /><div className="mb-2 flex items-center justify-between text-[10px] text-white/45"><span>Phone</span><span>Synced</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-sky-400" /></div></div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 5: TrooChat */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#090616] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(168,85,247,0.3),transparent_28%),radial-gradient(circle_at_75%_70%,rgba(59,130,246,0.22),transparent_30%),linear-gradient(180deg,#090616_0%,#05040b_100%)]" />
                  <motion.div className="absolute right-[10%] top-[20%] h-72 w-72 rounded-full bg-violet-400/10 blur-[120px]" animate={{ scale:[1,1.2,1] }} transition={{ duration:9, repeat:Infinity }} />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-12">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.45 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="mb-6 flex items-center gap-3"><span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200">Real conversations</span><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">05 / 06</span></div>
                      <h2 className="text-[56px] xl:text-[74px] 2xl:text-[88px] font-black tracking-tighter text-white leading-[0.98] mb-6">Connect beyond the<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-blue-300">comment section.</span></h2>
                      <p className="text-lg xl:text-xl text-white/70 leading-relaxed font-medium max-w-2xl mb-8">Move from public replies to real relationships. TrooChat brings messaging, voice notes, and video calls into one private, creator-owned space.</p>
                      <div className="mb-10 flex flex-wrap gap-3">{['Direct messages','Voice notes','Video calls'].map(t=>(<span key={t} className="rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-50/90 backdrop-blur-md">{t}</span>))}</div>
                      <a href="/messages" className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-500 px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(139,92,246,0.35),0_0_30px_rgba(139,92,246,0.25)] transition hover:scale-[1.02] hover:bg-violet-400">Start a Conversation <ArrowRight size={18} /></a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[52%] justify-center relative" initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="relative h-[430px] w-full max-w-[520px]">
                        <motion.div className="absolute left-8 top-6 max-w-[320px] rounded-3xl rounded-bl-md border border-white/15 bg-white/[0.08] p-4 text-white/85 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl" animate={{ y:[0,-6,0] }} transition={{ duration:5, repeat:Infinity }}>Loved the new episode — when’s the next live?</motion.div>
                        <motion.div className="absolute right-6 top-28 max-w-[330px] rounded-3xl rounded-br-md border border-violet-300/20 bg-violet-500/20 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl" animate={{ y:[0,-8,0] }} transition={{ duration:4.6, repeat:Infinity, delay:0.3 }}>
                          <div className="mb-3 text-sm text-white/90">Voice message · 0:18</div>
                          <div className="flex h-8 items-end gap-1">{[8,14,22,12,26,18,10,24,16,20,12,18,22,14].map((h,idx)=>(<span key={idx} className="w-1.5 origin-bottom rounded-full bg-gradient-to-t from-violet-300 to-blue-300" style={{ height:`${h}px`, animation:`waveBar 1s ease-in-out ${idx*0.06}s infinite` }} />))}</div>
                        </motion.div>
                        <motion.div className="absolute left-16 bottom-20 max-w-[300px] rounded-3xl rounded-bl-md border border-white/15 bg-white/[0.08] p-4 text-white/85 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl" animate={{ y:[0,-5,0] }} transition={{ duration:5.4, repeat:Infinity, delay:0.5 }}>Let’s hop on a quick call and plan the drop.</motion.div>
                        <div className="absolute right-10 bottom-8"><span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" /><motion.button whileHover={{ scale:1.08 }} className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_8px_rgba(16,185,129,0.12),0_18px_40px_rgba(16,185,129,0.35)]"><Phone size={24} /></motion.button></div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Page 6: Trooflix Economy */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#090602] flex items-center">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(234,179,8,0.24),transparent_25%),radial-gradient(circle_at_70%_75%,rgba(245,158,11,0.16),transparent_30%),linear-gradient(180deg,#090602_0%,#040301_100%)]" />
                  <motion.div className="absolute left-[20%] top-[20%] h-64 w-64 rounded-full bg-amber-300/10 blur-[110px]" animate={{ y:[0,20,0], opacity:[0.5,0.8,0.5] }} transition={{ duration:8.5, repeat:Infinity }} />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 flex items-center justify-between gap-12">
                    <motion.div className="w-full lg:w-[42%] max-w-3xl" initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.45 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="mb-6 flex items-center gap-3"><span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">One connected ecosystem</span><span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">06 / 06</span></div>
                      <h2 className="text-[56px] xl:text-[74px] 2xl:text-[88px] font-black tracking-tighter text-white leading-[0.98] mb-6">The creator economy,<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-400">reimagined.</span></h2>
                      <p className="text-lg xl:text-xl text-white/70 leading-relaxed font-medium max-w-2xl mb-8">Tips, purchases, payouts, and support all flow through one native system. TrooCoins and TrooBank make the value exchange feel seamless for creators and fans.</p>
                      <div className="mb-10 grid grid-cols-3 gap-3 max-w-xl">{[{k:'Tips',v:'Instant support'},{k:'Wallet',v:'TrooBank'},{k:'Currency',v:'TrooCoins'}].map(s=>(<div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-xl"><div className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1">{s.k}</div><div className="text-base font-bold text-white">{s.v}</div></div>))}</div>
                      <a href="/wallet" className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_18px_45px_rgba(251,191,36,0.3),0_0_30px_rgba(251,191,36,0.2)] transition hover:scale-[1.02] hover:bg-amber-300">Explore TrooBank <ArrowRight size={18} /></a>
                    </motion.div>
                    <motion.div className="hidden lg:flex w-[52%] justify-center relative" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.4 }} transition={{ duration: 0.9, ease: [0.22,1,0.36,1] }}>
                      <div className="relative flex h-[430px] w-full max-w-[520px] items-center justify-center">
                        <motion.div className="absolute top-2 text-5xl drop-shadow-[0_0_24px_rgba(251,191,36,0.6)]" animate={{ y:[0,135,0], rotate:[0,12,0], scale:[1,0.95,1] }} transition={{ duration:3.8, repeat:Infinity, ease:'easeInOut' }}>🪙</motion.div>
                        <div className="absolute top-[155px] flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-200/20 bg-white/[0.06] text-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-xl"><Wallet className="text-amber-300" size={34} /></div>
                        <motion.div whileHover={{ rotateX: 8, rotateY: -10, scale: 1.03 }} className="group relative mt-24 h-[225px] w-[365px] rounded-[28px] border border-amber-200/20 bg-gradient-to-br from-[#3b2a06] via-[#1f1606] to-[#0c0904] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45),0_0_45px_rgba(251,191,36,0.14)] [transform-style:preserve-3d]">
                          <div className="absolute inset-0 rounded-[28px] bg-[linear-gradient(120deg,rgba(251,191,36,0.2),transparent_35%,rgba(255,255,255,0.08))]" />
                          <div className="relative flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="text-sm font-bold tracking-[0.22em] text-amber-200/90">TROOBANK</span><span className="h-8 w-10 rounded-md bg-gradient-to-br from-amber-200 to-yellow-500/70" /></div><div><div className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">Available Balance</div><div className="text-3xl font-black text-white group-hover:hidden">$2,480.00</div><div className="hidden text-3xl font-black text-amber-200 group-hover:block">$2,480.00 • 12,400 TC</div><div className="mt-2 text-sm text-emerald-300/90">+ $312 this week</div></div><div className="text-sm tracking-[0.22em] text-white/55">•••• •••• •••• 2048</div></div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </section>
                </div>
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

function SignedOutDesktopHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(bgRef.current, { opacity: 0, scale: 1.14 }, { opacity: 1, scale: 1.08, duration: 1.8, ease: "power2.out" }, 0);
      if (line1Ref.current) {
        const words = line1Ref.current.querySelectorAll("[data-word]");
        tl.fromTo(words, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, 0.25);
      }
      tl.fromTo(line2Ref.current, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.95 }, 0.6);
      tl.fromTo(subRef.current?.children || [], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12 }, 0.95);
      tl.fromTo(ctaRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 1.15);

      gsap.to(bgRef.current, {
        yPercent: 16,
        scale: 1.16,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(contentRef.current, {
        opacity: 0.12,
        y: -50,
        ease: "none",
        scrollTrigger: {
          trigger: rootRef.current,
          start: "top top",
          end: "75% top",
          scrub: true,
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const canvas = dustRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    const particles = Array.from({ length: 22 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.4,
      a: 0.05 + Math.random() * 0.12,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: -0.00005 - Math.random() * 0.00012,
    }));
    const resize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onMove = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -0.05) p.y = 1.05;
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        let px = p.x * w;
        let py = p.y * h;
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 90) {
          const push = (90 - dist) / 90 * 6;
          px += (dx / dist) * push;
          py += (dy / dist) * push;
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    resize();
    draw();
    window.addEventListener("resize", resize);
    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const headline = ["Stop", "letting", "Big", "Tech"];

  return (
    <div ref={rootRef} className="hidden lg:block w-full relative">
      <section className="relative h-[100vh] min-h-[100vh] w-full overflow-hidden bg-[#050505] -mt-[calc(env(safe-area-inset-top)+56px)] pt-[calc(env(safe-area-inset-top)+56px)]">
        <div ref={bgRef} className="absolute inset-[-8%] will-change-transform opacity-0">
          <img
            src="https://images.unsplash.com/photo-1474511320723-9a56873867b5?q=80&w=2400&auto=format&fit=crop"
            alt=""
            className="h-full w-full object-cover saturate-[0.55] contrast-[1.08] brightness-[0.55]"
          />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_35%,rgba(255,176,120,0.18),transparent_28%),radial-gradient(ellipse_at_70%_20%,rgba(255,255,255,0.08),transparent_22%)] mix-blend-screen opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
        <div className="absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.85)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22 viewBox=%220 0 140 140%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22140%22 height=%22140%22 filter=%22url(%23n)%22 opacity=%220.35%22/%3E%3C/svg%3E')]" />
        <canvas ref={dustRef} className="pointer-events-none absolute inset-0 z-[1]" />

        <div ref={contentRef} className="relative z-10 flex h-full items-center will-change-transform">
          <div className="w-full max-w-[1600px] px-8 xl:px-20">
            <div className="max-w-[720px] xl:max-w-[780px]">
              <h1 className="mb-8 text-[58px] font-black leading-[0.95] tracking-[-0.055em] text-white xl:text-[78px] 2xl:text-[92px]">
                <span className="block overflow-hidden">
                  <span ref={line1Ref} className="inline-flex flex-wrap gap-x-[0.28em]">
                    {headline.map((word) => (
                      <span key={word} data-word className="inline-block">{word}</span>
                    ))}
                  </span>
                </span>
                <span className="block overflow-hidden">
                  <span ref={line2Ref} className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-[#ff3b30] via-[#ff5a1f] to-[#ff8a00] drop-shadow-[0_8px_30px_rgba(255,90,31,0.18)]">
                    eat your lunch.
                  </span>
                </span>
              </h1>

              <div ref={subRef} className="mb-10 max-w-2xl space-y-4">
                <p className="text-lg leading-relaxed text-white/72 xl:text-[22px] xl:leading-[1.55] font-medium">
                  Tired of working countless hours making great content just to give half your earnings to billionaires and get censored in the process?
                </p>
                <p className="text-lg leading-relaxed text-white/72 xl:text-[22px] xl:leading-[1.55] font-medium">
                  It’s time to take your power back.
                </p>
              </div>

              <div ref={ctaRef} className="flex flex-wrap items-center gap-4">
                <motion.a
                  href="/signup"
                  whileHover={{ scale: 1.03, boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 20px 50px rgba(229,57,69,0.45), 0 0 40px rgba(255,90,31,0.25)" }}
                  whileTap={{ scale: 0.99 }}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(229,57,69,0.35)] transition"
                >
                  Start Earning 99%
                </motion.a>
                <motion.a
                  href="/features"
                  whileHover="hover"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/[0.1]"
                >
                  Why Trooflix
                  <motion.span variants={{ hover: { x: 4 } }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="inline-flex">
                    <ArrowRight size={18} />
                  </motion.span>
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
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
