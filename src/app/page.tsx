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
import { 
  Play, Info, ChevronRight, X, Search, Menu, Users, Compass, LogOut, LogIn, ChevronLeft
} from "lucide-react";
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
import { getAllProgress } from "@/lib/progress";
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
  viewCount?: number;
};

const COLLECTIONS = [
  { name: "History", img: "https://images.unsplash.com/photo-1599812680155-e9a864f8bf9b?auto=format&fit=crop&q=80&w=600" },
  { name: "Politics & Geopolitics", img: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&q=80&w=600" },
  { name: "War & Conflict", img: "https://images.unsplash.com/photo-1579912437766-789cd0530b3d?auto=format&fit=crop&q=80&w=600" },
  { name: "True Crime & Justice", img: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=600" },
  { name: "Conspiracy & Unsolved", img: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=600" },
  { name: "Society & Culture", img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600" },
  { name: "Business & Finance", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600" },
  { name: "Science & Technology", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600" },
  { name: "Environment & Nature", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600" },
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
  const [progressList, setProgressList] = useState<any[]>([]);

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

  useEffect(() => {
    setProgressList(getAllProgress());
    const onProg = () => setProgressList(getAllProgress());
    window.addEventListener("progress-changed", onProg);
    return () => window.removeEventListener("progress-changed", onProg);
  }, []);

  // Data slicing
  const hero = videos.find(v => v.featured) || videos[0];
  
  const newReleases = [...videos].sort((a, b) => b.id - a.id).slice(0, 10);
  
  const trooflixSelection = videos.filter(v => v.match >= 90).slice(0, 10);
  
  const mostWatched = [...videos].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 10);
  
  const continueWatching = progressList.map(p => {
    const v = videos.find(x => x.id === p.id);
    return v ? { ...v, progressSeconds: p.seconds, progressDuration: p.duration } : null;
  }).filter(Boolean).slice(0, 10) as any[];

  const handleInstantPlay = (video: Video) => {
    setSelected(null); 
    setPlaying(video);
  };

  return (
    <>
    <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
    {/* 1. COLOR PALETTE: Main Background #080808 */}
    <main className="min-h-screen bg-[#080808] text-white overflow-x-hidden pb-20 lg:pb-0 font-sans selection:bg-[#E53945] selection:text-white">
      <TopBar onMenu={() => setDrawerOpen(true)} />

      {/* CINEMATIC HERO */}
      {loaded && hero && (
        <div className="relative w-full h-[75vh] md:h-[85vh] overflow-hidden">
          <img src={hero.backdropUrl || hero.posterUrl} alt={hero.title} className="absolute inset-0 w-full h-full object-cover object-[center_20%]" />
          
          {/* Layered Gradients for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/80 to-transparent w-full md:w-2/3" />
          
          <div className="relative z-10 flex flex-col justify-end h-full max-w-[1400px] mx-auto px-6 md:px-12 pb-16 md:pb-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <p className="text-[10px] md:text-xs tracking-[0.25em] text-[#E53945] font-bold mb-3 uppercase">
                Trooflix Original
              </p>
              
              <h1 style={{ fontFamily: 'var(--font-bebas)' }} className="text-5xl md:text-7xl lg:text-8xl font-normal tracking-wide leading-[0.95] mb-4 drop-shadow-2xl">
                {hero.title}
              </h1>
              
              <p className="text-sm md:text-base text-[#B3B3B3] mb-6 leading-relaxed line-clamp-3">
                {hero.description}
              </p>
              
              <div className="flex items-center gap-3 text-[11px] md:text-sm font-semibold text-[#858585] mb-8 uppercase tracking-wider">
                <span className="text-white">{hero.year || "2026"}</span>
                <span className="text-[#303030]">|</span>
                <span>{hero.type || "Documentary"}</span>
                <span className="text-[#303030]">|</span>
                <span>{hero.duration || "6 Episodes"}</span>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => handleInstantPlay(hero)} className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-md hover:bg-gray-200 transition-colors shadow-lg">
                  <Play size={18} fill="currentColor" /> Watch Now
                </button>
                <button onClick={() => setSelected(hero)} className="flex items-center gap-2 bg-transparent border border-[#303030] text-white font-bold px-8 py-3 rounded-md hover:bg-[#171717] transition-colors">
                  <Info size={18} /> More Info
                </button>
              </div>
            </motion.div>

            {/* Slider Indicators */}
            <div className="absolute bottom-6 md:bottom-10 left-6 md:left-12 flex gap-2">
              <div className="w-8 h-[2px] bg-[#E53945] rounded-full" />
              <div className="w-8 h-[2px] bg-[#303030] rounded-full" />
              <div className="w-8 h-[2px] bg-[#303030] rounded-full" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 space-y-16 relative z-20">
        
        {/* DISCOVER OUR COLLECTIONS */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#858585] font-bold mb-1 uppercase">Discover our collections</p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Explore by <span className="text-[#E53945]">Subject</span></h2>
            </div>
            <Link href="/collections" className="text-xs font-bold text-[#858585] hover:text-white flex items-center gap-1 transition-colors">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4">
            {COLLECTIONS.slice(0, 5).map((cat) => (
              <CollectionCard key={cat.name} cat={cat} />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {COLLECTIONS.slice(5, 9).map((cat) => (
              <CollectionCard key={cat.name} cat={cat} />
            ))}
          </div>
        </section>

        {/* CONTINUE WATCHING */}
        {continueWatching.length > 0 && (
          <ContentRow title="Continue Watching" items={continueWatching} onPlay={handleInstantPlay} showProgress />
        )}

        {/* NEW RELEASES */}
        {newReleases.length > 0 && (
          <ContentRow title="New Releases" items={newReleases} onPlay={handleInstantPlay} />
        )}

        {/* THE TROOFLIX SELECTION */}
        {trooflixSelection.length > 0 && (
          <ContentRow title="The Trooflix Selection" items={trooflixSelection} onPlay={handleInstantPlay} />
        )}

        {/* MOST WATCHED */}
        {mostWatched.length > 0 && (
          <ContentRow title="Most Watched" items={mostWatched} onPlay={handleInstantPlay} />
        )}

      </div>

      {/* DRAWER NAVIGATION */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[290]" onClick={() => setDrawerOpen(false)} />
            <motion.aside initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed top-0 left-0 h-screen w-[300px] bg-[#101010] border-r border-[#303030] z-[300] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-[#303030]">
                <span className="text-2xl font-black tracking-tight"><span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span></span>
                <button onClick={() => setDrawerOpen(false)} className="p-2 bg-[#171717] rounded-full text-white"><X size={18} /></button>
              </div>
              <div className="p-4"><p className="text-sm text-[#858585]">Navigation Menu</p></div>
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

/* ============ COMPONENTS ============ */

function CollectionCard({ cat }: { cat: { name: string, img: string } }) {
  return (
    <Link 
      href={`/collections/${cat.name.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
      className="relative rounded-lg overflow-hidden group bg-[#202020] border border-[#303030] hover:border-white/30 transition-colors block"
      style={{ aspectRatio: '16/9' }}
    >
      <img src={cat.img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-transparent" />
      <div className="absolute bottom-3 left-3 pr-2">
        <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider leading-tight text-white drop-shadow-md">{cat.name}</h3>
      </div>
    </Link>
  );
}

function ContentRow({ title, items, onPlay, showProgress = false }: { title: string; items: Video[]; onPlay: (v: Video) => void; showProgress?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  
  const scroll = (dir: "left" | "right") => { 
    if (!ref.current) return; 
    const amount = ref.current.clientWidth * 0.75; 
    ref.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" }); 
  };

  return (
    <section className="relative group/row">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        <button className="text-xs font-bold text-[#858585] hover:text-white flex items-center gap-1 transition-colors">
          View All <ChevronRight size={14} />
        </button>
      </div>
      
      <div className="relative">
        <button onClick={() => scroll("left")} className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-r from-[#080808] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-start pl-2">
          <ChevronLeft size={28} className="text-white/70 hover:text-white" />
        </button>

        <div ref={ref} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 scroll-smooth">
          {items.map((item) => (
            <div 
              key={item.id} 
              onClick={() => onPlay(item)} 
              className="flex-shrink-0 w-[140px] md:w-[180px] lg:w-[210px] cursor-pointer group/card"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#202020] mb-3 relative border border-[#303030] group-hover/card:border-[#E53945]/50 transition-colors">
                <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" loading="lazy" />
                
                {/* Progress Bar for Continue Watching */}
                {showProgress && (item as any).progressSeconds && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#303030]">
                    <div className="h-full bg-[#E53945]" style={{ width: `${((item as any).progressSeconds / (item as any).progressDuration) * 100}%` }} />
                  </div>
                )}
              </div>
              
              <p className="text-sm font-bold text-white group-hover/card:text-[#E53945] transition-colors truncate">{item.title}</p>
              <p className="text-[10px] text-[#858585] uppercase tracking-wider mt-1">{item.type || "Documentary"}</p>
              <p className="text-[10px] text-[#858585]">{item.year || "2026"}</p>
            </div>
          ))}
        </div>

        <button onClick={() => scroll("right")} className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-gradient-to-l from-[#080808] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center justify-end pr-2">
          <ChevronRight size={28} className="text-white/70 hover:text-white" />
        </button>
      </div>
    </section>
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
      <motion.div key={item.id} ref={modalContentRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="bg-[#101010] border border-[#303030] shadow-2xl rounded-xl relative w-full max-w-4xl overflow-y-auto" style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative h-[260px] md:h-[420px] w-full overflow-hidden">
          <img src={item.backdropUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101010] via-[#101010]/50 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/90 rounded-full p-2 transition text-white"><X size={20} /></button>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <h2 className="text-3xl md:text-5xl font-black mb-4 drop-shadow-lg">{item.title}</h2>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => onPlay(item)} className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded-md shadow-lg hover:bg-gray-200 transition-all active:scale-95"><Play size={18} fill="currentColor" /> Play</button>
              <SaveButton videoId={item.id} variant="labeled" size={18} />
            </div>
          </div>
        </div>
        <div className="p-6 md:p-10 space-y-6">
          <p className="text-[#B3B3B3] leading-relaxed text-sm md:text-base">{item.description}</p>
          <div className="flex items-center gap-3 pt-4 border-t border-[#303030]">
            {uploaderPhoto ? <img src={uploaderPhoto} alt={uploaderName} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-[#202020] flex items-center justify-center font-bold text-white">{uploaderName[0]}</div>}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-[#858585]">Uploaded by</p>
              <p className="font-semibold text-white truncate">{uploaderName}</p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#171717] hover:bg-[#202020] transition flex-shrink-0"><LikeButton videoId={item.id} size={20} stacked /></div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
