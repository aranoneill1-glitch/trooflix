"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators, getCachedVideos } from "@/lib/cache";
import { Search, Play, Mic, ArrowRight, Sparkles, ShoppingBag, Film, TrendingUp, Zap } from "lucide-react";
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
      <div className="flex items-center gap-2 mb-4 px-4 md:px-8">
        {Icon && <Icon size={20} className="text-red-500" />}
        <h2 className="text-xl md:text-2xl font-black tracking-tight">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-4 snap-x">
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

  // Data Sorting for the Shelves
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

  const documentaryCreators = useMemo(() => {
    return creators.filter(c => creatorContentTypes.get(Number(c.id))?.has("Documentary")).slice(0, 10);
  }, [creators, creatorContentTypes]);

  const podcastCreators = useMemo(() => {
    return creators.filter(c => creatorContentTypes.get(Number(c.id))?.has("Podcast")).slice(0, 10);
  }, [creators, creatorContentTypes]);

  const featuredCreator = freshCreators[0];
  const TABS = ["All", "Podcasts", "Documentaries", "Shop"];

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24">
      <TopBar />

      <div className="pt-28 md:pt-32 max-w-7xl mx-auto">
        
        {/* HEADER & SEARCH */}
        <div className="px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-red-500 font-bold mb-2 uppercase">
              The Home of Independent Voices
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Discover Your <span className="text-white/40">Favorite Creators</span>
            </h1>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creators, topics..."
              className="w-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-red-500 transition placeholder:text-white/30"
            />
          </div>
        </div>

        {/* AVATAR SCROLLING ROW */}
        <div className="px-4 md:px-8 mb-12">
          <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4">
            {creators.slice(0, 15).map((c) => (
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

        {/* STICKY TABS */}
        <div className="sticky top-[64px] md:top-[80px] z-40 bg-[#050505]/90 backdrop-blur-xl border-y border-white/5 py-4 mb-8">
          <div className="px-4 md:px-8 flex overflow-x-auto gap-3 scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition border ${
                  activeTab === tab 
                    ? "bg-white text-black border-white shadow-lg" 
                    : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="pb-12">
          
          {activeTab === "All" && (
            <>
              {/* FEATURED HERO */}
              {featuredCreator && !searchQuery && (
                <div className="px-4 md:px-8 mb-12">
                  <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl group aspect-[21/9] md:aspect-[3/1]">
                    <div className="absolute inset-0 bg-black/40 z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent z-20" />
                    <img src={featuredCreator.heroBackdropUrl || featuredCreator.photoUrl} alt="Hero" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                    
                    <div className="absolute inset-0 z-30 flex flex-col justify-center p-8 md:p-12 max-w-2xl">
                      <span className="bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded w-max mb-3 shadow-lg">Featured Creator</span>
                      <h2 className="text-3xl md:text-5xl font-black mb-3 flex items-center gap-2">
                        {featuredCreator.name}
                        {featuredCreator.isVerified && <VerifiedBadge size={24} variant="gold" />}
                      </h2>
                      <p className="text-white/70 text-sm md:text-base line-clamp-2 mb-6">{featuredCreator.description}</p>
                      <Link href={`/podcaster/${featuredCreator.slug}`} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition flex items-center gap-2 w-max shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <Play size={18} fill="black" /> View Profile
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* NETFLIX SHELVES */}
              {searchQuery ? (
                <div className="px-4 md:px-8">
                   <h2 className="text-2xl font-black mb-6">Search Results</h2>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredCreators.map(c => (
                        <Link key={c.id} href={`/podcaster/${c.slug}`} className="bg-[#1c1c1e] rounded-2xl p-4 flex flex-col items-center">
                          <img src={c.photoUrl} className="w-20 h-20 rounded-full object-cover mb-3" />
                          <p className="font-bold">{c.name}</p>
                        </Link>
                      ))}
                   </div>
                </div>
              ) : (
                <>
                  <ContentRow title="Trending Now" icon={TrendingUp} items={trendingCreators} loading={loading} />
                  <ContentRow title="Fresh Talent" icon={Zap} items={freshCreators} loading={loading} />
                  <ContentRow title="Top Documentary Makers" icon={Film} items={documentaryCreators} loading={loading} />
                  <ContentRow title="Top Podcasters" icon={Mic} items={podcastCreators} loading={loading} />
                </>
              )}
            </>
          )}

          {activeTab === "Shop" && (
            <div className="px-4 md:px-8">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><ShoppingBag size={24} className="text-red-500"/> Trooflix Merch</h2>
              {loadingProducts ? (
                <p className="text-white/40 py-12 text-center">Loading products...</p>
              ) : products.length === 0 ? (
                <div className="text-center py-20 bg-[#0a0a0a] rounded-2xl border border-white/5">
                  <ShoppingBag size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40">No products available on the platform yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.map((p) => (
                    <Link href={`/podcaster/${p.creatorSlug}`} key={p.id} className="group bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                      <div className="relative aspect-square w-full overflow-hidden bg-[#141418]">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-xs text-white/50 mb-1 flex items-center gap-1">
                          {p.creatorPhoto && <img src={p.creatorPhoto} className="w-4 h-4 rounded-full" />}
                          {p.creatorName}
                        </p>
                        <h3 className="font-bold text-lg leading-tight truncate group-hover:text-red-400 transition-colors mb-2">{p.name}</h3>
                        <p className="text-green-400 font-bold mt-auto">${(p.price_cents / 100).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === "Podcasts" || activeTab === "Documentaries") && (
            <div className="px-4 md:px-8">
              <h2 className="text-2xl font-black mb-6">{activeTab}</h2>
              {filteredCreators.length === 0 ? (
                <div className="text-center py-20 bg-[#0a0a0a] rounded-2xl border border-white/5">
                  <p className="text-white/40">No creators found for this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {filteredCreators.map((c) => (
                    <Link key={c.id} href={`/podcaster/${c.slug}`} className="group relative bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141418]">
                        {c.heroBackdropUrl ? (
                          <img src={c.heroBackdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-black flex items-center justify-center">
                            <Mic size={40} className="text-white/10" />
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
                        <p className="text-xs text-white/40 line-clamp-2 mb-4 flex-1">{c.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                          <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">{c.category || "Creator"}</span>
                          <span className="text-xs font-semibold text-white/80 group-hover:text-red-400 transition-colors flex items-center gap-1">View <ArrowRight size={12} /></span>
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
        <div className="px-4 md:px-8 pb-16">
          <div className="bg-gradient-to-br from-[#1c1c1e] to-black border border-white/10 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-red-600/20 blur-3xl pointer-events-none" />
            <h2 className="text-2xl md:text-4xl font-black mb-4 relative z-10">Want to become a Creator?</h2>
            <p className="text-white/50 mb-8 relative z-10 max-w-xl mx-auto">Join our network, monetize your content, and keep 90% of your revenue.</p>
            <Link href="/creators" className="inline-block bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition relative z-10">
              Apply to Join Trooflix
            </Link>
          </div>
        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
