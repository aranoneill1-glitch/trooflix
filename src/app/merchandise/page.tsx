"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShoppingBag, Search } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price_cents: number;
  image_url: string;
  creatorName: string;
  creatorSlug: string;
  creatorPhoto: string;
};

export default function MerchandisePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/products/global")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24">
      <TopBar />

      <div className="pt-28 md:pt-32 max-w-7xl mx-auto px-4 md:px-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-red-500 font-bold mb-2 uppercase">
              Support the creators
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight flex items-center gap-4">
              <ShoppingBag size={48} className="text-red-500 hidden md:block" />
              Creator <span className="text-white/40">Merch</span>
            </h1>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, creators..."
              className="w-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-red-500 transition placeholder:text-white/30"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-white/40 py-20 text-center">Loading merchandise...</p>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-[#0a0a0a] rounded-3xl border border-white/5">
            <ShoppingBag size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 text-lg">No merchandise available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((p) => (
              <Link href={`/podcaster/${p.creatorSlug}`} key={p.id} className="group bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 flex flex-col">
                <div className="relative aspect-square w-full overflow-hidden bg-[#141418]">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-white/20" /></div>
                  )}
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

      <MobileBottomNav />
    </main>
  );
}
