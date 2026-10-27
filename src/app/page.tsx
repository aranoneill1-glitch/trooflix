"use client";

if (typeof window !== "undefined") {
  window.onerror = function(msg, url, line, col, err) {
    document.body.innerHTML = '<div style="background:#000;color:#f00;padding:20px;font-family:monospace;font-size:14px;white-space:pre-wrap;">ERROR: ' + msg + '\n\nLine: ' + line + ':' + col + '\n\nURL: ' + url + '</div>';
    return false;
  };
}

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Play, Info, ChevronRight, X, Search, Menu, Users, Compass, LogOut, LogIn } from "lucide-react";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import PullToRefresh from "@/components/PullToRefresh";
import UserMenu from "@/components/UserMenu";
import { useSearch } from "@/context/SearchContext";
import TopBar from "@/components/TopBar";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import MobileBottomNav from "@/components/MobileBottomNav";
import TextOverlayRenderer from "@/components/TextOverlay";
import { getCachedCreators, getCachedUser } from "@/lib/cache";

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

const CATEGORIES_TOP = [
  { name: "History", color: "from-amber-900 to-black", bg: "url('https://images.unsplash.com/photo-1599812680155-e9a864f8bf9b?auto=format&fit=crop&q=80&w=600')" },
  { name: "Politics & Geopolitics", color: "from-blue-900 to-black", bg: "url('https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&q=80&w=600')" },
  { name: "War & Conflict", color: "from-stone-800 to-black", bg: "url('https://images.unsplash.com/photo-1579912437766-789cd0530b3d?auto=format&fit=crop&q=80&w=600')" },
  { name: "True Crime & Justice", color: "from-red-950 to-black", bg: "url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600')" },
  { name: "Conspiracy & Unsolved", color: "from-purple-950 to-black", bg: "url('https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600')" },
];

