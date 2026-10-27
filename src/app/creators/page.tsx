"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators, getCachedVideos } from "@/lib/cache";
import { Search, Play, Mic, ArrowRight, Film, TrendingUp, Zap, Heart, ChevronRight } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { motion, AnimatePresence } from "framer-motion";
import { getAllProgress } from "@/lib/progress";

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  description: string;
  heroBackdropUrl?: string;
  category?: string;
  isVerified?: boolean;
  createdAt?: string;
};

type Video = {
  id: number;
  title: string;
  description?: string;
  posterUrl?: string;
  backdropUrl?: string;
  creatorId?: number | null;
  type?: string;
  createdAt?: string;
  viewCount?: number;
  progressSeconds?: number;
  progressDuration?: number;
};

type Product = {
  id: number;
  name: string;
  price_cents: number;
  image_url: string;
  creatorName: string;
  creatorSlug: string;
  creatorPhoto: string;
};

// Reusable Horizontal Row
function ContentRow({ title, icon: Icon, items, loading }: { title: string, icon?: any, items: Creator[], loading: boolean }) {
  if (loading) return <div className="h-48 flex items-center justify-center text-white/30">Loading...</div>;
  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={20} className="text-[#E53945]" />}
        <h2 className="text-xl md:text-2xl font-black tracking-tight">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
        {items.map(c => (
          <Link 
            key={c.id} 
            href={`/podcaster/${c.slug}`}
            className="group relative flex-shrink-0 w-[160px] md:w-[200px] aspect-[2/3] rounded-xl overflow-hidden snap-start"
          >
            <img 
              src={c.heroBackdropUrl || c.photoUrl || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=600&fit=crop"} 
              alt={c.name} 
              className="w-full h-full object-cover group-hover:scale-110 transition duration-500" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
            
            <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 flex flex-col justify-end">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-bold text-sm md:text-base leading-tight truncate">{c.name}</p>
                {c.isVerified && <VerifiedBadge size={12} variant="gold" />}
              </div>
              <p className="text-[10px] text-white/60 line-clamp-1">{c.category || "Creator"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") || "All" : "All");
  const [progressList, setProgressList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/creators", { cache: "no-store" }).then(r => r.json()), getCachedVideos()])
      .then(([creatorData, videoData]) => {
        setCreators(Array.isArray(creatorData) ? creatorData : []);
        setVideos(Array.isArray(videoData) ? videoData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    setProgressList(getAllProgress());
    const onProg = () => setProgressList(getAllProgress());
    window.addEventListener("progress-changed", onProg);
    return () => window.removeEventListener("progress-changed", onProg);
  }, []);

  useEffect(() => {
    if (activeTab === "Shop" && products.length === 0 && !loadingProducts) {
      setLoadingProducts(true);
      fetch("/api/products/global")
        .then((r) => r.json())
        .then((d) => setProducts(d.products || []))
        .catch(() => {})
        .finally(() => setLoadingProducts(false));
    }
  }, [activeTab, products.length, loadingProducts]);

  // Helper to map creator IDs to their content types
  const creatorContentTypes = useMemo(() => {
    const map = new Map<number, Set<string>>();
    videos.forEach(v => {
      if (v.creatorId) {
        const current = map.get(v.creatorId) || new Set();
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
    if (activeTab === "Podcasts") {
      result = result.filter(c => creatorContentTypes.get(Number(c.id))?.has("Podcast"));
    } else if (activeTab === "Documentaries") {
      result = result.filter(c => creatorContentTypes.get(Number(c.id))?.has("Documentary"));
    }
    return result;
  }, [creators, searchQuery, activeTab, creatorContentTypes]);

  const trendingCreators = useMemo(() => {
    return [...creators].sort((a, b) => (creatorContentTypes.get(Number(b.id))?.size || 0) - (creatorContentTypes.get(Number(a.id))?.size || 0)).slice(0, 10);
  }, [creators, creatorContentTypes]);

  const freshCreators = useMemo(() => {
    return [...creators].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    }).slice(0, 10);
  }, [creators]);

  const documentaryCreators = useMemo(() => creators.filter(c => creatorContentTypes.get(Number(c.id))?.has("Documentary")).slice(0, 10), [creators, creatorContentTypes]);
  const podcastCreators = useMemo(() => creators.filter(c => creatorContentTypes.get(Number(c.id))?.has("Podcast")).slice(0, 10), [creators, creatorContentTypes]);

  // The hero feature
  const heroVideo = videos.find(v => v.type === "Documentary" && v.backdropUrl) || videos.find(v => v.backdropUrl);
  const heroCreator = heroVideo ? creators.find(c => c.id === heroVideo.creatorId) : creators[0];

  // Continue watching
  const continueWatching = progressList.map(p => {
    const v = videos.find(x => x.id === p.id);
    return v ? { ...v, progressSeconds: p.seconds, progressDuration: p.duration } : null;
  }).filter(Boolean).slice(0, 1) as any[];

  // Trending videos
  const trendingVideos = [...videos].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 4);

  // Featured creators (for the avatar row)
  const featuredAvatars = creators.slice(0, 8);

  const TABS = ["All", "Podcasts", "Documentaries", "Shop"];

  return (
    <main className="min-h-screen bg-[#080808] text-white pb-24 font-sans">
      <TopBar />

      <div className="pt-28 md:pt-32 max-w-[1400px] mx-auto px-4 md:px-8">
        
        {/* SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-bold mb-2 uppercase">
              The Home of Independent Voices
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Discover Creators
            </h1>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators, topics..."
              className="w-full bg-[#171717] border border-[#303030] rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-[#E53945] transition placeholder:text-white/30 text-white"
            />
          </div>
        </div>

        {searchQuery ? (
          /* SEARCH RESULTS */
          <div className="mb-12">
            <h2 className="text-2xl font-black mb-6">Search Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredCreators.map(c => (
                <Link key={c.id} href={`/podcaster/${c.slug}`} className="bg-[#171717] border border-[#303030] rounded-2xl p-4 flex flex-col items-center hover:border-[#E53945]/50 transition-colors">
                  <img src={c.photoUrl} className="w-20 h-20 rounded-xl object-cover mb-3" />
                  <p className="font-bold text-white">{c.name}</p>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">{c.category || "Creator"}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* DASHBOARD LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
              
              {/* LEFT COLUMN (8 Cols) */}
              <div className="lg:col-span-8 space-y-10">
                
                {/* HERO */}
                {heroVideo && heroCreator && (
                  <Link href={`/podcaster/${heroCreator.slug}`} className="relative w-full h-[50vh] rounded-3xl overflow-hidden shadow-2xl group cursor-pointer border border-[#303030] block">
                    <img src={heroVideo.backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700 object-[center_30%]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/95 via-[#080808]/40 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 p-8 md:p-10 max-w-2xl">
                      <h1 style={{ fontFamily: 'var(--font-bebas)' }} className="text-4xl md:text-6xl lg:text-7xl font-normal tracking-wide mb-3 leading-[0.95] drop-shadow-lg">
                        {heroVideo.title}
                      </h1>
                      <p className="text-sm md:text-base text-white/70 mb-6 line-clamp-2">
                        {heroVideo.description}
                      </p>
                      <div className="flex gap-3">
                        <span className="flex items-center gap-2 bg-[#E53945] hover:bg-[#E53945]/90 text-white font-bold px-7 py-2.5 rounded-full shadow-lg transition">
                          <Play size={18} fill="currentColor" /> Watch Now
                        </span>
                        <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white font-bold px-7 py-2.5 rounded-full transition">
                          View Creator
                        </span>
                      </div>
                    </div>
                  </Link>
                )}

                {/* EXPLORE BY CATEGORY (4 Cards) */}
                <div>
                  <h2 className="text-xl md:text-2xl font-black mb-5">Explore by Category</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: "Documentaries", desc: "Real stories.", img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=400", action: () => setActiveTab("Documentaries") },
                      { name: "Podcasts", desc: "Conversations.", img: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=400", action: () => setActiveTab("Podcasts") },
                      { name: "Creators", desc: "All creators.", img: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=400", action: () => setActiveTab("All") },
                      { name: "Merch", desc: "Support them.", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400", action: () => setActiveTab("Shop") },
                    ].map((cat) => (
                      <div key={cat.name} onClick={cat.action} className="relative aspect-square rounded-2xl overflow-hidden group border border-[#303030] cursor-pointer hover:border-[#E53945]/50 transition-colors">
                        <img src={cat.img} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500 opacity-60 group-hover:opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        <div className="absolute inset-0 p-4 flex flex-col justify-end">
                          <h3 className="font-bold text-sm md:text-base mb-1">{cat.name}</h3>
                          <p className="text-[10px] text-white/60 mb-3">{cat.desc}</p>
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition">
                            <ArrowRight size={14} className="text-white" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FEATURED CREATORS (Avatar Row) */}
                <div>
                  <h2 className="text-xl md:text-2xl font-black mb-6">Featured Creators</h2>
                  <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
                    {featuredAvatars.map((c: any) => (
                      <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-3 flex-shrink-0 group w-[100px]">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#303030] group-hover:border-[#E53945] transition">
                          {c.photoUrl ? <img src={c.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#171717] flex items-center justify-center text-xl font-bold">{c.name?.[0]}</div>}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-white group-hover:text-[#E53945] transition truncate w-full">{c.name}</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{c.category || "Creator"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* CONTINUE WATCHING */}
                <div className="bg-[#171717] border border-[#303030] rounded-2xl p-5 shadow-xl">
                  <h3 className="font-bold text-sm mb-4">Continue Watching</h3>
                  {continueWatching.length > 0 ? (
                    <Link href={`/podcast/${continueWatching[0].id}`} className="relative rounded-xl overflow-hidden cursor-pointer group block">
                      <img src={continueWatching[0].posterUrl} alt="" className="w-full h-32 object-cover group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 p-4 w-full">
                        <p className="text-xs font-bold mb-1 truncate">{continueWatching[0].title}</p>
                        <p className="text-[10px] text-white/60 mb-2">{continueWatching[0].type || "Documentary"}</p>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-[#E53945]" style={{ width: `${(continueWatching[0].progressSeconds / continueWatching[0].progressDuration) * 100}%` }} />
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <Play size={16} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <p className="text-xs text-white/40">No videos in progress.</p>
                  )}
                </div>

                {/* TRENDING NOW */}
                <div className="bg-[#171717] border border-[#303030] rounded-2xl p-5 shadow-xl">
                  <h3 className="font-bold text-sm mb-4">Trending Now</h3>
                  <div className="space-y-4">
                    {trendingVideos.map((v, i) => (
                      <Link key={v.id} href={`/podcast/${v.id}`} className="flex items-center gap-3 cursor-pointer group">
                        <span className="text-sm font-black text-white/20 w-4">{i + 1}</span>
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                          <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate group-hover:text-white text-white/90">{v.title}</p>
                          <p className="text-[10px] text-white/40">{v.type || "Documentary"}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* SUPPORT CTA */}
                <div className="bg-gradient-to-br from-[#202020] to-[#171717] border border-[#303030] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#E53945]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  <h3 className="font-bold text-sm mb-2 relative z-10">Support independent creators</h3>
                  <p className="text-xs text-white/50 leading-relaxed mb-4 relative z-10">
                    Watch, listen, buy merch and be part of something bigger.
                  </p>
                  <button onClick={() => setActiveTab("Shop")} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition relative z-10">
                    Explore Merch
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STICKY TABS (BELOW DASHBOARD) */}
        <div className="sticky top-[64px] md:top-[80px] z-40 bg-[#080808]/90 backdrop-blur-xl border-y border-[#303030] py-4 mb-8">
          <div className="flex overflow-x-auto gap-3 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition border ${
                  activeTab === tab 
                    ? "bg-white text-black border-white shadow-lg" 
                    : "bg-[#171717] text-white/60 border-[#303030] hover:bg-[#202020] hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA (SHELVES + GRIDS) */}
        <div className="pb-12">
          {activeTab === "All" && (
            <>
              {videos.filter(v => v.type === "Documentary" && (v.posterUrl || v.backdropUrl)).length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Film size={20} className="text-[#E53945]" />
                    <h2 className="text-xl md:text-2xl font-black tracking-tight">Featured Documentaries</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
                    {videos.filter(v => v.type === "Documentary" && (v.posterUrl || v.backdropUrl)).slice(0, 15).map(v => (
                      <Link key={v.id} href={`/podcast/${v.id}`} className="group relative flex-shrink-0 w-[240px] md:w-[300px] aspect-video rounded-xl overflow-hidden snap-start cursor-pointer border border-[#303030] hover:border-white/40 transition">
                        <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                            <Play size={20} fill="white" className="text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="font-bold text-sm md:text-base leading-tight line-clamp-2">{v.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Mic size={20} className="text-[#E53945]" />
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">Featured Podcasts</h2>
                </div>
                {videos.filter(v => v.type === "Podcast" && (v.posterUrl || v.backdropUrl)).length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x">
                    {videos.filter(v => v.type === "Podcast" && (v.posterUrl || v.backdropUrl)).slice(0, 15).map(v => (
                      <Link key={v.id} href={`/podcast/${v.id}`} className="group relative flex-shrink-0 w-[240px] md:w-[300px] aspect-video rounded-xl overflow-hidden snap-start cursor-pointer border border-[#303030] hover:border-white/40 transition">
                        <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                            <Play size={20} fill="white" className="text-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4">
                          <p className="font-bold text-sm md:text-base leading-tight line-clamp-2">{v.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-[140px] border-2 border-dashed border-[#303030] rounded-xl flex items-center justify-center bg-[#171717]">
                    <p className="text-white/40 font-semibold flex items-center gap-2">
                      <Mic size={18} className="text-white/20" /> No podcasts uploaded yet.
                    </p>
                  </div>
                )}
              </div>

              <ContentRow title="Trending Creators" icon={TrendingUp} items={trendingCreators} loading={loading} />
              <ContentRow title="Fresh Talent" icon={Zap} items={freshCreators} loading={loading} />
              <ContentRow title="Top Documentary Makers" icon={Film} items={documentaryCreators} loading={loading} />
              <ContentRow title="Top Podcasters" icon={Mic} items={podcastCreators} loading={loading} />
            </>
          )}

          {activeTab === "Shop" && (
            <div>
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><Heart size={24} className="text-[#E53945]"/> Trooflix Merch</h2>
              {loadingProducts ? (
                <p className="text-white/40 py-12 text-center">Loading products...</p>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-[#171717] rounded-2xl border border-[#303030]">
                  <Heart size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">No products available on the platform yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.map((p) => (
                    <Link href={`/podcaster/${p.creatorSlug}`} key={p.id} className="group bg-[#171717] border border-[#303030] rounded-2xl overflow-hidden hover:border-[#E53945]/50 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                      <div className="relative aspect-square w-full overflow-hidden bg-[#202020]">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
                          {p.creatorPhoto && <img src={p.creatorPhoto} className="w-4 h-4 rounded-full" />}
                          {p.creatorName}
                        </p>
                        <h3 className="font-bold text-lg leading-tight truncate group-hover:text-[#E53945] transition-colors mb-2">{p.name}</h3>
                        <p className="text-green-400 font-bold mt-auto">${(p.price_cents / 100).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === "Podcasts" || activeTab === "Documentaries") && (
            <div>
              <h2 className="text-2xl font-black mb-6">{activeTab}</h2>
              {filteredCreators.length === 0 ? (
                <div className="text-center py-20 bg-[#171717] rounded-2xl border border-[#303030]">
                  <p className="text-white/40">No creators found for this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredCreators.map((c) => (
                    <Link key={c.id} href={`/podcaster/${c.slug}`} className="group relative bg-[#171717] border border-[#303030] rounded-2xl overflow-hidden hover:border-[#E53945]/50 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#202020]">
                        {c.heroBackdropUrl ? (
                          <img src={c.heroBackdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-black flex items-center justify-center">
                            <Mic size={40} className="text-white/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171717] via-transparent to-transparent opacity-80" />
                        <div className="absolute -bottom-6 left-4 w-16 h-16 rounded-full border-4 border-[#171717] overflow-hidden bg-black z-10">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-red-900 flex items-center justify-center font-bold text-xl">{c.name[0]}</div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 pt-8 flex-1 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="font-bold text-lg leading-tight truncate group-hover:text-[#E53945] transition-colors">{c.name}</h3>
                          {c.isVerified && <VerifiedBadge size={14} variant="gold" />}
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2 mb-4 flex-1">{c.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#303030]">
                          <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">{c.category || "Creator"}</span>
                          <span className="text-xs font-semibold text-white/80 group-hover:text-[#E53945] transition-colors flex items-center gap-1">View <ArrowRight size={12} /></span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM CTA */}
        <div className="pb-16">
          <div className="bg-gradient-to-br from-[#202020] to-[#080808] border border-[#303030] rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#E53945]/20 blur-3xl pointer-events-none" />
            <h2 className="text-2xl md:text-4xl font-black mb-4 relative z-10">Want to become a Creator?</h2>
            <p className="text-white/50 mb-8 relative z-10 max-w-xl mx-auto">Join our network, monetize your content, and keep 90% of your revenue.</p>
            <Link href="/apply" className="inline-block bg-white text-black font-bold px-8 py-3.5 rounded-full hover:scale-105 transition relative z-10">
              Apply to Join Trooflix
            </Link>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
