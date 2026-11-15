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
import dynamic from "next/dynamic";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouter } from "next/navigation";

const HeroScene3D = dynamic(() => import("@/components/HeroScene3D"), { ssr: false });
import {  Play, Info, ChevronLeft, ChevronRight, X,
  Search, Bell, HomeIcon, Menu,
  Compass, LogOut, LogIn, Users, ShoppingBag, Sparkles, BookOpen, Flame, List,
  CheckCircle2, Pause, VolumeX, Volume2, MoreVertical, Plus, Maximize,
  ThumbsUp, MessageCircle, Share2, Bookmark , DollarSign, ShieldOff, Radio, MessageSquare, Download , Wallet , ArrowRight , Tv , Landmark, Phone, Monitor, Smartphone, Palette, Film, Eye } from "lucide-react";
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

              {/* FEATURES HEROES (DESKTOP SIGNED-OUT) */}
              <div className="hidden lg:block w-full relative">
                <style>{`
                  @keyframes waveBar { 0%,100% { transform: scaleY(0.35); opacity: .55; } 50% { transform: scaleY(1); opacity: 1; } }
                  @keyframes floatSlow { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }
                  @keyframes sheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
                `}</style>

                <div className="snap-y snap-proximity">
                <TrooflixIntroHero />
                <WatchEverywhereHero />
                {/* Page 1: Content Power / Your Voice. Unfiltered. */}
                <section className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#040406] flex items-center">
                  <HeroScene3D />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050507] to-transparent z-[2]" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050507] to-transparent z-[2]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(229,57,69,0.08),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(255,106,42,0.10),transparent_24%),linear-gradient(180deg,rgba(5,5,7,0.15)_0%,rgba(2,2,3,0.35)_100%)] z-[1]" />
                  <motion.div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-white/[0.04] blur-[120px] z-[1]" animate={{ x:[0,40,0], y:[0,-20,0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
                  <motion.div className="absolute right-[-5%] bottom-[10%] h-80 w-80 rounded-full bg-[#ff4d5a]/[0.08] blur-[130px] z-[1]" animate={{ x:[0,-30,0], y:[0,25,0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.03)_45%,transparent_70%)] opacity-60 z-[1]" />
                  <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 py-20">
                    <div className="grid grid-cols-[0.95fr_1.05fr] items-center gap-12 xl:gap-16">
                      <motion.div className="max-w-2xl" initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.35 }} variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
                        <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-white/45">CREATE WITHOUT LIMITS</motion.p>
                        <motion.h2 variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }} className="text-[56px] xl:text-[68px] 2xl:text-[78px] font-black tracking-tighter text-white leading-[0.98] mb-6">
                          Your Voice. <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">Unfiltered.</span>
                        </motion.h2>
                        <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="max-w-xl text-lg xl:text-xl text-white/65 leading-relaxed font-medium">
                          Go live in broadcast quality, drop cinematic Shorts, and publish powerful documentaries — all on one platform built to amplify creators, not silence them.
                        </motion.p>
                      </motion.div>

                      <motion.div className="flex items-center justify-center gap-6" initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.3 }} variants={{ visible: { transition: { staggerChildren: 0.14 } } }}>
                        {/* Shorts */}
                        <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }} className="flex flex-col items-center shrink-0">
                          <motion.div whileHover={{ y: -8, boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(255,255,255,0.08)' }} className="group relative w-[280px] xl:w-[300px] overflow-hidden rounded-[34px] border border-white/12 bg-[#0b0b10]/80 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition cursor-pointer p-3">
                            <div className="relative mx-auto aspect-[9/16] overflow-hidden rounded-[26px] border border-white/10 bg-[#050507]">
                              <HeroLatestShortPhone />
                            </div>
                          </motion.div>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Shorts</p>
                        </motion.div>

                        <div className="flex flex-col gap-5 w-full max-w-[320px]">
                          {/* Livestream */}
                          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }} className="flex flex-col items-center">
                            <motion.div whileHover={{ y: -6, boxShadow: '0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 30px rgba(239,68,68,0.12)' }} className="group relative w-full overflow-hidden rounded-[24px] border border-white/12 bg-[#0b0b10]/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition cursor-pointer">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.18),transparent_30%),linear-gradient(180deg,#15151d_0%,#09090d_100%)]" />
                              <div className="relative p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70"></span><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]"></span></span>
                                    <span className="rounded-full border border-red-400/40 bg-red-500/15 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-red-200">LIVE</span>
                                  </div>
                                  <span className="text-xs text-white/55 font-medium">8.2k watching</span>
                                </div>
                                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#201018] via-[#120d14] to-[#070709]">
                                  <img src="/20240503-podcast-studio-with-armando-108-3.jpg.webp" alt="Live podcast studio" className="absolute inset-0 h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_70%_70%,rgba(239,68,68,0.18),transparent_35%)]" />
                                  <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-white/70">Broadcast Studio</div>
                                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-semibold text-white">Live Session</div>
                                      <div className="text-[11px] text-white/50">Studio quality</div>
                                    </div>
                                    <div className="flex items-end gap-1 h-7">
                                      {[7,13,18,10,22,14,9,16,12].map((h,idx)=>(
                                        <span key={idx} className="w-1 rounded-full bg-gradient-to-t from-red-400 to-orange-300 origin-bottom" style={{ height:`${h}px`, animation:`waveBar 1s ease-in-out ${idx*0.08}s infinite` }} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Livestream</p>
                          </motion.div>

                          {/* Documentaries */}
                          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22,1,0.36,1] } } }} className="flex flex-col items-center">
                            <motion.div whileHover={{ y: -6, boxShadow: '0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 30px rgba(229,57,69,0.10)' }} className="group relative w-full overflow-hidden rounded-[24px] border border-white/12 bg-[#0b0b10]/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition cursor-pointer">
                              <div className="relative aspect-[16/10] overflow-hidden">
                                <motion.div className="absolute inset-[-6%]" animate={{ scale: [1.02, 1.08, 1.02], x: [0, -12, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}>
                                  <img src="https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1800&auto=format&fit=crop" alt="" className="h-full w-full object-cover brightness-[0.7] contrast-[1.05] saturate-[0.85]" />
                                </motion.div>
                                <div className="absolute inset-x-0 top-0 h-[14%] bg-black/85" />
                                <div className="absolute inset-x-0 bottom-0 h-[14%] bg-black/85" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
                                <div className="absolute left-4 bottom-[18%]">
                                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#ffb0a8]/80 mb-1">Original Documentary</div>
                                  <div className="text-lg font-black tracking-tight text-white">The Untold Signal</div>
                                </div>
                              </div>
                            </motion.div>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Documentaries</p>
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </section>

                <MonetizationHero />

                <TrooflixEconomyHero />

                <TrooChatHero />

                <CreatorEconomicsHero />
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

function MobileSectionShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative overflow-hidden bg-[#050507] px-5 py-14 ${className}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#050507] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050507] to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-md">{children}</div>
    </section>
  );
}

function MobileSignedOutShowcase() {
  const [revenue, setRevenue] = useState(10000);
  const trooflixKeep = Math.round(revenue * 0.99);
  const oldKeep = Math.round(revenue * 0.55);
  const streams = [
    { label: "Subscriptions", value: "$4,280" },
    { label: "Tips & Gifts", value: "$1,140" },
    { label: "Merchandise", value: "$2,060" },
    { label: "Paid Communities", value: "$980" },
    { label: "Ticketed Events", value: "$760" },
  ];

  return (
    <div className="relative w-full bg-[#050507]">
      <style>{`
        @keyframes waveBar { 0%,100% { transform: scaleY(0.35); opacity: .55; } 50% { transform: scaleY(1); opacity: 1; } }
      `}</style>

      {/* 1. Intro / What is Trooflix */}
      <section className="relative min-h-[92svh] overflow-hidden bg-[#040406] px-5 pt-8 pb-14 flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(229,57,69,0.22),transparent_28%),radial-gradient(circle_at_85%_30%,rgba(255,106,42,0.18),transparent_26%),radial-gradient(circle_at_50%_85%,rgba(229,57,69,0.12),transparent_32%)]" />
        <motion.div className="absolute -left-16 top-20 h-56 w-56 rounded-full bg-[#ff4d5a]/12 blur-[90px]" animate={{ y: [0, -16, 0], opacity: [0.35, 0.55, 0.35] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -right-10 bottom-24 h-56 w-56 rounded-full bg-[#ff6a2a]/12 blur-[90px]" animate={{ y: [0, 14, 0], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
        <div className="relative z-10 mx-auto w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-[#ff4d5a] shadow-[0_0_12px_rgba(229,57,69,0.9)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">What is Trooflix</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }} className="text-[44px] leading-[0.94] font-black tracking-[-0.05em] text-white mb-5">
            The <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">creator-owned</span> home for your content.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-[16px] leading-relaxed text-white/68 mb-7">
            Trooflix is where you go live, post Shorts, publish documentaries, build community, and get paid directly — while keeping <span className="text-white font-semibold">99%</span> of what you earn.
          </motion.p>
          <div className="grid grid-cols-2 gap-2.5 mb-7">
            {[
              { k: "Create", v: "Live, Shorts & Docs" },
              { k: "Earn", v: "Keep 99%" },
              { k: "Connect", v: "TrooChat & community" },
              { k: "Own", v: "TrooBank & TrooCoins" },
            ].map((item, i) => (
              <motion.div key={item.k} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.05 }} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-xl">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffb0a8]/80 mb-1">{item.k}</div>
                <div className="text-sm font-semibold text-white leading-snug">{item.v}</div>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex gap-2.5">
            <a href="/signup" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_18px_40px_rgba(229,57,69,0.35)]">Start Creating <ArrowRight size={16} /></a>
            <a href="/features" className="flex-1 inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-[15px] font-semibold text-white/90 backdrop-blur-xl">Why Trooflix</a>
          </motion.div>
        </div>
      </section>

      {/* 2. Your Voice Unfiltered */}
      <MobileSectionShell className="bg-[#040406]">
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">CREATE WITHOUT LIMITS</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="text-[38px] leading-[0.98] font-black tracking-tighter text-white mb-4">Your Voice. <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">Unfiltered.</span></motion.h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="text-[15px] leading-relaxed text-white/65 mb-7">Go live in broadcast quality, drop cinematic Shorts, and publish powerful documentaries — all on one platform built to amplify creators, not silence them.</motion.p>
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="flex items-start gap-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <div className="w-[132px] shrink-0">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] border border-white/10 bg-[#050507] p-1.5">
                <div className="relative h-full w-full overflow-hidden rounded-[18px]"><HeroLatestShortPhone /></div>
              </div>
              <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Shorts</p>
            </div>
            <div className="flex-1 space-y-3 pt-1">
              <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                <div className="relative aspect-[16/10]">
                  <img src="/20240503-podcast-studio-with-armando-108-3.jpg.webp" alt="Live podcast studio" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/20 px-2 py-1"><span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" /><span className="text-[9px] font-black tracking-[0.14em] text-red-100">LIVE</span></div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between"><div><div className="text-xs font-semibold text-white">Live Session</div><div className="text-[10px] text-white/60">Studio quality</div></div><div className="flex items-end gap-0.5 h-5">{[6,10,14,8,16,11,7].map((h,idx)=>(<span key={idx} className="w-1 rounded-full bg-gradient-to-t from-red-400 to-orange-300 origin-bottom" style={{ height:`${h}px`, animation:`waveBar 1s ease-in-out ${idx*0.08}s infinite` }} />))}</div></div>
                </div>
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Livestream</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                <div className="relative aspect-[16/10]">
                  <motion.img src="https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1200&auto=format&fit=crop" alt="" className="absolute inset-0 h-full w-full object-cover brightness-[0.72]" animate={{ scale: [1.02, 1.06, 1.02] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
                  <div className="absolute inset-x-0 top-0 h-[14%] bg-black/80" /><div className="absolute inset-x-0 bottom-0 h-[14%] bg-black/80" />
                  <div className="absolute left-3 bottom-[18%]"><div className="text-[9px] uppercase tracking-[0.18em] text-[#ffb0a8]/80 mb-0.5">Original Documentary</div><div className="text-sm font-black text-white">The Untold Signal</div></div>
                </div>
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">Documentaries</div>
              </div>
            </div>
          </motion.div>
        </div>
      </MobileSectionShell>

      {/* 3. Monetization */}
      <MobileSectionShell>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(229,57,69,0.16),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(255,106,42,0.10),transparent_28%)]" />
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">MONETIZATION</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[38px] leading-[0.98] font-black tracking-tighter text-white mb-4">Turn your audience <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">into a business.</span></motion.h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[15px] leading-relaxed text-white/65 mb-6">Subscriptions. Tips. Merchandise. Paid communities. One platform where every dollar flows directly to you — with only a 1% fee.</motion.p>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl mb-4">
          <div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[0.16em] text-white/40 mb-1">Creator Dashboard</div><div className="text-base font-semibold text-white">Earnings overview</div></div><span className="rounded-full border border-[#ff6b4a]/30 bg-[#E53945]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#ffb0a8]">Live</span></div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{l:"Total",v:"$24,860"},{l:"Subs",v:"3,482"},{l:"Payout",v:"$2,140"}].map(x=>(<div key={x.l} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"><div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1">{x.l}</div><div className="text-lg font-black text-white leading-none">{x.v}</div></div>))}
          </div>
          <div className="space-y-2.5">{[{l:'Subscriptions',w:'72%'},{l:'Merchandise',w:'38%'},{l:'Tips & Gifts',w:'24%'}].map(row=>(<div key={row.l}><div className="mb-1 flex justify-between text-[11px] text-white/50"><span>{row.l}</span><span>{row.w}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><motion.div initial={{width:0}} whileInView={{width:row.w}} viewport={{once:true}} transition={{duration:0.8}} className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a]" /></div></div>))}</div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">{streams.map(s=>(<span key={s.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80"><span className="text-[#ff8a6a]">{s.value}</span>{s.label}</span>))}</div>
        <a href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_18px_40px_rgba(229,57,69,0.3)]">Start Building Your Business <ArrowRight size={16} /></a>
      </MobileSectionShell>

      {/* 4. Trooflix Economy */}
      <MobileSectionShell className="bg-[#050405]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(229,57,69,0.18),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(255,106,42,0.14),transparent_28%)]" />
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Trooflix Economy</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[38px] leading-[0.98] font-black tracking-tighter text-white mb-4">The creator economy, <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">reimagined.</span></motion.h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[15px] leading-relaxed text-white/62 mb-6">Tips, purchases, payouts, and support — connected in one native system. TrooCoins and TrooBank make value flow simply between creators and their audience.</motion.p>
        <div className="relative rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl overflow-hidden mb-5">
          <motion.div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ff6a2a]/12 blur-3xl" animate={{ scale:[1,1.15,1], opacity:[0.4,0.7,0.4] }} transition={{ duration: 6, repeat: Infinity }} />
          {["TC","TC","TC"].map((t,i)=>(<motion.div key={i} className="absolute flex items-center justify-center rounded-full border border-[#ffb38a]/30 bg-gradient-to-br from-[#ffcf8a]/30 to-[#E53945]/20 text-[9px] font-black text-[#ffe8d6] shadow-[0_0_20px_rgba(255,106,42,0.2)]" style={{width:26+i*6,height:26+i*6,right:18+i*22,top:18+i*14}} animate={{y:[0,-8,0], rotate:[0,10,-6,0]}} transition={{duration:4+i, repeat:Infinity, ease:"easeInOut", delay:i*0.3}}>{t}</motion.div>))}
          <div className="relative flex items-center justify-between mb-4"><div><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">TrooBank</div><div className="text-sm text-white/55">Creator wallet</div></div><span className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-3 py-1 text-xs font-semibold text-[#ffb0a8]">Active</span></div>
          <div className="relative rounded-[22px] border border-[#ff6b4a]/20 bg-gradient-to-br from-[#2a1214] via-[#17090a] to-[#0b0606] p-5 overflow-hidden mb-3">
            <motion.div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{x:["0%","420%"]}} transition={{duration:4.5, repeat:Infinity, ease:"easeInOut", repeatDelay:1.2}} />
            <div className="mb-6 flex items-center justify-between relative"><span className="text-sm font-bold tracking-[0.22em] text-[#ffd6cf]/85">TROOBANK</span><span className="h-7 w-9 rounded-md bg-gradient-to-br from-[#ffb0a8] to-[#ff6a2a]" /></div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-1 relative">Available Balance</div>
            <div className="text-3xl font-black tracking-tight text-white relative">$2,480.00</div>
            <div className="mt-1.5 text-sm text-[#ffb0a8]/85 relative">12,400 TrooCoins</div>
          </div>
          <div className="grid grid-cols-3 gap-2">{[{l:"Tip",v:"+$24"},{l:"Merch",v:"+$86"},{l:"Payout",v:"Ready"}].map(i=>(<div key={i.l} className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2.5"><div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">{i.l}</div><div className="text-sm font-semibold text-white/85">{i.v}</div></div>))}</div>
        </div>
        <div className="flex flex-wrap gap-2">{["TrooCoins","TrooBank","Instant tips","Seamless payouts"].map(t=>(<span key={t} className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-3.5 py-2 text-xs font-medium text-white/90">{t}</span>))}</div>
      </MobileSectionShell>

      {/* 5. TrooChat */}
      <MobileSectionShell className="bg-[#060407]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(229,57,69,0.18),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(255,106,42,0.12),transparent_28%)]" />
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">TrooChat</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[38px] leading-[0.98] font-black tracking-tighter text-white mb-4">Connect beyond the <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">comment section.</span></motion.h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[15px] leading-relaxed text-white/62 mb-6">Move from public replies to real relationships. Messages, voice notes, and calls — in one private, creator-owned space, without algorithms in the middle.</motion.p>
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl mb-5 overflow-hidden relative">
          <motion.div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#ff4d5a]/10 blur-2xl" animate={{scale:[1,1.2,1],opacity:[0.3,0.5,0.3]}} transition={{duration:6,repeat:Infinity}} />
          <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3 relative"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#E53945] to-[#ff6a2a]" /><div><div className="text-sm font-semibold text-white">Creator Circle</div><div className="text-xs text-white/40">active now</div></div></div><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 text-[#ffb0a8]"><Phone size={14} /></div></div>
          <div className="space-y-3 relative">
            <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80">Loved the new episode — when’s the next live?</div>
            <div className="ml-auto max-w-[86%] rounded-3xl rounded-br-md border border-[#ff6b4a]/25 bg-gradient-to-br from-[#E53945]/25 to-[#ff6a2a]/20 px-4 py-3 text-sm text-white"><div className="mb-2 text-white/70 text-xs">Voice message · 0:18</div><div className="flex h-6 items-end gap-1">{[7,12,18,10,20,14,9,18,13,16].map((h,idx)=>(<span key={idx} className="w-1.5 origin-bottom rounded-full bg-gradient-to-t from-[#ff6b4a] to-[#ffb0a8]" style={{height:`${h}px`, animation:`waveBar 1s ease-in-out ${idx*0.06}s infinite`}} />))}</div></div>
            <div className="max-w-[78%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80">Let’s hop on a quick call and plan the drop.</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{["Direct messages","Voice notes","Video calls","Private & direct"].map(t=>(<span key={t} className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-3.5 py-2 text-xs font-medium text-white/90">{t}</span>))}</div>
      </MobileSectionShell>

      {/* 6. Creator Economics */}
      <MobileSectionShell className="bg-[#080405]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(229,57,69,0.2),transparent_30%),radial-gradient(circle_at_20%_75%,rgba(255,106,42,0.12),transparent_28%)]" />
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffb0a8]/70">CREATOR-FIRST ECONOMICS</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[38px] leading-[0.98] font-black tracking-tighter text-white mb-4">Stop letting big tech <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">eat your lunch.</span></motion.h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[15px] leading-relaxed text-white/65 mb-5">Legacy platforms can take nearly half. Trooflix flips the model: keep 99% with a flat 1% fee. No surprise cuts. No algorithm tax.</motion.p>
        <div className="mb-4 flex items-center justify-center py-2"><motion.div animate={{ textShadow: ["0 0 30px rgba(229,57,69,0.25)", "0 0 60px rgba(255,106,42,0.35)", "0 0 30px rgba(229,57,69,0.25)"] }} transition={{ duration: 4, repeat: Infinity }} className="text-[96px] font-black leading-none tracking-tighter text-white">99%</motion.div></div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-[22px] border border-[#ff6b4a]/20 bg-white/[0.06] p-4 backdrop-blur-xl"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffb0a8] mb-1">Trooflix</div><div className="text-2xl font-black text-[#ff7a5c]">${trooflixKeep.toLocaleString()}</div><div className="mt-1 text-xs text-white/55">On ${revenue.toLocaleString()}</div></div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 opacity-80"><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 mb-1">Old Model</div><div className="text-2xl font-black text-white/45">${oldKeep.toLocaleString()}</div><div className="mt-1 text-xs text-white/40">On ${revenue.toLocaleString()}</div></div>
        </div>
        <div className="mb-5 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-white/80">Earnings calculator</span><span className="text-xs text-[#ff8a6a] font-semibold">+${(trooflixKeep - oldKeep).toLocaleString()}</span></div>
          <input type="range" min={1000} max={100000} step={500} value={revenue} onChange={(e)=>setRevenue(Number(e.target.value))} className="w-full accent-[#E53945]" />
          <div className="mt-2 text-sm text-white/55">${revenue.toLocaleString()} / month</div>
        </div>
        <a href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_18px_40px_rgba(229,57,69,0.3)]">Calculate Your Earnings <ArrowRight size={16} /></a>
      </MobileSectionShell>

      {/* 7. Watch Everywhere */}
      <MobileSectionShell className="pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(229,57,69,0.14),transparent_30%),radial-gradient(circle_at_80%_25%,rgba(255,140,60,0.10),transparent_26%)]" />
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Watch everywhere</motion.p>
        <motion.h2 initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[38px] leading-[0.98] font-black tracking-tighter text-white mb-4">One platform. <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">Every screen.</span></motion.h2>
        <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} className="text-[15px] leading-relaxed text-white/60 mb-6">Pick up where you left off on phone, desktop, or TV. A seamless, cinematic experience — wherever you watch.</motion.p>
        <div className="relative h-[300px] mb-5">
          <div className="absolute left-1/2 top-0 w-[92%] -translate-x-1/2 rounded-[20px] border border-white/10 bg-white/[0.04] p-2 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[14px] bg-[#0b0b0e]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_30%,rgba(229,57,69,0.16),transparent_35%),linear-gradient(180deg,#1a1a20_0%,#0b0b0e_100%)]" />
              <div className="absolute left-4 top-4"><div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-[#ff4d5a]" /> Now Playing</div><div className="text-sm font-black text-white">Cinematic Documentary</div></div>
              <div className="absolute inset-x-4 bottom-4 h-[2px] rounded-full bg-white/10 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{width:["30%","68%","30%"]}} transition={{duration:8, repeat:Infinity, ease:"easeInOut"}} /></div>
            </div>
          </div>
          <div className="absolute left-2 bottom-2 w-[44%] rounded-t-[14px] border border-white/10 border-b-0 bg-white/[0.04] p-1.5"><div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-[#0b0b0e]"><div className="absolute inset-0 bg-[linear-gradient(180deg,#17171c_0%,#0b0b0e_100%)]" /><div className="absolute left-2.5 top-2.5 text-[9px] text-white/55">Desktop</div><div className="absolute inset-x-2.5 bottom-2.5 h-[2px] rounded-full bg-white/10 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{width:["30%","68%","30%"]}} transition={{duration:8, repeat:Infinity, ease:"easeInOut"}} /></div></div><div className="h-2 rounded-b-[10px] bg-gradient-to-b from-[#242428] to-[#121215]" /></div>
          <div className="absolute right-6 bottom-0 w-[72px] rounded-[22px] border border-white/12 bg-white/[0.05] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"><div className="relative aspect-[9/19.5] overflow-hidden rounded-[18px] bg-[#0b0b0e]"><div className="absolute inset-0 bg-[linear-gradient(180deg,#17171c_0%,#0b0b0e_100%)]" /><div className="absolute left-1/2 top-1 h-3 w-9 -translate-x-1/2 rounded-full bg-black/85" /><div className="absolute inset-x-2 top-7 text-[8px] text-white/50 text-center">Phone</div><div className="absolute inset-x-2 bottom-4 h-[2px] rounded-full bg-white/10 overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{width:["30%","68%","30%"]}} transition={{duration:8, repeat:Infinity, ease:"easeInOut"}} /></div></div></div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">{["Phone","Desktop","Smart TV","Fire Stick"].map(item=>(<span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-white/55">{item}</span>))}</div>
      </MobileSectionShell>
    </div>
  );
}

function TrooflixEconomyHero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });
  const coins = [
    { x: "8%", y: "18%", s: 34, d: 0, dur: 6.5 },
    { x: "18%", y: "70%", s: 26, d: 0.8, dur: 7.2 },
    { x: "82%", y: "22%", s: 30, d: 0.4, dur: 6.8 },
    { x: "74%", y: "72%", s: 22, d: 1.2, dur: 7.8 },
    { x: "50%", y: "10%", s: 20, d: 0.6, dur: 5.8 },
    { x: "90%", y: "46%", s: 18, d: 1.6, dur: 6.2 },
  ];

  return (
    <section ref={ref} className="relative hidden min-h-[100svh] w-full snap-start overflow-hidden bg-[#050405] lg:flex items-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050507] to-transparent z-[2]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050507] to-transparent z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_30%,rgba(229,57,69,0.18),transparent_24%),radial-gradient(circle_at_70%_70%,rgba(255,106,42,0.14),transparent_22%),linear-gradient(180deg,#060506_0%,#020203_100%)]" />
      <motion.div className="absolute right-[15%] top-[18%] h-72 w-72 rounded-full bg-[#ff4d5a]/10 blur-[130px]" animate={{ y: [0, -18, 0], opacity: [0.35, 0.6, 0.35], scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute left-[10%] bottom-[15%] h-64 w-64 rounded-full bg-[#ff6a2a]/10 blur-[120px]" animate={{ y: [0, 16, 0], opacity: [0.25, 0.45, 0.25] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      {coins.map((c, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute z-[1] flex items-center justify-center rounded-full border border-[#ffb38a]/30 bg-gradient-to-br from-[#ffcf8a]/30 via-[#ff7a4a]/25 to-[#E53945]/20 text-[10px] font-black text-[#ffe8d6] shadow-[0_0_24px_rgba(255,106,42,0.22),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm"
          style={{ left: c.x, top: c.y, width: c.s, height: c.s }}
          animate={{ y: [0, -18 - (i % 3) * 6, 0], x: [0, i % 2 ? 8 : -8, 0], rotate: [0, 12, -8, 0], scale: [1, 1.08, 1], opacity: [0.55, 0.95, 0.55] }}
          transition={{ duration: c.dur, delay: c.d, repeat: Infinity, ease: "easeInOut" }}
        >
          TC
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-[1.05fr_0.95fr] items-center gap-14 px-8 xl:px-16">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="relative flex h-[520px] items-center justify-center">
          <div className="pointer-events-none absolute inset-0">
            <motion.div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff6b4a]/10" animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff6b4a]/15 border-dashed" animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
          </div>
          <div className="relative w-full max-w-[520px]">
            <motion.div animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-4 right-8 flex h-16 w-16 items-center justify-center rounded-full border border-[#ffb38a]/35 bg-gradient-to-br from-[#ffcf8a]/35 via-[#ff7a4a]/30 to-[#E53945]/25 text-sm font-black text-[#ffe8d6] shadow-[0_0_40px_rgba(255,106,42,0.28)] backdrop-blur-xl">TC</motion.div>
            <motion.div animate={{ y: [0, 10, 0], rotate: [0, -10, 0] }} transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} className="absolute -bottom-2 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#ffb38a]/30 bg-gradient-to-br from-[#ffcf8a]/25 to-[#E53945]/20 text-[10px] font-black text-[#ffe8d6] shadow-[0_0_28px_rgba(255,106,42,0.22)] backdrop-blur-xl">TC</motion.div>
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl relative overflow-hidden">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ff6a2a]/10 blur-3xl" />
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">TrooBank</div>
                  <div className="mt-1 text-sm text-white/55">Creator wallet</div>
                </div>
                <motion.div className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-3 py-1 text-xs font-semibold text-[#ffb0a8]" animate={{ boxShadow: ["0 0 0 rgba(229,57,69,0)", "0 0 18px rgba(229,57,69,0.25)", "0 0 0 rgba(229,57,69,0)"] }} transition={{ duration: 2.4, repeat: Infinity }}>Active</motion.div>
              </div>
              <div className="mb-6 rounded-[24px] border border-[#ff6b4a]/20 bg-gradient-to-br from-[#2a1214] via-[#17090a] to-[#0b0606] p-6 relative overflow-hidden">
                <motion.div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{ x: ["0%", "420%"] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }} />
                <div className="mb-8 flex items-center justify-between relative"><span className="text-sm font-bold tracking-[0.22em] text-[#ffd6cf]/85">TROOBANK</span><span className="h-8 w-10 rounded-md bg-gradient-to-br from-[#ffb0a8] to-[#ff6a2a]" /></div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1 relative">Available Balance</div>
                <motion.div className="text-4xl font-black tracking-tight text-white relative" animate={{ textShadow: ["0 0 0 rgba(255,106,42,0)", "0 0 24px rgba(255,106,42,0.18)", "0 0 0 rgba(255,106,42,0)"] }} transition={{ duration: 3, repeat: Infinity }}>$2,480.00</motion.div>
                <div className="mt-2 flex items-center gap-2 text-sm text-[#ffb0a8]/85 relative">
                  <motion.span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#ffb38a]/30 bg-[#ff6a2a]/15 text-[9px] font-black" animate={{ rotateY: [0, 180, 360] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>TC</motion.span>
                  12,400 TrooCoins
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{l:"Tip received",v:"+$24"},{l:"Merch sale",v:"+$86"},{l:"Payout",v:"Ready"}].map((i, idx)=>(
                  <motion.div key={i.l} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3" animate={{ y: [0, -3, 0] }} transition={{ duration: 3.5 + idx, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/35 mb-1">{i.l}</div>
                    <div className="text-sm font-semibold text-white/85">{i.v}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-3xl">
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-white/40">Trooflix Economy</motion.p>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.85 } } }} className="mb-7 text-[56px] font-black leading-[0.96] tracking-tighter text-white xl:text-[74px] 2xl:text-[88px]">
            The creator economy,<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">reimagined.</span>
          </motion.h2>
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-8 max-w-2xl text-lg font-medium leading-relaxed text-white/60 xl:text-xl">
            Tips, purchases, payouts, and support — connected in one native system. TrooCoins and TrooBank make value flow simply between creators and their audience.
          </motion.p>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-10 flex flex-wrap gap-3">
            {["TrooCoins", "TrooBank", "Instant tips", "Seamless payouts"].map((t, i) => (
              <motion.span key={t} className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md" animate={{ y: [0, -2, 0] }} transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}>{t}</motion.span>
            ))}
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

function TrooChatHero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });

  return (
    <section ref={ref} className="relative hidden min-h-[100svh] w-full snap-start overflow-hidden bg-[#060407] lg:flex items-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent z-[1]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(229,57,69,0.18),transparent_26%),radial-gradient(circle_at_75%_65%,rgba(255,106,42,0.14),transparent_24%),linear-gradient(180deg,#060405_0%,#030203_100%)]" />
      <motion.div className="absolute left-[12%] top-[18%] h-72 w-72 rounded-full bg-[#ff4d5a]/10 blur-[130px]" animate={{ x: [0, 20, 0], y: [0, -18, 0], scale: [1, 1.08, 1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute right-[18%] bottom-[20%] h-64 w-64 rounded-full bg-[#ff6a2a]/10 blur-[120px]" animate={{ y: [0, -16, 0], opacity: [0.25, 0.45, 0.25] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-[0.95fr_1.05fr] items-center gap-14 px-8 xl:px-16">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-3xl">
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-white/40">TrooChat</motion.p>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.85 } } }} className="mb-7 text-[56px] font-black leading-[0.96] tracking-tighter text-white xl:text-[74px] 2xl:text-[88px]">
            Connect beyond the<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">comment section.</span>
          </motion.h2>
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-8 max-w-2xl text-lg font-medium leading-relaxed text-white/60 xl:text-xl">
            Move from public replies to real relationships. Messages, voice notes, and calls — in one private, creator-owned space, without algorithms in the middle.
          </motion.p>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-10 flex flex-wrap gap-3">
            {["Direct messages", "Voice notes", "Video calls", "Private & direct"].map((t) => (
              <span key={t} className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md">{t}</span>
            ))}
          </motion.div>

        </motion.div>

        <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="relative flex h-[500px] items-center justify-center">
          <div className="relative w-full max-w-[520px]">
            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl relative overflow-hidden">
              <motion.div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#ff4d5a]/10 blur-3xl" animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 6, repeat: Infinity }} />
              <div className="mb-5 flex items-center justify-between border-b border-white/8 pb-4 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#E53945] to-[#ff6a2a] shadow-[0_0_20px_rgba(229,57,69,0.35)]" />
                  <div>
                    <div className="text-sm font-semibold text-white">Creator Circle</div>
                    <div className="text-xs text-white/40">3 members · active now</div>
                  </div>
                </div>
                <motion.div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 text-[#ffb0a8]" animate={{ boxShadow: ["0 0 0 rgba(229,57,69,0)", "0 0 18px rgba(229,57,69,0.3)", "0 0 0 rgba(229,57,69,0)"] }} transition={{ duration: 2.2, repeat: Infinity }}><Phone size={16} /></motion.div>
              </div>
              <div className="space-y-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 }} className="max-w-[75%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80">Loved the new episode — when’s the next live?</motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.45 }} className="ml-auto max-w-[78%] rounded-3xl rounded-br-md border border-[#ff6b4a]/25 bg-gradient-to-br from-[#E53945]/25 to-[#ff6a2a]/20 px-4 py-3 text-sm text-white">
                  <div className="mb-2 text-white/70 text-xs">Voice message · 0:18</div>
                  <div className="flex h-7 items-end gap-1">{[8,14,22,12,26,18,10,24,16,20,12,18].map((h,idx)=>(<span key={idx} className="w-1.5 origin-bottom rounded-full bg-gradient-to-t from-[#ff6b4a] to-[#ffb0a8]" style={{ height:`${h}px`, animation:`waveBar 1s ease-in-out ${idx*0.06}s infinite` }} />))}</div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6 }} className="max-w-[70%] rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80">Let’s hop on a quick call and plan the drop.</motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WatchEverywhereHero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });

  return (
    <section ref={ref} className="relative hidden min-h-[100svh] w-full snap-start overflow-hidden bg-[#050507] lg:flex items-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050507] to-transparent z-[2]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050507] to-transparent z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_40%,rgba(229,57,69,0.14),transparent_26%),radial-gradient(circle_at_80%_30%,rgba(255,140,60,0.12),transparent_24%),linear-gradient(180deg,#050507_0%,#020203_100%)]" />
      <motion.div className="absolute left-[20%] top-[25%] h-64 w-64 rounded-full bg-[#ff4d5a]/10 blur-[120px]" animate={{ x: [0, 20, 0], y: [0, -12, 0], opacity: [0.25, 0.45, 0.25] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="pointer-events-none absolute left-[35%] top-1/2 h-px w-[30%] bg-gradient-to-r from-[#E53945]/0 via-[#ff6b4a]/40 to-[#ff6a2a]/0" animate={{ opacity: [0.15, 0.5, 0.15], scaleX: [0.9, 1.05, 0.9] }} transition={{ duration: 4, repeat: Infinity }} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-[1.05fr_0.95fr] items-center gap-12 px-8 xl:px-16">
        <motion.div
          initial={{ opacity: 0, x: -30, y: 10 }}
          animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center justify-center"
        >
          <div className="relative h-[420px] w-full max-w-[620px]">
            {/* TV */}
            <div className="absolute left-1/2 top-0 w-[460px] -translate-x-1/2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-2.5 shadow-[0_40px_120px_rgba(0,0,0,0.6),0_0_0_1px_rgba(229,57,69,0.06)] backdrop-blur-xl">
                <div className="relative aspect-[16/9] overflow-hidden rounded-[16px] bg-[#0b0b0e]">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#1a1a20_0%,#0b0b0e_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_30%,rgba(229,57,69,0.16),transparent_35%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.05),transparent_35%)]" />
                  <div className="absolute left-5 top-5">
                    <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60 backdrop-blur-md"><span className="h-1.5 w-1.5 rounded-full bg-[#ff4d5a]" /> Now Playing</div>
                    <div className="text-xl font-black tracking-[-0.03em] text-white">Cinematic Documentary</div>
                    <div className="mt-0.5 text-xs text-white/45">Continue watching on your TV</div>
                  </div>
                  <div className="absolute inset-x-6 bottom-5">
                    <div className="h-[2px] rounded-full bg-white/10 overflow-hidden">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{ width: ["30%", "68%", "30%"] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mx-auto mt-2 h-5 w-24 rounded-b-[12px] bg-gradient-to-b from-[#1a1a1e] to-[#0d0d10]" />
            </div>

            {/* Laptop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-[2%] bottom-0 w-[240px]"
            >
              <div className="rounded-t-[18px] border border-white/10 border-b-0 bg-white/[0.04] p-2 backdrop-blur-xl">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-[#0b0b0e]">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#17171c_0%,#0b0b0e_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(229,57,69,0.12),transparent_40%)]" />
                  <div className="absolute left-4 top-4 text-[10px] font-medium text-white/55">Continue on desktop</div>
                  <div className="absolute inset-x-4 bottom-4 h-[2px] rounded-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{ width: ["30%", "68%", "30%"] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
                  </div>
                </div>
              </div>
              <div className="h-2.5 rounded-b-[12px] bg-gradient-to-b from-[#242428] to-[#121215]" />
            </motion.div>

            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-[6%] bottom-1 w-[110px]"
            >
              <div className="rounded-[28px] border border-white/12 bg-white/[0.05] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="relative aspect-[9/19.5] overflow-hidden rounded-[22px] bg-[#0b0b0e]">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#17171c_0%,#0b0b0e_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(229,57,69,0.14),transparent_45%)]" />
                  <div className="absolute left-1/2 top-1.5 h-4 w-14 -translate-x-1/2 rounded-full bg-black/85" />
                  <div className="absolute inset-x-3 top-10 text-[9px] font-medium text-white/50 text-center leading-tight">Pick up on phone</div>
                  <div className="absolute inset-x-3 bottom-6 h-[2px] rounded-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#E53945] to-[#ff8a3d]" animate={{ width: ["30%", "68%", "30%"] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.45 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2.5 text-sm"
          >
            {["Phone", "Desktop", "Smart TV", "Fire Stick"].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-white/45">{item}</span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30, y: 10 }}
          animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.32em] text-white/40">Watch everywhere</p>
          <h2 className="text-[56px] font-black leading-[0.98] tracking-[-0.05em] text-white xl:text-[74px] 2xl:text-[88px]">
            One platform.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">Every screen.</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg xl:text-xl leading-relaxed text-white/55 font-medium">
            Pick up where you left off on phone, desktop, or TV.
            <br className="hidden xl:block" />
            A seamless, cinematic experience — wherever you watch.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function MonetizationHero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });

  const streams = [
    { label: "Subscriptions", meta: "Recurring", value: "$4,280", icon: "◷" },
    { label: "Tips & Gifts", meta: "Live + posts", value: "$1,140", icon: "✦" },
    { label: "Merchandise", meta: "Storefront", value: "$2,060", icon: "▣" },
    { label: "Paid Communities", meta: "Members", value: "$980", icon: "◎" },
    { label: "Live Ticketed Events", meta: "Premium access", value: "$760", icon: "▢" },
  ];

  return (
    <section ref={ref} className="relative hidden min-h-[100svh] w-full snap-start overflow-hidden bg-[#050607] lg:flex items-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050507] to-transparent z-[2]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050507] to-transparent z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(229,57,69,0.16),transparent_22%),radial-gradient(circle_at_20%_80%,rgba(255,106,42,0.10),transparent_20%),linear-gradient(180deg,#050607_0%,#030405_100%)]" />
      <motion.div className="absolute right-[12%] top-[18%] h-72 w-72 rounded-full bg-[#ff4d5a]/10 blur-[120px]" animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.55, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute left-[8%] bottom-[12%] h-56 w-56 rounded-full bg-[#ff6a2a]/10 blur-[110px]" animate={{ y: [0, -14, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-[58%] h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ff6b4a]/30 to-transparent" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 4, repeat: Infinity }} />


      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-[0.95fr_1.05fr] items-center gap-14 px-8 xl:px-16">
        <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-3xl">
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-white/45">MONETIZATION</motion.p>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }} className="mb-7 text-[56px] font-black leading-[0.96] tracking-tighter text-white xl:text-[74px] 2xl:text-[88px]">
            Turn your audience<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">into a business.</span>
          </motion.h2>
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-8 max-w-2xl text-lg font-medium leading-relaxed text-white/65 xl:text-xl">
            Subscriptions. Tips. Merchandise. Paid communities.<br className="hidden xl:block" />
            One platform where every dollar flows directly to you — with only a 1% fee.
          </motion.p>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-10 flex flex-wrap gap-3">
            {streams.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md">
                <span className="text-[#ff7a5c]/90">{s.icon}</span>{s.label}
              </span>
            ))}
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="flex flex-col items-start gap-3">
            <motion.a href="/signup" whileHover={{ scale: 1.03, boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 18px 45px rgba(229,57,69,0.28), 0 0 30px rgba(255,106,42,0.16)" }} whileTap={{ scale: 0.99 }} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(229,57,69,0.24)]">
              Start Building Your Business <ArrowRight size={18} />
            </motion.a>
            <p className="text-sm font-medium text-white/45">You own the relationship. You own the revenue.</p>
          </motion.div>
        </motion.div>

        <div className="relative h-[560px]">
          <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}} transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} className="absolute left-0 right-8 top-8 rounded-[30px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl overflow-hidden">
            <motion.div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#ff4d5a]/10 blur-3xl" animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="mb-6 flex items-center justify-between relative">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/40 mb-1">Creator Dashboard</div>
                <div className="text-lg font-semibold text-white">Earnings overview</div>
              </div>
              <motion.span className="rounded-full border border-[#ff6b4a]/30 bg-[#E53945]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb0a8]" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.8, repeat: Infinity }}>Live</motion.span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 relative">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs uppercase tracking-[0.16em] text-white/40 mb-2">Total earnings</div><motion.div animate={inView ? { opacity: [0.6,1,1], scale: [0.98,1,1] } : {}} className="text-3xl font-black text-white">$24,860</motion.div><div className="mt-1 text-xs text-[#ff8a6a]">+18% this month</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs uppercase tracking-[0.16em] text-white/40 mb-2">Subscribers</div><div className="text-3xl font-black text-white">3,482</div><div className="mt-1 text-xs text-white/45">Active members</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs uppercase tracking-[0.16em] text-white/40 mb-2">Recent payout</div><div className="text-3xl font-black text-white">$2,140</div><div className="mt-1 text-xs text-white/45">Deposited</div></div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium text-white/75">Revenue breakdown</span><span className="text-xs text-white/40">Last 30 days</span></div>
              <div className="space-y-3">
                {[{l:'Subscriptions',w:'72%',c:'bg-[#E53945]'},{l:'Merchandise',w:'38%',c:'bg-[#ff6b4a]/80'},{l:'Tips & Gifts',w:'24%',c:'bg-[#ff8a6a]/70'},{l:'Communities',w:'18%',c:'bg-white/40'}].map((row)=>(
                  <div key={row.l}><div className="mb-1 flex items-center justify-between text-xs text-white/50"><span>{row.l}</span><span>{row.w}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><motion.div initial={{ width: 0 }} animate={inView ? { width: row.w } : { width: 0 }} transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }} className={`h-full rounded-full ${row.c}`} /></div></div>
                ))}
              </div>
            </div>
          </motion.div>

          {streams.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24, x: i % 2 === 0 ? -10 : 10 }}
              animate={inView ? { opacity: 1, y: [0, -4, 0], x: 0 } : {}}
              transition={{ opacity: { duration: 0.6, delay: 0.35 + i * 0.08 }, y: { duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: 0.8 + i * 0.15 }, x: { duration: 0.6, delay: 0.35 + i * 0.08 } }}
              whileHover={{ y: -8, boxShadow: "0 18px 45px rgba(0,0,0,0.35), 0 0 0 1px rgba(229,57,69,0.18)" }}
              className={`absolute rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${
                i === 0 ? "right-0 top-0 w-[210px]" : i === 1 ? "-left-2 top-[150px] w-[190px]" : i === 2 ? "right-[-10px] top-[240px] w-[190px]" : i === 3 ? "left-4 bottom-[130px] w-[200px]" : "right-6 bottom-2 w-[220px]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xs text-[#ff7a5c]">{s.icon}</span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#ffb0a8]/80">Active</span>
              </div>
              <div className="text-sm font-semibold text-white">{s.label}</div>
              <div className="mt-1 flex items-center justify-between text-xs text-white/45"><span>{s.meta}</span><span className="font-semibold text-white/75">{s.value}</span></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreatorEconomicsHero() {
  const [revenue, setRevenue] = useState(10000);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.35 });
  const trooflixKeep = Math.round(revenue * 0.99);
  const oldKeep = Math.round(revenue * 0.55);

  return (
    <section ref={ref} className="relative hidden min-h-[100svh] w-full snap-start overflow-hidden bg-[#080405] lg:flex items-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050507] to-transparent z-[2]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050507] to-transparent z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(229,57,69,0.2),transparent_24%),radial-gradient(circle_at_20%_70%,rgba(255,106,42,0.14),transparent_28%),linear-gradient(180deg,#080405_0%,#030203_100%)]" />
      <motion.div className="absolute right-[18%] top-[22%] h-80 w-80 rounded-full bg-[#ff4d5a]/10 blur-[140px]" animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.6, 0.35] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute left-[12%] bottom-[18%] h-56 w-56 rounded-full bg-[#ff6a2a]/10 blur-[120px]" animate={{ y: [0, -14, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-[1.05fr_0.95fr] items-center gap-12 px-8 xl:px-16">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="max-w-3xl">
          <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.34em] text-[#ffb0a8]/70">CREATOR-FIRST ECONOMICS</p>
          <h2 className="mb-7 text-[56px] font-black leading-[0.96] tracking-tighter text-white xl:text-[74px] 2xl:text-[88px]">
            Stop letting big tech<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">eat your lunch.</span>
          </h2>
          <div className="mb-8 max-w-2xl space-y-2 text-lg font-medium leading-relaxed text-white/68 xl:text-xl">
            <p>Legacy platforms can take nearly half before you ever see it.</p>
            <p>Trooflix flips the model: keep 99% with a flat 1% fee.</p>
            <p>No surprise cuts. No algorithm tax. No censorship tax.</p>
          </div>

          <div className="mb-10 flex flex-wrap gap-3">
            {["Flat 1% fee", "Predictable payouts", "No surprise cuts"].map((tag) => (
              <span key={tag} className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">{tag}</span>
            ))}
          </div>

          <div className="mb-8 grid max-w-3xl grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -4 }} className="rounded-[26px] border border-[#ff6b4a]/20 bg-white/[0.06] p-6 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.28),0_0_0_1px_rgba(229,57,69,0.08),0_0_40px_rgba(229,57,69,0.08)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffb0a8]">Trooflix</span>
                <span className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">Highlighted</span>
              </div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/45">On ${revenue.toLocaleString()}</div>
              <div className="text-4xl font-black tracking-tight text-[#ff7a5c]">${trooflixKeep.toLocaleString()}</div>
              <div className="mt-2 text-sm text-white/55">You keep $9,900 on $10,000</div>
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl opacity-80">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Old Model / YouTube</span>
                <span className="relative text-sm font-bold text-white/35">45%<span className="absolute left-[-10%] right-[-10%] top-1/2 h-[2px] -translate-y-1/2 rotate-[-12deg] bg-red-500/90" /></span>
              </div>
              <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/35">On ${revenue.toLocaleString()}</div>
              <div className="text-4xl font-black tracking-tight text-white/45">${oldKeep.toLocaleString()}</div>
              <div className="mt-2 text-sm text-white/40">You keep $5,500 on $10,000</div>
            </motion.div>
          </div>

          <div id="earnings-calculator" className="mb-8 max-w-xl rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white/80">Earnings calculator</span>
              <span className="text-xs uppercase tracking-[0.18em] text-white/40">Monthly revenue</span>
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={500}
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              className="w-full accent-[#E53945]"
            />
            <div className="mt-3 flex items-center justify-between text-sm text-white/55">
              <span>${revenue.toLocaleString()} / month</span>
              <span className="text-[#ff8a6a] font-semibold">+${(trooflixKeep - oldKeep).toLocaleString()} vs old model</span>
            </div>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <motion.a href="#earnings-calculator" whileHover={{ scale: 1.03, boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 18px 45px rgba(229,57,69,0.35), 0 0 30px rgba(255,106,42,0.2)" }} whileTap={{ scale: 0.99 }} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_40px_rgba(229,57,69,0.3)]">
              Calculate Your Earnings <ArrowRight size={18} />
            </motion.a>
            <p className="text-sm text-white/45">On $10,000 → You keep <span className="text-white/75 font-semibold">$9,900</span> · Old model → <span className="text-white/55 font-semibold">$5,500</span></p>
          </div>
        </motion.div>

        <div className="relative flex min-h-[70vh] items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }} transition={{ duration: 0.9, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} className="relative">
            <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff6b4a]/10" animate={{ rotate: 360, scale: [1, 1.04, 1] }} transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }} />
            <motion.div animate={{ y: [0, -8, 0], textShadow: ["0 0 40px rgba(229,57,69,0.25)", "0 0 80px rgba(255,106,42,0.4)", "0 0 40px rgba(229,57,69,0.25)"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="text-[170px] font-black leading-none tracking-tighter text-white drop-shadow-[0_0_60px_rgba(229,57,69,0.35)] xl:text-[220px] 2xl:text-[260px]">
              99%
            </motion.div>
            <div className="absolute -bottom-2 left-1/2 h-24 w-[80%] -translate-x-1/2 rounded-full bg-[#ff4d5a]/10 blur-3xl" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, y: 20 }}
            animate={inView ? { opacity: 1, x: 0, y: [0, -6, 0] } : { opacity: 0, x: 40, y: 20 }}
            transition={{ opacity: { duration: 0.7, delay: 0.8 }, x: { duration: 0.7, delay: 0.8 }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 } }}
            className="absolute bottom-8 right-0 w-[340px] rounded-2xl border border-white/15 bg-white/[0.07] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ff6b4a]/40 bg-[#E53945]/20 text-[#ffb0a8]"><CheckCircle2 size={20} /></div>
              <div>
                <div className="text-sm font-semibold text-white">Payout Received</div>
                <div className="text-xs text-white/55">+$1,284.00 deposited to TrooBank</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TrooflixIntroHero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });

  return (
    <section ref={ref} className="relative w-full min-h-[100svh] snap-start overflow-hidden bg-[#030304] flex items-center">
      <HeroScene3D />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#050507] to-transparent z-[2]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#040406] to-transparent z-[2]" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_20%_25%,rgba(229,57,69,0.22),transparent_22%),radial-gradient(circle_at_75%_35%,rgba(255,106,42,0.18),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(229,57,69,0.10),transparent_30%)]" />
      <motion.div className="absolute left-[8%] top-[18%] h-72 w-72 rounded-full bg-[#ff4d5a]/12 blur-[120px] z-[1]" animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.12, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute right-[10%] bottom-[15%] h-80 w-80 rounded-full bg-[#ff6a2a]/12 blur-[130px] z-[1]" animate={{ x: [0, -24, 0], y: [0, 18, 0], scale: [1, 1.08, 1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ff6b4a]/10 z-[1]" animate={{ rotate: 360, scale: [1, 1.03, 1] }} transition={{ rotate: { duration: 40, repeat: Infinity, ease: "linear" }, scale: { duration: 8, repeat: Infinity, ease: "easeInOut" } }} />
      <motion.div className="pointer-events-none absolute left-1/2 top-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#ff6b4a]/15 z-[1]" animate={{ rotate: -360 }} transition={{ duration: 26, repeat: Infinity, ease: "linear" }} />

      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-8 xl:px-16 py-24">
        <div className="grid grid-cols-[1.05fr_0.95fr] items-center gap-12 xl:gap-16">
          <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-3xl">
            <motion.div variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[#ff4d5a] shadow-[0_0_12px_rgba(229,57,69,0.9)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">Creator-first platform</span>
            </motion.div>

            <motion.h1 variants={{ hidden: { opacity: 0, y: 28 }, visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22,1,0.36,1] } } }} className="text-[58px] xl:text-[78px] 2xl:text-[96px] font-black tracking-[-0.05em] leading-[0.92] text-white mb-7">
              Trooflix is the <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff4d5a] via-[#ff6b4a] to-orange-400">creator-owned</span> home for your content.
            </motion.h1>

            <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="max-w-2xl text-xl xl:text-2xl leading-relaxed text-white/70 font-medium mb-10">
              Go live, share Shorts, publish documentaries, and build a real business — with direct fan support, TrooBank payouts, and <span className="text-white font-semibold">99% of your revenue</span> staying with you.
            </motion.p>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="flex flex-wrap gap-3 mb-10">
              {["Live streaming", "Shorts & documentaries", "Keep 99%", "TrooChat & community", "TrooBank & TrooCoins"].map((item, i) => (
                <motion.span key={item} className="rounded-full border border-[#ff6b4a]/25 bg-[#E53945]/10 px-4 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" animate={{ y: [0, -2, 0] }} transition={{ duration: 3 + i * 0.25, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}>
                  {item}
                </motion.span>
              ))}
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-4 flex-wrap">
              <motion.a href="/signup" whileHover={{ scale: 1.03, boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 22px 55px rgba(229,57,69,0.4), 0 0 40px rgba(255,106,42,0.22)" }} whileTap={{ scale: 0.99 }} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E53945] to-[#ff6a2a] px-8 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_45px_rgba(229,57,69,0.35)]">
                Start Creating <ArrowRight size={18} />
              </motion.a>
              <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white/85 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white">
                See what’s inside
              </a>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30, scale: 0.98 }} animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}} transition={{ duration: 1, delay: 0.15, ease: [0.22,1,0.36,1] }} className="relative flex items-center justify-center">
            <div className="relative w-full max-w-[560px]">
              <motion.div className="absolute -inset-6 rounded-[40px] bg-gradient-to-r from-[#E53945]/20 via-[#ff6a2a]/10 to-transparent blur-2xl" animate={{ opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
              <div className="relative rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { k: "Create", v: "Live, Shorts & Docs", d: "All your formats in one place" },
                    { k: "Earn", v: "Keep 99%", d: "Flat 1% fee, direct payouts" },
                    { k: "Connect", v: "TrooChat", d: "Messages, voice & video calls" },
                    { k: "Own", v: "TrooBank", d: "TrooCoins, tips & revenue" },
                  ].map((card, i) => (
                    <motion.div key={card.k} className="rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 min-h-[150px] flex flex-col justify-between" animate={{ y: [0, -4, 0] }} transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }} whileHover={{ y: -6, borderColor: "rgba(255,107,74,0.35)", boxShadow: "0 20px 45px rgba(0,0,0,0.3), 0 0 0 1px rgba(229,57,69,0.12)" }}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ffb0a8]/80">{card.k}</div>
                      <div>
                        <div className="text-xl font-black tracking-tight text-white mb-1">{card.v}</div>
                        <div className="text-sm leading-relaxed text-white/50">{card.d}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.div className="mt-4 rounded-2xl border border-[#ff6b4a]/20 bg-gradient-to-r from-[#E53945]/15 to-[#ff6a2a]/10 px-4 py-3 flex items-center justify-between" animate={{ boxShadow: ["0 0 0 rgba(229,57,69,0)", "0 0 24px rgba(229,57,69,0.12)", "0 0 0 rgba(229,57,69,0)"] }} transition={{ duration: 3, repeat: Infinity }}>
                  <span className="text-sm font-semibold text-white/80">Built for creators, not advertisers</span>
                  <span className="text-sm font-black text-[#ff8a6a]">No Big Tech tax</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
function HeroLatestShortPhone() {
  return (
    <>
      <img src="/reelpic.jpg" alt="Shorts reel preview" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

      <div className="absolute left-3 right-3 bottom-3 z-20 flex flex-col gap-2">
        <p className="text-white text-[10px] leading-snug line-clamp-2 drop-shadow-md">Watch this exclusive clip on Trooflix.</p>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e] shrink-0">
            <div className="h-full w-full flex items-center justify-center text-[9px] font-black text-white bg-gradient-to-br from-[#E53945] to-[#8a1e26]">T</div>
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow-md truncate max-w-[90px]">Creator</span>
          <span className="ml-0.5 px-2 py-0.5 text-[8px] font-bold rounded-md bg-white/20 border border-white/30 text-white backdrop-blur-sm">Follow</span>
        </div>
        <div className="flex items-center justify-between gap-1 text-white/95">
          <div className="flex items-center gap-2.5">
            <VolumeX size={14} strokeWidth={2.2} className="drop-shadow-md" />
            <MessageCircle size={14} strokeWidth={2.2} className="drop-shadow-md" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="drop-shadow-md">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
              <text x="12" y="15" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">TC</text>
            </svg>
            <ThumbsUp size={14} strokeWidth={2.2} className="drop-shadow-md" />
          </div>
          <div className="flex items-center gap-1 text-white/90">
            <Eye size={12} strokeWidth={2.2} />
            <span className="text-[9px] font-extrabold tracking-tight">0</span>
          </div>
        </div>
        <div className="mt-0.5 h-[2px] w-full rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-white" />
        </div>
      </div>
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050507] to-transparent z-[5]" />
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
