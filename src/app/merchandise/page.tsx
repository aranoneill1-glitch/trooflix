"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShoppingBag, Search, ArrowLeft } from "lucide-react";

export default function MerchandisePage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/products/global")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const realCreators = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      if (p.creatorName && p.creatorSlug && !map.has(p.creatorSlug)) {
        map.set(p.creatorSlug, {
          name: p.creatorName,
          slug: p.creatorSlug,
          photo: p.creatorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.creatorName)}&background=1c1c1e&color=fff`,
        });
      }
    });
    return Array.from(map.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.creatorName?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 lg:pb-20">
      <TopBar />
      
      {/* CINEMATIC HERO */}
      <div className="relative w-full h-[45vh] md:h-[60vh] flex flex-col justify-between overflow-hidden">
        
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop" 
            alt="Marketplace" 
            className="w-full h-full object-cover object-center" 
          />
          {/* Gradients to make text readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/40 to-black/60" />
        </div>

        {/* Top Overlay: Back Button & Search */}
        <div className="relative z-10 px-4 md:px-8 pt-24 md:pt-28 flex flex-col gap-4 w-full max-w-7xl mx-auto">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all text-white"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
            <input
              type="text"
              placeholder="Search merchandise and books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 backdrop-blur-xl border border-white/20 rounded-full py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#E53945]/50 focus:bg-black/60 transition-all shadow-xl"
            />
          </div>
        </div>

        {/* Bottom Overlay: Title */}
        <div className="relative z-10 px-4 md:px-8 pb-8 md:pb-12 w-full max-w-7xl mx-auto">
          <p className="text-[#E53945] font-bold tracking-[0.3em] text-[10px] md:text-xs uppercase mb-2 md:mb-3 drop-shadow-md">
            Explore Merchandise
          </p>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight drop-shadow-2xl">
            Marketplace
          </h1>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        
        {/* 1. FEATURED CREATOR STORES */}
        {realCreators.length > 0 && !searchQuery && (
          <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl lg:text-2xl font-bold mb-6">Featured Creator Stores</h2>
            <div className="flex overflow-x-auto scrollbar-hide gap-6 pb-4">
              {realCreators.map((c: any) => (
                <Link href={`/profile/${c.slug}`} key={c.slug} className="flex flex-col items-center group w-[100px] shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#E53945] transition-all duration-300 mb-3 shadow-lg">
                    <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-bold truncate w-full text-center group-hover:text-[#E53945] transition-colors">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 2. CREATORS BOOKS AND MERCHANDISE */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <h2 className="text-xl lg:text-2xl font-bold mb-6">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Creators Books and Merchandise"}
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
              {filteredProducts.map((p) => (
                <Link href={`/shop/${p.id}`} key={p.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-3 flex flex-col hover:border-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
                  <div className="aspect-[4/5] w-full rounded-xl overflow-hidden mb-4 bg-white/5 relative">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  </div>
                  <h3 className="text-sm font-bold leading-tight line-clamp-2 mb-1 group-hover:text-[#E53945] transition-colors">{p.name}</h3>
                  <p className="text-xs text-white/50 mb-3">{p.creatorName}</p>
                  <p className="text-lg font-black text-white mt-auto">${(p.price_cents / 100).toFixed(2)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/5">
              <ShoppingBag className="mx-auto text-white/20 mb-4" size={48} />
              <h3 className="text-lg font-bold text-white mb-2">
                {searchQuery ? "No items found" : "No products listed yet"}
              </h3>
              <p className="text-white/50 text-sm">
                {searchQuery ? `We couldn't find anything matching "${searchQuery}".` : "Check back soon for exclusive merch and publications."}
              </p>
            </div>
          )}
        </section>

      </div>

      <MobileBottomNav />
    </main>
  );
}
