"use client";


if (typeof window !== "undefined") {
  window.onerror = function(msg, url, line, col, err) {
    document.body.innerHTML = '<div style="background:#000;color:#f00;padding:20px;font-family:monospace;font-size:14px;white-space:pre-wrap;">ERROR: ' + msg + '\n\nLine: ' + line + ':' + col + '\n\nURL: ' + url + '</div>';
    return false;
  };
  window.addEventListener("unhandledrejection", function(e) {
    document.body.innerHTML = '<div style="background:#000;color:#f00;padding:20px;font-family:monospace;font-size:14px;white-space:pre-wrap;">PROMISE ERROR: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)) + '</div>';
  });
}

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Info, ChevronLeft, ChevronRight, Plus, ThumbsUp, X,
  Search, Bell, Home as HomeIcon, Film, FileText, Mic, Tv, Menu,
  Compass, LogOut } from "lucide-react";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import LoadingIntro from "@/components/LoadingIntro";
import PullToRefresh from "@/components/PullToRefresh";
import VideoIntro from "@/components/VideoIntro";
import UserMenu from "@/components/UserMenu";
import { useSearch } from "@/context/SearchContext";
import TopBar from "@/components/TopBar";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import CollectionsRow from "@/components/CollectionsRow";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import SearchResults from "@/components/SearchResults";
import MobileBottomNav from "@/components/MobileBottomNav";
import TextOverlayRenderer from "@/components/TextOverlay";
import { getAllProgress } from "@/lib/progress";
import SkeletonRow from "@/components/SkeletonRow";
import { getCachedVideos, getCachedCreators } from "@/lib/cache";

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
};

const CATEGORIES: string[] = [
  "History",
  "Politics & Geopolitics",
  "War & Conflict",
  "True Crime & Justice",
  "Conspiracy & Unsolved",
  "Society & Culture",
  "Business & Finance",
  "Science & Technology",
  "Environment & Nature",
  "Religion & Spirituality",
  "Comedy & Satire",
  "News & Current Events",
];

