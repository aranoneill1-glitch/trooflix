"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators, getCachedVideos } from "@/lib/cache";
import { Search, Sparkles } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { motion } from "framer-motion";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  description: string;
  heroBackdropUrl?: string;
  category?: string;
  verification_tick?: string;
};

type Video = {
  id: number;
  creatorId?: number | null;
  type?: string;
};

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    Promise.all([getCachedCreators(), getCachedVideos()])
      .then(([creatorData, videoData]) => {
        setCreators(Array.isArray(creatorData) ? creatorData : []);
        setVideos(Array.isArray(videoData) ? videoData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const creatorContentTypes = useMemo(() => {
    const map = new Map<number, Set<string>>();
    videos.forEach(v => {
      if (v.creatorId) {
        const current = map.get(v.creatorId) || new Set<string>();
        if (v.type) current.add(v.type);
        map.set(v.creatorId, current);
      }
    });
    return map;
  }, [videos]);

  const filteredCreators = useMemo(() => {
    let result = creators;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (activeTab === "long-videos") {
      result = result.filter(c => creatorContentTypes.get(Number(c.id))?.has("long-video"));
    } else if (activeTab === "Documentaries") {
      result = result.filter(c => creatorContentTypes.get(Number(c.id))?.has("long-video"));
    }
    return result;
  }, [creators, searchQuery, activeTab, creatorContentTypes]);

  const TABS = ["All", "long-videos", "Documentaries"];

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="pt-28 md:pt-32 max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-bold mb-3 uppercase flex items-center gap-2">
              <Sparkles size={14} /> The Home of Independent Voices
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Discover Creators
            </h1>
          </div>
          
          <div className="relative w-full md:w-80 group">
            <div className="absolute inset-0 bg-[#E53945]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full pointer-events-none" />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#E53945] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators..."
              className="relative w-full bg-[#171717] border border-[#303030] rounded-full pl-11 pr-4 py-3.5 text-sm outline-none focus:border-[#E53945] transition placeholder:text-white/30 text-white shadow-xl"
            />
          </div>
        </div>

        <div className="flex overflow-x-auto gap-2 mb-8 scrollbar-hide pb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 border ${
                activeTab === tab 
                  ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                  : "bg-[#171717] text-white/60 border-[#303030] hover:bg-[#202020] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="text-center py-20 bg-[#0a0a0a] rounded-3xl border border-white/5">
            <Search size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 text-lg">No creators found.</p>
            <p className="text-white/30 text-sm mt-1">Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredCreators.map((c, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                key={c.id}
              >
                <Link href={`/creator/${c.slug}`} className="group relative flex flex-col w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] hover:border-[#E53945]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(229,57,69,0.15)]">
                  <img 
                    src={c.heroBackdropUrl || c.photoUrl || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=600&fit=crop"} 
                    alt={c.name} 
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-80 group-hover:opacity-100" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-90" />
                  
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 flex flex-col items-center text-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-white/20 mb-3 shadow-xl group-hover:border-[#E53945]/50 transition-colors bg-[#1c1c1e]">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#E53945] flex items-center justify-center text-xl font-black text-white">{c.name?.[0]}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mb-1 w-full">
                      <h3 className="font-bold text-sm md:text-base text-white truncate max-w-full group-hover:text-[#E53945] transition-colors">{c.name}</h3>
                      {c.verification_tick && c.verification_tick !== "none" && <VerifiedBadge size={14} variant={c.verification_tick as any} />}
                    </div>
                    <p className="text-[10px] md:text-xs text-white/50 font-semibold uppercase tracking-wider">{c.category || "Creator"}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
