"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators, getCachedVideos } from "@/lib/cache";
import { Search, Film, ArrowRight } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  description: string;
  heroBackdropUrl?: string;
  category?: string;
  isVerified?: boolean;
};

type Video = {
  id: number;
  creatorId?: number | null;
  type?: string;
};

export default function DocumentariesPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([getCachedCreators(), getCachedVideos()])
      .then(([creatorData, videoData]) => {
        setCreators(Array.isArray(creatorData) ? creatorData : []);
        setVideos(Array.isArray(videoData) ? videoData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter to find creators who have uploaded Documentaries
  const documentarians = useMemo(() => {
    const docCreatorIds = new Set(
      videos.filter(v => v.type === "Documentary" && v.creatorId).map(v => Number(v.creatorId))
    );
    let result = creators.filter(c => docCreatorIds.has(Number(c.id)));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [creators, videos, searchQuery]);

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24">
      <TopBar />

      <div className="pt-28 md:pt-32 max-w-7xl mx-auto px-4 md:px-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-red-500 font-bold mb-2 uppercase">
              Watch the truth
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Discover <span className="text-white/40">Documentaries</span>
            </h1>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documentaries..."
              className="w-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-red-500 transition placeholder:text-white/30"
            />
          </div>
        </div>

        {/* AVATAR SCROLLING ROW */}
        {documentarians.length > 0 && !searchQuery && (
          <div className="mb-12">
            <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4">
              {documentarians.slice(0, 15).map((c) => (
                <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-tr from-red-600 to-orange-500 group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-[#1c1c1e]">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold">{c.name?.[0]}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-24 text-center">{c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* GRID */}
        <div>
          <h2 className="text-2xl font-black mb-6">All Documentary Makers</h2>
          {loading ? (
            <p className="text-white/40 py-12 text-center">Loading…</p>
          ) : documentarians.length === 0 ? (
            <div className="text-center py-20 bg-[#0a0a0a] rounded-2xl border border-white/5">
              <Film size={48} className="mx-auto text-white/20 mb-4" />
              <p className="text-white/40">No documentaries found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {documentarians.map((c) => (
                <Link
                  key={c.id}
                  href={`/podcaster/${c.slug}`}
                  className="group relative bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141418]">
                    {c.heroBackdropUrl ? (
                      <img src={c.heroBackdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-black flex items-center justify-center">
                        <Film size={40} className="text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                    
                    <div className="absolute -bottom-6 left-4 w-16 h-16 rounded-full border-4 border-[#0a0a0a] overflow-hidden bg-black z-10">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-red-900 flex items-center justify-center font-bold text-xl">{c.name[0]}</div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-bold text-lg leading-tight truncate group-hover:text-red-400 transition-colors">{c.name}</h3>
                      {c.isVerified && <VerifiedBadge size={14} variant="gold" />}
                    </div>
                    <p className="text-xs text-white/40 line-clamp-2 mb-4 flex-1">
                      {c.description || "Watch documentaries from this creator."}
                    </p>
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Documentarian</span>
                      <span className="text-xs font-semibold text-white/80 group-hover:text-red-400 transition-colors flex items-center gap-1">
                        Watch <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