const NAV_TABS: string[] = ["Home", "Podcasts", "Feed"];

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [creators, setCreators] = useState<any[]>([]);
  const { search } = useSearch();
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState("Home");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    setDrawerOpen(false);
    router.push("/");
    router.refresh();
  };

  const [searchOpen, setSearchOpen] = useState(false);
  
  // Sync from URL on mount and when URL changes

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

  // Track visitor (fires once per page load)
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
  const [introDone, setIntroDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progressList, setProgressList] = useState<any[]>([]);
  const [showVideoIntro, setShowVideoIntro] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<Video | null>(null);

  // Load videos + creators once
  useEffect(() => {
    getCachedCreators().then(setCreators).catch(() => {});
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        setVideos(all);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Load progress + listen for changes
  useEffect(() => {
    setProgressList(getAllProgress());
    const onProg = () => setProgressList(getAllProgress());
    window.addEventListener("progress-changed", onProg);
    return () => window.removeEventListener("progress-changed", onProg);
  }, []);

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hero — featured non-podcaster video (Loose Change etc.)
  const heroPool = videos.filter((v) => v.featured);
  const [heroIndex, setHeroIndex] = useState(0);

  // New Releases + Trending — Documentaries and Podcasts only
  const isDocOrPodcast = (v: Video) =>
    !v.uploaderUserId && (v.type === "Documentary" || v.type === "Podcast");

  const newReleases = videos
    .filter(isDocOrPodcast)
    .sort((a, b) => b.id - a.id)
    .slice(0, 20);

  const trending = videos
    .filter(isDocOrPodcast)
    .sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0))
    .slice(0, 20);

  let displayVideos = videos;
  if (activeCategory) displayVideos = videos.filter((v) => v.category === activeCategory);
  else if (activeTab === "Movies") displayVideos = videos.filter((v) => v.type === "Movie");
  else if (activeTab === "Documentaries") displayVideos = videos.filter((v) => v.type === "Documentary");
  else if (activeTab === "Podcasts") displayVideos = videos.filter((v) => v.type === "Podcast");
  else if (activeTab === "Series") displayVideos = videos.filter((v) => v.type === "Series");

  const filtered = search
    ? videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
    : null;

    useEffect(() => {
    if (heroPool.length <= 1) {
      setHeroIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroPool.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [heroPool.length]);

  const hero = heroPool[heroIndex] || videos[0];

  const requestPlay = (video: Video) => {
    setPendingVideo(video);
    setShowVideoIntro(true);
  };

  const onIntroDone = () => {
    setShowVideoIntro(false);
    if (pendingVideo) setPlaying(pendingVideo);
    setPendingVideo(null);
  };
  const showingFiltered = activeCategory || activeTab !== "Home" || filtered;

  return (
    <>
    <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20 lg:pb-0">
      <LoadingIntro onDone={() => setIntroDone(true)} />
      {/* ============ TOP NAV ============ */}
      <TopBar onMenu={() => setDrawerOpen(true)} />

      {/* ============ DRAWER (categories) ============ */}
      <AnimatePresence>
                {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[290]"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-screen w-[300px] bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 z-[300] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex flex-col overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
                </span>
                <button onClick={() => setDrawerOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-hide">
                
                {/* Main Links */}
                <div className="space-y-1">
                  <Link href="/" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white font-semibold">
                    Home
                  </Link>
                  <Link href="/creators" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/80 font-medium">
                    Creators
                  </Link>
                  <Link href="/feed" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/80 font-medium">
                    Feed
                  </Link>
                </div>

                <div className="h-px bg-white/5 mx-4" />

                {/* Categories Accordion */}
                <details className="group">
                  <summary className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition cursor-pointer list-none text-white/80 font-medium">
                    <span>Categories</span>
                    <ChevronRight size={16} className="group-open:rotate-90 transition-transform duration-200 text-white/50" />
                  </summary>
                  <div className="mt-2 space-y-0.5 pl-4">
                    {CATEGORIES.map((cat: string) => (
                      <button
                        key={cat}
                        onClick={() => { setActiveCategory(cat === activeCategory ? null : cat); setActiveTab("Home"); setDrawerOpen(false); }}
                        className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm transition ${activeCategory === cat ? "text-red-500 bg-red-500/10 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </details>

                <div className="h-px bg-white/5 mx-4" />

                {/* Trooflix Section */}
                <div className="space-y-1">
                  <Link href="/features" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/80 font-medium">
                    Features
                  </Link>
                  <Link href="/books" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/80 font-medium">
                    Book Store
                  </Link>
                  <Link href="/why-us" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition text-white/80 font-medium">
                    Why Trooflix
                  </Link>
                  <Link href="/signup?type=podcaster" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/20 transition font-bold mt-2">
                    Become a Creator
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition font-medium mt-6"
                  >
                    <LogOut size={18} /> Log Out
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-white/5 shrink-0 bg-black/20">
                <div className="text-[10px] leading-relaxed tracking-widest text-red-600/60 font-bold">
                  REAL STORIES.<br />UNCENSORED.<br />TROOFLIX.
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ============ CONTENT ============ */}
      {loaded && (
        <>
          
          {!showingFiltered && hero && (
            <AnimatePresence mode="wait">
              <motion.div
                key={hero.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full"
              >
                <Hero video={hero} onPlay={() => requestPlay(hero)} onMore={() => setSelected(hero)} />
              </motion.div>
            </AnimatePresence>
          )}
          {showingFiltered && <div className="h-20 md:h-24" />}

          <div className="relative z-10 pt-2 md:pt-6 pb-32 md:pb-20 space-y-2 md:space-y-6">
        {filtered && (
          <SearchResults
            search={search}
            videos={videos}
            creators={creators}
            onVideoClick={setSelected}
          />
        )}

        {!filtered && showingFiltered && (
          <div className="px-4 md:px-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">{activeCategory || activeTab}</h2>
              {activeCategory && (
                <button
                  onClick={() => setActiveCategory(null)}
                  className="text-sm text-white/50 hover:text-white transition"
                >
                  Clear filter
                </button>
              )}
            </div>
            {displayVideos.length === 0 ? (
              <p className="text-white/40">No videos yet.</p>
            ) : (
              <Grid items={displayVideos} onSelect={setSelected} onPlay={requestPlay} />
            )}
          </div>
        )}

        {loaded && !filtered && !showingFiltered && (
          <>
            <CollectionsRow
              onSelectCategory={(cat) => {
                setActiveCategory(cat === activeCategory ? null : cat);
                setActiveTab("Home");
              }}
              activeCategory={activeCategory}
            />
            {newReleases.length > 0 && <Row title="New Releases" items={newReleases} onSelect={setSelected} onPlay={requestPlay} showCreator={true} creators={creators} />}
            {/* New Creators Row */}
            {creators && creators.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between px-4 md:px-12 mb-4">
                  <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Just Joined
                  </h2>
                  <Link href="/podcasts" className="text-xs font-semibold text-white/50 hover:text-white transition">View all</Link>
                </div>
                
                <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-4">
                  {[...creators]
                    .sort((a: any, b: any) => Number(b.id) - Number(a.id))
                    .slice(0, 15)
                    .map((c: any) => (
                    <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group w-[80px] md:w-[100px]">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-tr from-red-600 to-orange-500 group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-[#1c1c1e]">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">
                              {c.name?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-full text-center">
                        {c.name || "New Creator"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {trending.length > 0 && <Row title="Trending Now" items={trending} onSelect={setSelected} onPlay={requestPlay} showCreator={true} creators={creators} />}
            {loaded && videos.length === 0 && (
              <div className="px-8 py-20 text-center text-white/50">
                <p className="text-xl mb-2">No videos yet</p>
                <a href="/admin" className="text-red-500 hover:underline">Go to /admin to add your first video</a>
              </div>
            )}
          </>
        )}
          </div>
        </>
      )}

      {/* ============ MODAL / PLAYER ============ */}
      <AnimatePresence>
        {showVideoIntro && <VideoIntro onDone={onIntroDone} />}
        {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onPlay={(v) => { setSelected(null); requestPlay(v); }} creators={creators} />}
        {playing && (
          <AppleVideoPlayer
            src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
            poster={playing.posterUrl}
            title={playing.title}
            textOverlays={playing?.textOverlays}
            onClose={() => setPlaying(null)}
          />
        )}
      </AnimatePresence>
    </main>
    </PullToRefresh>
    <MobileBottomNav />
    </>
  );
}

/* ============ TOP NAV ============ */
function TopNav({ activeTab, setActiveTab, searchOpen, setSearchOpen, search, setSearch, onMenu, scrolled }: any) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center gap-4 md:gap-6 px-4 md:px-12 py-3 md:py-4 transition-colors duration-300 ${
        scrolled ? "bg-black" : "bg-gradient-to-b from-black/90 via-black/60 to-transparent"
      }`}
    >
      <button onClick={onMenu} className="text-white/90 hover:text-white">
        <Menu size={22} />
      </button>

      <a href="/" className="text-xl md:text-2xl font-black tracking-tight shrink-0">
        <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
      </a>

      <div className="hidden lg:flex gap-6 text-sm ml-6">
        {NAV_TABS.map((tab: string) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === "Podcasts") {
                window.location.href = "/podcasts";
              } else if (tab === "Feed") {
                window.location.href = "/feed";
              } else {
                setActiveTab(tab);
              }
            }}
            className={`transition tracking-wide ${activeTab === tab ? "text-white font-semibold" : "text-white/70 hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4 md:gap-5">
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-black/80 border border-white/30 rounded px-3 py-1.5">
            <Search size={16} className="text-white/70" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setSearchOpen(false)}
              placeholder="Titles, categories"
              className="bg-transparent outline-none text-sm w-32 md:w-64"
            />
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="text-white/90 hover:text-white">
            <Search size={20} />
          </button>
        )}
        <button className="hidden md:block text-white/90 hover:text-white">
          <Bell size={20} />
        </button>
        <UserMenu />

      </div>
    </nav>
  );
}

/* ============ MOBILE BOTTOM NAV ============ */

/* ============ HERO ============ */
function Hero({ video, onPlay, onMore }: { video: Video; onPlay: () => void; onMore: () => void }) {
  return (
    <section className="relative h-[40vh] md:h-[65vh] w-full">
      <img src={video.backdropUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 max-w-2xl pt-20 md:pt-24 pb-0">
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs md:text-sm tracking-[0.3em] text-red-500 font-bold mb-3"
        >
          TROOFLIX PRESENTS
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-4 tracking-tight"
        >
          {video.title}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex items-center gap-3 text-sm mb-4 flex-wrap"
        >
          <span className="text-white/70">{video.year}</span>
          <span className="border border-white/40 px-1.5 py-0.5 text-xs">{video.rating}</span>
          <span className="text-white/70">{video.type}</span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="flex gap-3"
        >
          <button onClick={onPlay} className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-white/30 transition-all active:scale-95">
            <Play size={20} fill="currentColor" /> Play
          </button>
          <button onClick={onMore} className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/20 text-white font-semibold px-5 md:px-7 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-black/60 transition-all active:scale-95">
            <Info size={20} /> More Info
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/* ============ ROW ============ */
function Row({ title, items, onSelect, onPlay, showCreator, creators }: { title: string; items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void; showCreator?: boolean; creators?: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const scroll = (dir: "left" | "right") => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/row">
      <h2 className="text-lg md:text-xl font-bold px-4 md:px-12 mb-3">{title}</h2>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"
        >
          <ChevronLeft size={32} />
        </button>

        <div
          ref={ref}
          className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-6 scroll-smooth"
        >
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              hovered={hovered === item.id}
              onHover={() => setHovered(item.id)}
              onLeave={() => setHovered(null)}
              onSelect={onSelect}
              onPlay={onPlay}
              showCreator={showCreator}
              creator={
                showCreator && creators && item.creatorId
                  ? creators.find((c: any) => c.id === item.creatorId) || null
                  : null
              }
            />
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
}

/* ============ GRID ============ */
function Grid({ items, onSelect, onPlay }: { items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
      {items.map((item) => (
        <Card
          key={item.id}
          item={item}
          hovered={hovered === item.id}
          onHover={() => setHovered(item.id)}
          onLeave={() => setHovered(null)}
          onSelect={onSelect}
          onPlay={onPlay}
        />
      ))}
    </div>
  );
}

/* ============ CARD ============ */
function Card({ item, hovered, onHover, onLeave, onSelect, onPlay, showCreator, creator }: any) {
  return (
    <motion.div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => onSelect(item)}
      animate={{ scale: hovered ? 1.08 : 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      data-tv-focus
      className="relative flex-shrink-0 w-[110px] md:w-[140px] aspect-[2/3] rounded overflow-hidden cursor-pointer z-10 hover:z-40 shadow-lg"
    >
      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />

      {/* Bottom label — avatar (optional) + video title */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2 md:p-2.5 flex items-center gap-2">
        {showCreator && creator && (
          creator.photoUrl ? (
            <img
              src={creator.photoUrl}
              alt=""
              className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0 border border-white/20"
            />
          ) : (
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
              {(creator.name?.[0] || "?").toUpperCase()}
            </div>
          )
        )}
        <p className="text-[11px] md:text-xs font-bold leading-tight line-clamp-2 text-white">
          {item.title}
        </p>
      </div>

      {/* Hover info panel (desktop only) */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/40 p-3 flex-col justify-end"
        >
          <p className="text-sm font-bold mb-2 line-clamp-2">{item.title}</p>
          <div className="flex items-center gap-2 text-[10px] mb-2.5 flex-wrap">
            <span className="text-green-500 font-bold">{item.match}%</span>
            <span className="border border-white/50 px-1">{item.rating}</span>
            <span className="text-white/80">{item.year}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onPlay(item); }}
              className="bg-white text-black rounded-full p-1.5 hover:bg-white/80"
            >
              <Play size={12} fill="black" />
            </button>
            <div
              className="border border-white/60 rounded-full p-1.5 hover:border-white"
              onClick={(e) => e.stopPropagation()}
            >
              <SaveButton videoId={item.id} variant="icon" size={12} />
            </div>
            <div
              className="border border-white/60 rounded-full p-1.5 hover:border-white"
              onClick={(e) => e.stopPropagation()}
            >
              <LikeButton videoId={item.id} size={12} showCount={false} />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ============ MODAL ============ */
function DetailModal({ item, onClose, onPlay, creators }: { item: Video; onClose: () => void; onPlay: (v: Video) => void; creators?: any[] }) {
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Reset internal scroll to top when modal opens
  useEffect(() => {
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }
  }, [item.id]);

  const uploader =
    item.creatorId
      ? (creators || []).find((c: any) => c.id === item.creatorId) || null
      : null;

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
    const onMeta = () => {
      try {
        const dur = v.duration;
        if (isFinite(dur) && dur > 0) {
          v.currentTime = Math.min(300, dur / 3);
        }
      } catch {}
    };
    const onCanPlay = () => {
      setPreviewReady(true);
      v.play().catch(() => {});
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("canplay", onCanPlay);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("canplay", onCanPlay);
      v.pause();
      try { v.removeAttribute("src"); v.load(); } catch {}
    };
  }, [videoSrc]);

  const metaParts: string[] = [item.category];
  if (item.duration && item.duration.trim()) metaParts.push(item.duration);
  if (item.year) metaParts.push(String(item.year));
  if (item.rating) metaParts.push(item.rating);


  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        key={item.id}
        ref={modalContentRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-[#141414] shadow-2xl rounded-lg relative w-full max-w-4xl overflow-y-auto"
        style={{ maxHeight: "90dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-[260px] md:h-[420px] w-full overflow-hidden">
          <img
            src={item.backdropUrl}
            alt={item.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              previewReady ? "opacity-0" : "opacity-100"
            }`}
          />
          {videoSrc && (
            <>
              <video
                ref={previewRef}
                src={videoSrc}
                muted
                playsInline
                preload="metadata"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  previewReady ? "opacity-100" : "opacity-0"
                }`}
              />
              <TextOverlayRenderer overlays={item.textOverlays} />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-black/70 hover:bg-black/90 rounded-full p-2 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
            <h2 className="text-3xl md:text-5xl font-black mb-2 md:mb-3 drop-shadow-lg">
              {item.title}
            </h2>
            <p className="text-sm md:text-base text-white/70 mb-4 md:mb-5">
              {metaParts.join(" · ")}
            </p>

            <div className="flex gap-2 md:gap-3 flex-wrap">
              <button
                onClick={() => onPlay(item)}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-white/30 transition-all active:scale-95"
              >
                <Play size={18} fill="currentColor" /> Play
              </button>
              <SaveButton videoId={item.id} variant="labeled" size={18} />
            </div>
          </div>
        </div>

        <div className="p-5 md:p-10 space-y-5">
          {item.description && (
            <p className="text-white/90 leading-relaxed text-sm md:text-base">
              {item.description}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            {uploaderPhoto ? (
              <img
                src={uploaderPhoto}
                alt={uploaderName}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold text-white">
                {uploaderInitial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-white/40">
                Uploaded by
              </p>
              {uploaderSlug ? (
                <a
                  href={`/podcaster/${uploaderSlug}`}
                  className="font-semibold text-white hover:underline block truncate"
                >
                  {uploaderName}
                </a>
              ) : (
                <p className="font-semibold text-white truncate">{uploaderName}</p>
              )}
            </div>

            <div className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0">
              <LikeButton videoId={item.id} size={22} stacked />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