const CATEGORIES_BOTTOM = [
  { name: "Society & Culture", color: "from-pink-950 to-black", bg: "url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600')" },
  { name: "Business & Finance", color: "from-emerald-950 to-black", bg: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600')" },
  { name: "Science & Technology", color: "from-cyan-950 to-black", bg: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600')" },
  { name: "Environment & Nature", color: "from-green-950 to-black", bg: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600')" },
];

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const { search } = useSearch();
  
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCachedCreators().then(setCreators).catch(() => {});
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setVideos(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const hero = videos.find(v => v.featured) || videos[0];
  const newReleases = videos.slice(0, 6);

  const handleInstantPlay = (video: Video) => {
    setSelected(null); 
    setPlaying(video);
  };

  return (
    <>
    <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
    <main className="min-h-screen bg-[#050505] text-white overflow-x-hidden pb-20 lg:pb-0">
      <TopBar onMenu={() => setDrawerOpen(true)} />

      {/* HERO SECTION - Fixed Overlap & Size */}
      {loaded && hero && (
        <div className="relative w-full h-[70vh] mt-16 md:mt-0">
          <img src={hero.backdropUrl || hero.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent" />
          
          <div className="relative z-10 flex flex-col justify-end h-full max-w-[1400px] mx-auto px-6 md:px-12 pb-12 md:pb-20">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] md:text-xs tracking-[0.25em] text-red-500 font-bold mb-2 uppercase">
              Trooflix Original
            </motion.p>
            
            <motion.h1 style={{ fontFamily: 'var(--font-bebas)' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-normal tracking-wide leading-none mb-3 drop-shadow-lg">
              {hero.title}
            </motion.h1>
            
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-xs md:text-sm font-bold tracking-[0.1em] mb-4 uppercase">
              The Man Behind The Money.
            </motion.p>
            
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-sm md:text-base text-white/70 max-w-lg mb-6 leading-relaxed line-clamp-3">
              {hero.description}
            </motion.p>
            
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex items-center gap-3 text-[11px] md:text-xs font-bold text-white/80 mb-8 uppercase tracking-wider">
              <span>{hero.year || "2026"}</span>
              <span className="text-white/30">|</span>
              <span>{hero.type || "Documentary"}</span>
              <span className="text-white/30">|</span>
              <span>{hero.duration || "6 Episodes"}</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-3">
              <button onClick={() => handleInstantPlay(hero)} className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-md hover:bg-gray-200 transition shadow-lg text-sm">
                <Play size={16} fill="currentColor" /> Watch Now
              </button>
              <button onClick={() => setSelected(hero)} className="flex items-center gap-2 bg-transparent border border-white/30 text-white font-bold px-6 py-2.5 rounded-md hover:bg-white/10 transition text-sm">
                <Info size={16} /> More Info
              </button>
            </motion.div>

            {/* Slider Indicators */}
            <div className="absolute bottom-6 md:bottom-10 left-6 md:left-12 flex gap-2">
              <div className="w-6 h-[2px] bg-red-600 rounded-full" />
              <div className="w-6 h-[2px] bg-white/20 rounded-full" />
              <div className="w-6 h-[2px] bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10 space-y-12 relative z-20">
        
        {/* EXPLORE BY SUBJECT */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-white/40 font-bold mb-1 uppercase">Discover our collections</p>
              <h2 className="text-2xl md:text-3xl font-black">Explore by <span className="text-red-500">Subject</span></h2>
            </div>
            <Link href="/collections" className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1 transition">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          
          {/* Top Row (5 items) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-3 md:mb-4">
            {CATEGORIES_TOP.map((cat) => (
              <Link 
                key={cat.name} 
                href={`/collections/${cat.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                className={`relative rounded-lg overflow-hidden group border border-white/5 bg-gradient-to-br ${cat.color}`}
                style={{ aspectRatio: '16/9' }}
              >
                <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition duration-700 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: cat.bg }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 pr-2">
                  <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight text-white">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Bottom Row (4 items) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {CATEGORIES_BOTTOM.map((cat) => (
              <Link 
                key={cat.name} 
                href={`/collections/${cat.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                className={`relative rounded-lg overflow-hidden group border border-white/5 bg-gradient-to-br ${cat.color}`}
                style={{ aspectRatio: '16/9' }}
              >
                <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition duration-700 bg-cover bg-center mix-blend-overlay" style={{ backgroundImage: cat.bg }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 pr-2">
                  <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight text-white">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* NEW RELEASES */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl md:text-3xl font-black">New <span className="text-red-500">Releases</span></h2>
            <Link href="/documentaries" className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1 transition">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-5">
            {newReleases.map(v => (
              <div key={v.id} onClick={() => handleInstantPlay(v)} className="cursor-pointer group flex flex-col">
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#0f0f12] mb-3 relative border border-white/5">
                  <img src={v.posterUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                </div>
                <p className="text-sm font-bold truncate group-hover:text-red-400 transition-colors leading-tight">{v.title}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5">{v.type || "Documentary"}</p>
                <p className="text-[10px] text-white/40">{v.year || "2026"}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* DRAWER NAVIGATION */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[290]" onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-screen w-[300px] bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 z-[300] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                <span className="text-2xl font-black tracking-tight"><span className="text-white">TROO</span><span className="text-red-600">FLIX</span></span>
                <button onClick={() => setDrawerOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-white/70 hover:text-white"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                 <p className="text-sm text-white/50">Navigation Menu</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onPlay={handleInstantPlay} creators={creators} />}
      </AnimatePresence>

      {playing && (
        <AppleVideoPlayer
          src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
          title={playing.title}
          textOverlays={playing?.textOverlays}
          chapters={(playing as any).chapters || []}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
    </PullToRefresh>
    <MobileBottomNav />
    </>
  );
}

/* ============ MODAL ============ */
function DetailModal({ item, onClose, onPlay, creators }: { item: Video; onClose: () => void; onPlay: (v: Video) => void; creators?: any[] }) {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const uploader = item.creatorId ? (creators || []).find((c: any) => c.id === item.creatorId) || null : null;
  const uploaderName = uploader?.name || "TROOFLIX";
  const uploaderPhoto = uploader?.photoUrl || "";
  const uploaderSlug = uploader?.slug || "";
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div key={item.id} ref={modalContentRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="bg-[#141414] shadow-2xl rounded-lg relative w-full max-w-4xl overflow-y-auto" style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative h-[260px] md:h-[420px] w-full overflow-hidden">
          <img src={item.backdropUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/30 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-black/70 hover:bg-black/90 rounded-full p-2 transition" aria-label="Close"><X size={20} /></button>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
            <h2 className="text-3xl md:text-5xl font-black mb-2 md:mb-3 drop-shadow-lg">{item.title}</h2>
            <div className="flex gap-2 md:gap-3 flex-wrap mt-4">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-lg hover:bg-gray-200 transition-all active:scale-95"><Play size={18} fill="currentColor" /> Play</button>
              <SaveButton videoId={item.id} variant="labeled" size={18} />
            </div>
          </div>
        </div>
        <div className="p-5 md:p-10 space-y-5">
          {item.description && <p className="text-white/90 leading-relaxed text-sm md:text-base">{item.description}</p>}
          <div className="flex items-center gap-3 pt-2 border-t border-white/10">
            {uploaderPhoto ? <img src={uploaderPhoto} alt={uploaderName} className="w-10 h-10 rounded-full object-cover border border-white/20" /> : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold text-white">{uploaderName[0]}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-white/40">Uploaded by</p>
              {uploaderSlug ? <a href={`/podcaster/${uploaderSlug}`} className="font-semibold text-white hover:underline block truncate">{uploaderName}</a> : <p className="font-semibold text-white truncate">{uploaderName}</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
