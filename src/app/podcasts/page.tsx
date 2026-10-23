"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators, getCachedVideos } from "@/lib/cache";
import { Search, Play, Mic, ArrowRight, Sparkles, ShoppingBag } from "lucide-react";
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

export default function PodcastsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
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

  const filteredCreators = useMemo(() => {
    let result = creators;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name?.toLowerCase().includes(q) || 
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [creators, searchQuery]);

  const featuredVideo = useMemo(() => {
    const withBackdrop = videos.filter(v => v.backdropUrl || v.posterUrl);
    return withBackdrop.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    })[0];
  }, [videos]);

  const featuredCreator = useMemo(() => {
    if (!featuredVideo || !featuredVideo.creatorId) return null;
    return creators.find(c => c.id === featuredVideo.creatorId);
  }, [featuredVideo, creators]);

  const TABS = ["All", "Podcasts", "Documentaries", "Shop"];

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <TopBar />

      <div className="pt-28 md:pt-32 max-w-7xl mx-auto px-4 md:px-8">
        
        {/* HEADER & SEARCH */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-red-500 font-bold mb-2 uppercase">
              The Home of Independent Voices
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Discover <span className="text-white/40">Trooflix</span>
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
        <div className="mb-12">
          <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 px-1">
            {creators.slice(0, 10).map((c) => (
              <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-tr from-red-600 to-orange-500 group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-black">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#1c1c1e] flex items-center justify-center text-xl font-bold">{c.name[0]}</div>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-20 text-center">{c.name.split(" ")[0]}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* HERO FEATURED CONTENT */}
        {featuredVideo && featuredCreator && !searchQuery && activeTab === "All" && (
          <div className="relative rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-2xl group">
            <div className="absolute inset-0 bg-black/30 z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-20" />
            <img 
              src={featuredVideo.backdropUrl || featuredVideo.posterUrl} 
              alt="Hero" 
              className="w-full h-[300px] md:h-[400px] object-cover object-center group-hover:scale-105 transition-transform duration-700" 
            />
            
            <div className="absolute inset-0 z-30 flex flex-col justify-end p-8 md:p-12">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-red-600 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded">Featured Content</span>
                <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded">{featuredVideo.type || "Video"}</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-2">{featuredVideo.title}</h2>
              
              <div className="flex items-center gap-2 mb-4">
                <img src={featuredCreator.photoUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                <span className="text-sm font-semibold text-white/90">{featuredCreator.name}</span>
                {featuredCreator.isVerified && <VerifiedBadge size={14} variant="gold" />}
              </div>

              <p className="text-white/60 text-sm md:text-base max-w-xl mb-6 line-clamp-2">
                {featuredVideo.description || "Watch this exclusive content on Trooflix."}
              </p>
              <div className="flex items-center gap-4">
                <Link href={`/podcast/${featuredVideo.id}`} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition flex items-center gap-2">
                  <Play size={18} fill="black" /> Watch Now
                </Link>
                <Link href={`/podcaster/${featuredCreator.slug}`} className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition flex items-center gap-2">
                  <Sparkles size={18} /> View Creator
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex overflow-x-auto gap-2 mb-8 scrollbar-hide pb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                activeTab === tab 
                  ? "bg-white text-black border-white shadow-lg" 
                  : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        {activeTab === "Shop" ? (
          <div>
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
                  <Link href={`/podcaster/${p.creatorSlug}`} key={p.id} className="group bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] flex flex-col">
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
        ) : (
          <div>
            <h2 className="text-2xl font-black mb-6">Creators</h2>
            {loading ? (
              <p className="text-white/40 py-12 text-center">Loading…</p>
            ) : filteredCreators.length === 0 ? (
              <div className="text-center py-20 bg-[#0a0a0a] rounded-2xl border border-white/5">
                <p className="text-white/40">No creators found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredCreators.map((c) => (
                  <Link
                    key={c.id}
                    href={`/podcaster/${c.slug}`}
                    className="group relative bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,255,255,0.05)] flex flex-col"
                  >
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
                      <p className="text-xs text-white/40 line-clamp-2 mb-4 flex-1">
                        {c.description || "Explore content from this creator on Trooflix."}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">{c.category || "Creator"}</span>
                        <span className="text-xs font-semibold text-white/80 group-hover:text-red-400 transition-colors flex items-center gap-1">
                          View <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* BOTTOM CTA */}
        <div className="mt-20 mb-12 bg-gradient-to-br from-[#1c1c1e] to-black border border-white/10 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-red-600/20 blur-3xl pointer-events-none" />
          <h2 className="text-2xl md:text-4xl font-black mb-4 relative z-10">Want to become a Creator?</h2>
          <p className="text-white/50 mb-8 relative z-10 max-w-xl mx-auto">Join our network, monetize your content, and keep 90% of your revenue.</p>
          <Link href="/creators" className="inline-block bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition relative z-10">
            Apply to Join Trooflix
          </Link>
        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
