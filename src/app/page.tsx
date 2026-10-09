"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Info, ChevronLeft, ChevronRight, Plus, ThumbsUp, X,
  Search, Bell, Home as HomeIcon, Film, FileText, Mic, Tv, Menu,
  Compass, Download, User,
} from "lucide-react";
import BitChutePlayer from "@/components/BitChutePlayer";
import VideoPlayer from "@/components/VideoPlayer";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  duration: string;
};

const CATEGORIES: string[] = [
  "History Revisionism",
  "Politics and Power",
  "True Crime",
  "Health and Science",
  "Technology and Control",
  "Religion and Belief",
  "Ancient Civilisations",
  "Uncensored",
];

const NAV_TABS: string[] = ["Home", "Movies", "Documentaries", "Podcasts", "Series"];

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState("Home");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/videos").then((r) => r.json()).then(setVideos);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const trending = videos.filter((v) => v.featured);
  const docs = videos.filter((v) => v.type === "Documentary");
  const podcasts = videos.filter((v) => v.type === "Podcast");
  const newReleases = [...videos].sort((a, b) => b.id - a.id).slice(0, 20);

  let displayVideos = videos;
  if (activeCategory) displayVideos = videos.filter((v) => v.category === activeCategory);
  else if (activeTab === "Movies") displayVideos = videos.filter((v) => v.type === "Movie");
  else if (activeTab === "Documentaries") displayVideos = videos.filter((v) => v.type === "Documentary");
  else if (activeTab === "Podcasts") displayVideos = videos.filter((v) => v.type === "Podcast");
  else if (activeTab === "Series") displayVideos = videos.filter((v) => v.type === "Series");

  const filtered = search
    ? videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  const hero = trending[0] || videos[0];
  const showingFiltered = activeCategory || activeTab !== "Home" || filtered;

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ============ TOP NAV ============ */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={(t: string) => { setActiveTab(t); setActiveCategory(null); }}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        search={search}
        setSearch={setSearch}
        onMenu={() => setDrawerOpen(true)}
        scrolled={scrolled}
      />

      {/* ============ DRAWER (categories) ============ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[60]"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 h-screen w-72 bg-black border-r border-white/10 z-[70] pt-6 pb-8 px-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-2xl font-black tracking-tight">
                  <span className="text-red-600">TRU</span><span className="text-white">FLIX</span>
                </span>
                <button onClick={() => setDrawerOpen(false)} className="text-white/60 hover:text-white">
                  <X size={22} />
                </button>
              </div>

              <p className="text-xs font-bold tracking-widest text-white/40 mb-3">EXPLORE</p>
              <div className="space-y-0.5 mb-8">
                {CATEGORIES.map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat === activeCategory ? null : cat); setActiveTab("Home"); setDrawerOpen(false); }}
                    className={`block w-full text-left px-3 py-2.5 rounded text-sm transition ${activeCategory === cat ? "text-red-600 bg-white/5" : "text-white/70 hover:text-white hover:bg-white/5"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="text-xs leading-relaxed tracking-widest text-red-600 font-bold opacity-80">
                REAL STORIES.<br />UNCENSORED.<br />TRUFLIX.
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ============ CONTENT ============ */}
      {!showingFiltered && hero && (
        <Hero video={hero} onPlay={() => setPlaying(hero)} onMore={() => setSelected(hero)} />
      )}
      {showingFiltered && <div className="h-20 md:h-24" />}

      <div className="relative z-10 pt-8 md:pt-12 pb-32 md:pb-20 space-y-8 md:space-y-12">
        {filtered && (
          <div className="px-4 md:px-12">
            <h2 className="text-xl md:text-2xl font-bold mb-6">Results for "{search}"</h2>
            <Grid items={filtered} onSelect={setSelected} onPlay={setPlaying} />
          </div>
        )}

        {!filtered && showingFiltered && (
          <div className="px-4 md:px-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">{activeCategory || activeTab}</h2>
            {displayVideos.length === 0 ? (
              <p className="text-white/40">No videos yet.</p>
            ) : (
              <Grid items={displayVideos} onSelect={setSelected} onPlay={setPlaying} />
            )}
          </div>
        )}

        {!filtered && !showingFiltered && (
          <>
            {trending.length > 0 && <Row title="Trending Now" items={trending} onSelect={setSelected} onPlay={setPlaying} />}
            {docs.length > 0 && <Row title="Documentaries" items={docs} onSelect={setSelected} onPlay={setPlaying} />}
            {podcasts.length > 0 && <Row title="Podcasts" items={podcasts} onSelect={setSelected} onPlay={setPlaying} />}
            {newReleases.length > 0 && <Row title="New Releases" items={newReleases} onSelect={setSelected} onPlay={setPlaying} />}
            {videos.length === 0 && (
              <div className="px-8 py-20 text-center text-white/50">
                <p className="text-xl mb-2">No videos yet</p>
                <a href="/admin" className="text-red-500 hover:underline">Go to /admin to add your first video</a>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============ MOBILE BOTTOM NAV ============ */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(t: string) => { setActiveTab(t); setActiveCategory(null); }}
        onExplore={() => setDrawerOpen(true)}
      />

      {/* ============ MODAL / PLAYER ============ */}
      <AnimatePresence>
        {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onPlay={(v) => { setSelected(null); setPlaying(v); }} />}
        {playing && playing.bitchuteUrl.includes("bitchute.com") && (
          <BitChutePlayer src={playing.bitchuteUrl} title={playing.title} onClose={() => setPlaying(null)} />
        )}
        {playing && !playing.bitchuteUrl.includes("bitchute.com") && (
          <VideoPlayer src={playing.bitchuteUrl} title={playing.title} onClose={() => setPlaying(null)} />
        )}
      </AnimatePresence>
    </main>
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
        <span className="text-red-600">TRU</span><span className="text-white">FLIX</span>
      </a>

      <div className="hidden lg:flex gap-6 text-sm ml-6">
        {NAV_TABS.map((tab: string) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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
        <a href="/admin" className="text-white/90 hover:text-white" title="Admin">
          <User size={22} />
        </a>
      </div>
    </nav>
  );
}

/* ============ MOBILE BOTTOM NAV ============ */
function MobileBottomNav({ activeTab, setActiveTab, onExplore }: any) {
  const items = [
    { icon: HomeIcon, label: "Home", tab: "Home" },
    { icon: Film, label: "Movies", tab: "Movies" },
    { icon: Compass, label: "Explore", action: onExplore },
    { icon: Mic, label: "Podcasts", tab: "Podcasts" },
    { icon: Plus, label: "My List", tab: "My List" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-white/10">
      <div className="flex justify-around items-center py-2">
        {items.map((it) => {
          const active = activeTab === it.tab;
          return (
            <button
              key={it.label}
              onClick={() => (it.action ? it.action() : setActiveTab(it.tab))}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <it.icon size={22} className={active ? "text-white" : "text-white/50"} />
              <span className={`text-[10px] ${active ? "text-white font-semibold" : "text-white/50"}`}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ============ HERO ============ */
function Hero({ video, onPlay, onMore }: { video: Video; onPlay: () => void; onMore: () => void }) {
  return (
    <section className="relative h-[70vh] md:h-[85vh] w-full">
      <img src={video.backdropUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />

      <div className="relative z-10 flex flex-col justify-center h-full px-4 md:px-12 max-w-2xl pt-24 md:pt-20 pb-12 md:pb-0">
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs md:text-sm tracking-[0.3em] text-red-500 font-bold mb-3"
        >
          TRUFLIX ORIGINAL
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
          <span className="text-green-500 font-bold">{video.match}% Match</span>
          <span className="text-white/70">{video.year}</span>
          <span className="border border-white/40 px-1.5 py-0.5 text-xs">{video.rating}</span>
          <span className="text-white/70">{video.type}</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-sm md:text-base text-white/85 mb-6 line-clamp-3 max-w-xl"
        >
          {video.description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="flex gap-3"
        >
          <button onClick={onPlay} className="flex items-center gap-2 bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded hover:bg-white/80 transition">
            <Play size={20} fill="black" /> Play
          </button>
          <button onClick={onMore} className="flex items-center gap-2 bg-white/20 backdrop-blur text-white font-semibold px-5 md:px-7 py-2.5 md:py-3 rounded hover:bg-white/30 transition">
            <Info size={20} /> More Info
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/* ============ ROW ============ */
function Row({ title, items, onSelect, onPlay }: { title: string; items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void }) {
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
function Card({ item, hovered, onHover, onLeave, onSelect, onPlay }: any) {
  return (
    <motion.div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={() => onSelect(item)}
      animate={{ scale: hovered ? 1.08 : 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-shrink-0 w-[140px] md:w-[180px] aspect-[2/3] rounded overflow-hidden cursor-pointer z-10 hover:z-40 shadow-lg"
    >
      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />

      {/* Netflix-style bottom label */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-2 md:p-2.5">
        <p className="text-[11px] md:text-xs font-bold leading-tight line-clamp-2">{item.title}</p>
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
            <button className="border border-white/60 rounded-full p-1.5 hover:border-white">
              <Plus size={12} />
            </button>
            <button className="border border-white/60 rounded-full p-1.5 hover:border-white">
              <ThumbsUp size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ============ MODAL ============ */
function DetailModal({ item, onClose, onPlay }: { item: Video; onClose: () => void; onPlay: (v: Video) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl mx-auto md:my-16 bg-[#141414] rounded-lg overflow-hidden shadow-2xl w-full"
      >
        <div className="relative h-[240px] md:h-[440px] w-full">
          <img src={item.backdropUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-black/70 hover:bg-black/90 rounded-full p-2 transition"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
            <h2 className="text-3xl md:text-5xl font-black mb-4 md:mb-6 drop-shadow-lg">{item.title}</h2>
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={() => onPlay(item)}
                className="flex items-center gap-2 bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded hover:bg-white/80 transition"
              >
                <Play size={18} fill="black" /> Play
              </button>
              <button className="border-2 border-white/50 rounded-full p-2.5 md:p-3 hover:border-white transition">
                <Plus size={18} />
              </button>
              <button className="border-2 border-white/50 rounded-full p-2.5 md:p-3 hover:border-white transition">
                <ThumbsUp size={18} />
              </button>
              <button className="border-2 border-white/50 rounded-full p-2.5 md:p-3 hover:border-white transition ml-auto">
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="p-5 md:p-10 md:grid md:grid-cols-3 md:gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base mb-4 flex-wrap">
              <span className="text-green-500 font-bold">{item.match}% Match</span>
              <span className="text-white/70">{item.year}</span>
              <span className="border border-white/40 px-2 py-0.5 text-xs">{item.rating}</span>
              <span className="text-white/70 text-xs">HD</span>
            </div>
            <p className="text-white/90 leading-relaxed text-sm md:text-base">{item.description}</p>
          </div>
          <div className="text-sm mt-4 md:mt-0">
            <p className="text-white/40 mb-1">Category</p>
            <p className="text-white/90 mb-4">{item.category}</p>
            <p className="text-white/40 mb-1">Type</p>
            <p className="text-white/90">{item.type}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
