"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShoppingBag, Search } from "lucide-react";

export default function MerchandisePage() {
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

  // Extract unique creators directly from the listed products
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

  // Filter products based on the search query
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
      
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-24 lg:pt-32">
        
        {/* Page Header */}
        <h1 className="text-3xl lg:text-5xl font-black mb-8 tracking-tight">
          Trooflix <span className="text-[#E53945]">Marketplace</span>
        </h1>

        {/* Search Bar */}
        <div className="relative w-full max-w-2xl mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
          <input
            type="text"
            placeholder="Search merchandise and books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-full py-4 pl-12 pr-4 text-sm lg:text-base text-white placeholder:text-white/40 focus:outline-none focus:border-[#E53945]/50 focus:bg-white/[0.08] transition-all backdrop-blur-xl shadow-lg"
          />
        </div>

        {/* 1. FEATURED CREATOR STORES (Hidden when searching) */}
        {realCreators.length > 0 && !searchQuery && (
          <section className="mb-16">
            <h2 className="text-xl lg:text-2xl font-bold mb-6">Featured Creator Stores</h2>
            <div className="flex overflow-x-auto scrollbar-hide gap-6 pb-4">
              {realCreators.map((c: any) => (
                <Link href={`/profile/${c.slug}`} key={c.slug} className="flex flex-col items-center group w-[100px] shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#E53945] transition mb-3">
                    <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-bold truncate w-full text-center group-hover:text-[#E53945] transition">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 2. CREATORS BOOKS AND MERCHANDISE */}
        <section>
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
                <Link href={`/shop/${p.id}`} key={p.id} className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-3 flex flex-col hover:border-white/20 transition group">
                  <div className="aspect-[4/5] w-full rounded-xl overflow-hidden mb-4 bg-white/5 relative">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  </div>
                  <h3 className="text-sm font-bold leading-tight line-clamp-2 mb-1">{p.name}</h3>
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
