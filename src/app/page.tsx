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
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Play, Info, ChevronLeft, ChevronRight, X,
  Search, Bell, HomeIcon, Menu,
  Compass, LogOut, LogIn, Users, ShoppingBag, Sparkles, BookOpen, Flame, List,
  CheckCircle2, Pause, VolumeX, Volume2, MoreVertical, Plus
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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    setDrawerOpen(false);
    router.push("/");
    router.refresh();
  };

  const [searchOpen, setSearchOpen] = useState(false);
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

  const heroPool = videos.filter((v) => v.featured);
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
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20 lg:pb-0">
      <TopBar onMenu={() => setDrawerOpen(true)} />

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
          {!showingFiltered && hero && (
            <AnimatePresence mode="wait">
              <motion.div key={hero.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="w-full">
                <Hero video={hero} onPlay={() => handleInstantPlay(hero)} onMore={() => setSelected(hero)} />
              </motion.div>
            </AnimatePresence>
          )}
          {showingFiltered && <div className="h-20 md:h-24" />}

          <div className="relative z-10 pt-2 md:pt-6 pb-32 md:pb-20 space-y-2 md:space-y-6">
            {filtered && <SearchResults search={search} videos={videos} creators={creators} onVideoClick={setSelected} />}

            {!filtered && showingFiltered && (
              <div className="px-4 md:px-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold">{activeCategory || activeTab}</h2>
                  {activeCategory && <button onClick={() => setActiveCategory(null)} className="text-sm text-white/50 hover:text-white transition">Clear filter</button>}
                </div>
                {displayVideos.length === 0 ? <p className="text-white/40">No videos yet.</p> : <Grid items={displayVideos} onSelect={setSelected} onPlay={handleInstantPlay} />}
              </div>
            )}

            {loaded && !filtered && !showingFiltered && (
              <>
                {/* Trending Creators */}
                {creators && creators.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between px-4 md:px-12 mb-4">
                      <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>Trending Creators
                      </h2>
                      <Link href="/creators" className="text-xs font-semibold text-white/50 hover:text-white transition">View all</Link>
                    </div>
                    <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-4">
                      {[...creators].slice(0, 15).map((c: any) => (
                        <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group w-[96px] md:w-[112px]">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-gradient-to-tr from-red-600 to-orange-500 group-hover:scale-105 transition-transform">
                            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-[#1c1c1e]">
                              {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]?.toUpperCase() || "?"}</div>}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-full text-center">{c.name || "Creator"}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* What's going on today (Feed) */}
                <div className="mt-8 pb-32">
                  <div className="px-4 md:px-12 mb-6 mt-4">
                    <p className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-semibold mb-1">
                      LATEST UPLOADS
                    </p>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                      Don't Miss A <span className="text-red-600">Thing</span>
                    </h2>
                  </div>
                  <div className="flex flex-col gap-4 md:gap-8">
                    {[...videos].sort((a: any, b: any) => {
                      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
                      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
                      return bt - at;
                    }).slice(0, 20).map((v: any) => {
                      const creator = creators.find((c: any) => c.id === v.creatorId);
                      return <HomeFeedCard key={v.id} video={v} creator={creator} onMore={() => handleCardSelect(v)} isActive={activeVideoId === v.id} onSetActive={() => setActiveVideoId(v.id)} />;
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

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

/* ============ HERO ============ */
function Hero({ video, onPlay, onMore }: { video: Video; onPlay: () => void; onMore: () => void }) {
  return (
    <section className="relative h-[40vh] md:h-[65vh] w-full">
      <img src={video.backdropUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 max-w-2xl pt-20 md:pt-24 pb-0">
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-xs md:text-sm tracking-[0.3em] text-red-500 font-bold mb-3">TROOFLIX PRESENTS</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-4 tracking-tight">{video.title}</motion.h1>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-3 text-sm mb-4 flex-wrap">
          <span className="text-white/70">{video.year}</span><span className="border border-white/40 px-1.5 py-0.5 text-xs">{video.rating}</span><span className="text-white/70">{video.type}</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex gap-3">
          <button onClick={onPlay} className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-white/30 transition-all active:scale-95"><Play size={20} fill="currentColor" /> Play</button>
          <button onClick={onMore} className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/20 text-white font-semibold px-5 md:px-7 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-black/60 transition-all active:scale-95"><Info size={20} /> More Info</button>
        </motion.div>
      </div>
    </section>
  );
}

/* ============ ROW ============ */
function Row({ title, items, onSelect, onPlay, showCreator, creators }: { title: string; items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void; showCreator?: boolean; creators?: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const scroll = (dir: "left" | "right") => { if (!ref.current) return; const amount = ref.current.clientWidth * 0.8; ref.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" }); };

  return (
    <div className="relative group/row">
      <h2 className="text-lg md:text-xl font-bold px-4 md:px-12 mb-3">{title}</h2>
      <div className="relative">
        <button onClick={() => scroll("left")} className="hidden md:flex absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"><ChevronLeft size={32} /></button>
        <div ref={ref} className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-6 scroll-smooth">
          {items.map((item) => (
            <Card key={item.id} item={item} hovered={hovered === item.id} onHover={() => setHovered(item.id)} onLeave={() => setHovered(null)} onSelect={onSelect} onPlay={onPlay} showCreator={showCreator}
              creator={showCreator && creators && item.creatorId ? creators.find((c: any) => c.id === item.creatorId) || null : null}
            />
          ))}
        </div>
        <button onClick={() => scroll("right")} className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"><ChevronRight size={32} /></button>
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
      <motion.div key={item.id} ref={modalContentRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="bg-[#141414] shadow-2xl rounded-lg relative w-full max-w-4xl overflow-y-auto" style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
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
            <h2 className="text-3xl md:text-5xl font-black mb-2 md:mb-3 drop-shadow-lg">{item.title}</h2>
            <p className="text-sm md:text-base text-white/70 mb-4 md:mb-5">{metaParts.join(" · ")}</p>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/30 text-white font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-white/30 transition-all active:scale-95"><Play size={18} fill="currentColor" /> Play</button>
              <SaveButton videoId={item.id} variant="labeled" size={18} />
            </div>
          </div>
        </div>
        <div className="p-5 md:p-10 space-y-5">
          {item.description && <p className="text-white/90 leading-relaxed text-sm md:text-base">{item.description}</p>}
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            {uploaderPhoto ? <img src={uploaderPhoto} alt={uploaderName} className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover border border-white/20" /> : <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold text-white">{uploaderInitial}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-white/40">Uploaded by</p>
              {uploaderSlug ? <a href={`/podcaster/${uploaderSlug}`} className="font-semibold text-white hover:underline block truncate">{uploaderName}</a> : <p className="font-semibold text-white truncate">{uploaderName}</p>}
            </div>
            <div className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition flex-shrink-0"><LikeButton videoId={item.id} size={22} stacked /></div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============ HOME FEED CARD ============ */
function HomeFeedCard({ video, creator, onMore, isActive, onSetActive }: { video: any, creator: any, onMore: () => void, isActive: boolean, onSetActive: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [error, setError] = useState(false);

  const videoSrc = video.videoUrl || video.bitchuteUrl || '';

  // Handle Intersection Observer to trigger parent state
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          onSetActive();
        }
      },
      { threshold: [0.6] }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [onSetActive]);

  // Play/Pause based on whether this card is the active one
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      v.play().then(() => setIsPlaying(true)).catch(() => {
        v.muted = true;
        setIsMuted(true);
        v.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    
    if (v.paused) {
      try {
        await v.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback failed:', err);
      }
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isSeeking || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };

  const handlePointerSeek = (e: React.PointerEvent) => {
    const bar = e.currentTarget as HTMLDivElement;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = e.clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    setProgress(percentage);
    v.currentTime = percentage * v.duration;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsSeeking(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerSeek(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isSeeking) handlePointerSeek(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsSeeking(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!videoSrc) return null;

  return (
    <div ref={containerRef} className="w-full relative flex flex-col group/feed pb-10 mb-4 border-b border-white/10">
      
      {/* VIDEO CONTAINER - Wall to Wall */}
      <div className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer" onClick={togglePlay}>
        
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          playsInline
          muted={isMuted}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setError(true)}
          loop
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-white/50 text-sm">Video unavailable</p>
          </div>
        )}

        {/* Top Left Duration */}
        <div className="absolute top-4 left-4 bg-black/60 px-2 py-1 rounded text-xs font-bold text-white z-10 pointer-events-none backdrop-blur-sm">
          {video.duration || '1:22:39'}
        </div>
        
        {/* Right Side Controls */}
        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-4 z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); onMore(); }}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition"
          >
            <Plus size={20} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; }} 
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/60 transition"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 transition"
          >
            {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
          </button>
        </div>
      </div>

      {/* PROGRESS BAR (Draggable) with Green Dot */}
      <div className="flex items-center gap-2 mt-2 px-4 md:px-12">
        <div className="w-2.5 h-2.5 rounded-full bg-[#1ed760] flex-shrink-0" />
        <div 
          className="relative flex-1 h-1.5 bg-[#1c1c1e] cursor-pointer group z-30"
          style={{ touchAction: 'none' }}
        >
          <div 
            className="absolute inset-0 w-full h-full flex items-center"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="w-full h-full bg-[#1c1c1e] group-hover:h-2 transition-all relative overflow-hidden rounded-full">
              <div 
                className="h-full bg-[#E53945]" 
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            
            <div 
              className={`absolute h-3 w-3 bg-[#E53945] rounded-full shadow-md transition-opacity pointer-events-none ${isSeeking ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'}`}
              style={{ left: `calc(${progress * 100}% - 6px)` }}
            />
          </div>
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="px-4 md:px-12 pt-4">
        <div className="flex gap-4">
          
          {/* SQUARE AVATAR */}
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1c1c1e] flex-shrink-0 block shadow-sm">
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#E53945] flex items-center justify-center font-bold text-sm text-white">
                {creator?.name?.[0] || '?'}
              </div>
            )}
          </div>

          {/* TITLE & CREATOR */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-2">
              {video.title}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <span className="truncate hover:text-white transition font-medium">
                {creator?.name || 'Creator'}
              </span>
              {creator?.isVerified && <CheckCircle2 size={14} className="text-[#1ed760]" fill="currentColor" />}
              <span>•</span>
              <span>{video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Just now'}</span>
            </div>
          </div>

          {/* THREE DOTS */}
          <button onClick={onMore} className="p-1 text-white/50 hover:text-white h-fit">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

