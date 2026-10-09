"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Info, ChevronLeft, ChevronRight, Plus, ThumbsUp, X,
  Search, User, Home as HomeIcon, Film, FileText, Mic, Tv, List, Menu,
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

const CATEGORIES = [
  "History Revisionism",
  "Politics and Power",
  "True Crime",
  "Health and Science",
  "Technology and Control",
  "Religion and Belief",
  "Ancient Civilisations",
  "Uncensored",
];

const NAV_TABS = ["HOME", "MOVIES", "DOCUMENTARIES", "PODCASTS", "SERIES", "MY LIST"];

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState("HOME");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/videos").then((r) => r.json()).then(setVideos);
  }, []);

  // Row logic — exactly as the mockup
  const trending = videos.filter((v) => v.featured);
  const docs = videos.filter((v) => v.type === "Documentary");
  const podcasts = videos.filter((v) => v.type === "Podcast");
  const newReleases = [...videos].sort((a, b) => b.id - a.id).slice(0, 20);

  // Filtering when a tab/category is selected
  let displayVideos = videos;
  if (activeCategory) displayVideos = videos.filter((v) => v.category === activeCategory);
  else if (activeTab === "MOVIES") displayVideos = videos.filter((v) => v.type === "Movie");
  else if (activeTab === "DOCUMENTARIES") displayVideos = videos.filter((v) => v.type === "Documentary");
  else if (activeTab === "PODCASTS") displayVideos = videos.filter((v) => v.type === "Podcast");
  else if (activeTab === "SERIES") displayVideos = videos.filter((v) => v.type === "Series");

  const filtered = search
    ? videos.filter((v) => v.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  const hero = trending[0] || videos[0];

  const showingFiltered = activeCategory || activeTab !== "HOME" || filtered;

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <TopNav
        activeTab={activeTab}
        setActiveTab={(t) => { setActiveTab(t); setActiveCategory(null); }}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        search={search}
        setSearch={setSearch}
        onMenu={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex w-full min-h-screen">
        <Sidebar
          open={sidebarOpen}
          activeCategory={activeCategory}
          setActiveCategory={(c) => { setActiveCategory(c); setActiveTab("HOME"); }}
        />

        <div className="flex-1 min-w-0">
          {!showingFiltered && hero && (
            <Hero video={hero} onPlay={() => setPlaying(hero)} onMore={() => setSelected(hero)} />
          )}

          <div className={showingFiltered ? "pt-24 pb-24 px-8 space-y-10" : "relative z-20 -mt-24 pb-24 space-y-10"}>
            {filtered && (
              <div>
                <h2 className="text-xl font-bold mb-4">Search results for "{search}" ({filtered.length})</h2>
                <Grid items={filtered} onSelect={setSelected} onPlay={setPlaying} />
              </div>
            )}

            {!filtered && showingFiltered && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{activeCategory || activeTab}</h2>
                {displayVideos.length === 0 ? (
                  <p className="text-white/40">No videos in this section yet.</p>
                ) : (
                  <Grid items={displayVideos} onSelect={setSelected} onPlay={setPlaying} />
                )}
              </div>
            )}

            {!filtered && !showingFiltered && (
              <>
                {trending.length > 0 && <Row title="Trending Now" items={trending} onSelect={setSelected} onPlay={setPlaying} />}
                {docs.length > 0 && <Row title="Popular Documentaries" items={docs} onSelect={setSelected} onPlay={setPlaying} />}
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
        </div>
      </div>

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

/* ---------- TOP NAV ---------- */
function TopNav({ activeTab, setActiveTab, searchOpen, setSearchOpen, search, setSearch, onMenu }: any) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-6 px-6 py-3 bg-black/95 backdrop-blur border-b border-white/5">
      <button onClick={onMenu} className="text-white/80 hover:text-white">
        <Menu size={22} />
      </button>

      <a href="/" className="text-2xl font-black tracking-tight shrink-0">
        <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
      </a>

      <div className="hidden lg:flex gap-6 text-sm ml-4">
        {NAV_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`transition tracking-wide ${activeTab === tab ? "text-red-600 border-b-2 border-red-600 pb-1" : "text-white/70 hover:text-white"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4">
        {searchOpen ? (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => !search && setSearchOpen(false)}
            placeholder="Search Trooflix…"
            className="bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm w-64 outline-none focus:border-red-600"
          />
        ) : (
          <button onClick={() => setSearchOpen(true)} className="text-white/80 hover:text-white">
            <Search size={20} />
          </button>
        )}
        <a href="/admin" className="text-white/80 hover:text-white" title="Admin">
          <User size={22} />
        </a>
      </div>
    </nav>
  );
}

/* ---------- SIDEBAR ---------- */
function Sidebar({ open, activeCategory, setActiveCategory }: any) {
  const items = [
    { icon: HomeIcon, label: "Home", action: () => setActiveCategory(null) },
    { icon: Film, label: "Movies" },
    { icon: FileText, label: "Documentaries" },
    { icon: Mic, label: "Podcasts" },
    { icon: Tv, label: "Series" },
    { icon: Plus, label: "My List" },
  ];

  return (
    <aside className={`${open ? "block" : "hidden"} lg:block w-60 shrink-0 bg-[#0b0b0f] border-r border-white/5 min-h-screen pt-20 pb-8 px-4 fixed lg:sticky top-0 h-screen overflow-y-auto`}>
      <div className="space-y-1 mb-8">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.action}
            className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-white/5 text-white/80 hover:text-white transition text-sm"
          >
            <it.icon size={18} />
            {it.label}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold tracking-widest text-white/40 px-3 mb-3">EXPLORE</p>
      <div className="space-y-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={`block w-full text-left px-3 py-1.5 rounded text-sm transition ${activeCategory === cat ? "text-red-600 bg-white/5" : "text-white/70 hover:text-white hover:bg-white/5"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-12 px-3 text-xs leading-relaxed tracking-widest text-red-600 font-bold">
        REAL STORIES.<br />UNCENSORED.<br />TROOFLIX.
      </div>
    </aside>
  );
}

/* ---------- HERO ---------- */
function Hero({ video, onPlay, onMore }: { video: Video; onPlay: () => void; onMore: () => void }) {
  return (
    <section className="relative h-[70vh] w-full">
      <img src={video.backdropUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] via-[#0b0b0f]/30 to-transparent" />

      <div className="relative z-10 flex flex-col justify-center h-full px-12 max-w-3xl pt-16">
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-black leading-tight mb-3 tracking-tight"
        >
          <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-lg text-white/85 mb-2 font-medium"
        >
          The stories they don't want you to see. Now streaming.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="text-xs tracking-[0.4em] text-white/60 mb-6"
        >
          HISTORY / TRUE STORIES / UNCENSORED
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          <button onClick={onPlay} className="flex items-center gap-2 bg-red-600 text-white font-bold px-8 py-3 rounded hover:bg-red-500 transition tracking-wide">
            <Play size={20} fill="white" /> WATCH NOW
          </button>
          <button onClick={onMore} className="flex items-center gap-2 bg-white/10 backdrop-blur text-white font-semibold px-6 py-3 rounded hover:bg-white/20 transition">
            <Info size={20} /> More Info
          </button>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- ROW ---------- */
function Row({ title, items, onSelect, onPlay }: { title: string; items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="relative group/row">
      <h2 className="text-xl font-bold px-8 mb-3">{title}</h2>
      <div className="relative">
        <button className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/60 opacity-0 group-hover/row:opacity-100 transition flex items-center justify-center">
          <ChevronLeft size={28} />
        </button>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-8 pb-4">
          {items.map((item) => (
            <Card key={item.id} item={item} hovered={hovered === item.id} onHover={() => setHovered(item.id)} onLeave={() => setHovered(null)} onSelect={onSelect} onPlay={onPlay} />
          ))}
        </div>
        <button className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/60 opacity-0 group-hover/row:opacity-100 transition flex items-center justify-center">
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
}

/* ---------- GRID (for filtered views) ---------- */
function Grid({ items, onSelect, onPlay }: { items: Video[]; onSelect: (v: Video) => void; onPlay: (v: Video) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((item) => (
        <Card key={item.id} item={item} hovered={hovered === item.id} onHover={() => setHovered(item.id)} onLeave={() => setHovered(null)} onSelect={onSelect} onPlay={onPlay} />
      ))}
    </div>
  );
}

/* ---------- CARD ---------- */
function Card({ item, hovered, onHover, onLeave, onSelect, onPlay }: any) {
  return (
    <motion.div
      onMouseEnter={onHover} onMouseLeave={onLeave} onClick={() => onSelect(item)}
      animate={{ scale: hovered ? 1.08 : 1 }} transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative flex-shrink-0 w-[140px] md:w-[160px] aspect-[2/3] rounded-md overflow-hidden cursor-pointer z-10 hover:z-40"
    >
      <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2">
        <p className="text-[11px] font-bold leading-tight uppercase tracking-wide">{item.title}</p>
      </div>
      {hovered && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm p-3 flex flex-col justify-end">
          <p className="text-xs font-bold mb-2 leading-tight">{item.title}</p>
          <div className="flex items-center gap-1.5 text-[10px] text-white/80 mb-2 flex-wrap">
            <span className="text-green-400 font-bold">{item.match}%</span>
            <span className="border border-white/40 px-1">{item.rating}</span>
            <span>{item.year}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onPlay(item); }} className="bg-white text-black rounded-full p-1.5 hover:bg-white/80"><Play size={12} fill="black" /></button>
            <button className="border border-white/60 rounded-full p-1.5 hover:border-white"><Plus size={12} /></button>
            <button className="border border-white/60 rounded-full p-1.5 hover:border-white"><ThumbsUp size={12} /></button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ---------- MODAL ---------- */
function DetailModal({ item, onClose, onPlay }: { item: Video; onClose: () => void; onPlay: (v: Video) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()} className="relative max-w-4xl mx-auto my-12 rounded-lg overflow-hidden bg-[#141418] shadow-2xl">
        <div className="relative h-[400px] w-full">
          <img src={item.backdropUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/40 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 rounded-full p-2 transition"><X size={20} /></button>
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h2 className="text-5xl font-black mb-6 drop-shadow-lg">{item.title}</h2>
            <div className="flex gap-3">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white text-black font-semibold px-8 py-3 rounded hover:bg-white/80 transition">
                <Play size={20} fill="black" /> Play
              </button>
              <button className="border-2 border-white/60 rounded-full p-3 hover:border-white transition"><Plus size={20} /></button>
              <button className="border-2 border-white/60 rounded-full p-3 hover:border-white transition"><ThumbsUp size={20} /></button>
            </div>
          </div>
        </div>
        <div className="p-8 grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 text-sm text-white/80 mb-4">
              <span className="text-green-400 font-bold">{item.match}% Match</span>
              <span>{item.year}</span>
              <span className="border border-white/40 px-2 py-0.5">{item.rating}</span>
              <span className="text-white/50">{item.type}</span>
            </div>
            <p className="text-white/90 leading-relaxed">{item.description}</p>
          </div>
          <div className="text-sm">
            <p className="text-white/50 mb-1">Category</p>
            <p className="text-white/90">{item.category}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
