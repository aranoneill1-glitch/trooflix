"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShoppingBag, Search, Star, Truck, Shield, Crown, ArrowRight, BookOpen, Shirt, ChevronRight } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price_cents: number;
  image_url: string;
  creatorName: string;
  creatorSlug: string;
  creatorPhoto: string;
  type?: string;
};

const MOCK_CREATORS = [
  { name: "The History Guy", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=History", tags: "Books · Videos · Merch" },
  { name: "Truth Seekers", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Truth", tags: "Books · Videos · Merch" },
  { name: "Dr. Jane Goodall", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane", tags: "Books · Documentaries · Merch" },
  { name: "Frontier Media", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frontier", tags: "Books · Videos · Merch" },
  { name: "Modern History Co.", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Modern", tags: "Books · Videos · Merch" },
  { name: "The Unseen", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Unseen", tags: "Books · Videos · Merch" },
];

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

  // Split products visually for the desktop layout (mocking Books vs Merch)
  const books = filteredProducts.slice(0, 5);
  const merch = filteredProducts.slice(5, 10);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24">
      <TopBar />

      {/* ========================================= */}
      {/* MOBILE LAYOUT (Untouched) */}
      {/* ========================================= */}
      <div className="lg:hidden pt-28 md:pt-32 max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-bold mb-2 uppercase">Support the creators</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight flex items-center gap-4">
              <ShoppingBag size={48} className="text-[#E53945] hidden md:block" />
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
              className="w-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 rounded-full pl-11 pr-4 py-3 text-sm outline-none focus:border-[#E53945] transition placeholder:text-white/30"
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
          <div className="grid grid-cols-2 gap-4">
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

      {/* ========================================= */}
      {/* DESKTOP LAYOUT (New Premium UI) */}
      {/* ========================================= */}
      <div className="hidden lg:block pt-24 max-w-[1600px] mx-auto px-8 pb-20">
        
        {/* TOP HERO BANNER */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-[#0d0d12] border border-white/5 mb-10 flex items-center min-h-[360px]">
          <div className="absolute inset-0 z-0">
            <img src="https://images.unsplash.com/photo-1555636222-cae831e670b3?q=80&w=2000&auto=format&fit=crop" alt="Creator" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09090B] via-[#09090B]/80 to-transparent w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent w-full" />
          </div>
          
          <div className="relative z-10 px-12 flex w-full justify-between items-center">
            <div className="max-w-2xl">
              <p className="text-[#E53945] font-bold tracking-[0.2em] text-xs uppercase mb-3">Trooflix Marketplace</p>
              <h1 className="text-5xl font-black leading-tight mb-4">
                Support the Creators.<br/>Own the Knowledge.
              </h1>
              <p className="text-white/60 text-lg mb-8 max-w-lg">
                Discover exclusive books, merch and more from the creators you love. Every purchase helps independent voices keep creating.
              </p>
              <button className="bg-[#E53945] hover:bg-[#d12e39] text-white px-8 py-3 rounded-lg font-bold transition flex items-center gap-2">
                Explore Marketplace <ArrowRight size={18} />
              </button>
            </div>

            <div className="w-80 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Star size={18} className="text-white" /></div>
                <div><p className="font-bold text-sm">Support independent creators</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Truck size={18} className="text-white" /></div>
                <div><p className="font-bold text-sm">Worldwide shipping</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Shield size={18} className="text-white" /></div>
                <div><p className="font-bold text-sm">Secure payments</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Crown size={18} className="text-white" /></div>
                <div><p className="font-bold text-sm">Exclusive creator products</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID LAYOUT */}
        <div className="grid grid-cols-4 gap-8">
          
          {/* LEFT COLUMN (Main Content) */}
          <div className="col-span-3 space-y-12">
            
            {/* Featured Creator Stores */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Featured Creator Stores</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-6 gap-4">
                {MOCK_CREATORS.map((c, i) => (
                  <div key={i} className="flex flex-col items-center text-center group cursor-pointer">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#E53945] transition mb-3">
                      <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#E53945] transition">{c.name}</h3>
                    <p className="text-[10px] text-white/40 mb-3">{c.tags}</p>
                    <button className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold hover:bg-white hover:text-black transition">Follow</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Books & Publications */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen size={20} className="text-[#E53945]"/> Books & Publications</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {books.length > 0 ? books.map((p) => (
                  <div key={p.id} className="bg-[#0f0f13] border border-white/5 rounded-xl p-3 flex flex-col hover:border-white/20 transition group cursor-pointer">
                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-4 bg-white/5 relative">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                    <h3 className="text-sm font-bold leading-tight line-clamp-2 mb-1">{p.name}</h3>
                    <p className="text-xs text-white/50 mb-3">{p.creatorName}</p>
                    <p className="text-lg font-black text-white mb-4">${(p.price_cents / 100).toFixed(2)}</p>
                    <button className="mt-auto w-full py-2 bg-white/5 hover:bg-[#E53945] text-white text-xs font-bold rounded-lg transition">Add to Cart</button>
                  </div>
                )) : (
                  <div className="col-span-5 text-white/40 py-8 text-center border border-dashed border-white/10 rounded-xl">No books available yet.</div>
                )}
              </div>
            </section>

            {/* Creator Merchandise */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Shirt size={20} className="text-[#E53945]"/> Creator Merchandise</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {merch.length > 0 ? merch.map((p) => (
                  <div key={p.id} className="bg-[#0f0f13] border border-white/5 rounded-xl p-3 flex flex-col hover:border-white/20 transition group cursor-pointer">
                    <div className="aspect-square w-full rounded-lg overflow-hidden mb-4 bg-white/5 relative">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                    <h3 className="text-sm font-bold leading-tight line-clamp-2 mb-1">{p.name}</h3>
                    <p className="text-xs text-white/50 mb-3">{p.creatorName}</p>
                    <p className="text-lg font-black text-white mb-4">${(p.price_cents / 100).toFixed(2)}</p>
                    <button className="mt-auto w-full py-2 bg-white/5 hover:bg-[#E53945] text-white text-xs font-bold rounded-lg transition">Add to Cart</button>
                  </div>
                )) : (
                  <div className="col-span-5 text-white/40 py-8 text-center border border-dashed border-white/10 rounded-xl">No merch available yet.</div>
                )}
              </div>
            </section>

            {/* Featured Collections */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShoppingBag size={20} className="text-[#E53945]"/> Featured Collections</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { title: "History Collection", bg: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=600&auto=format&fit=crop", tags: "Books · Documentaries · Merch" },
                  { title: "Documentary Collection", bg: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop", tags: "Books · Videos · Merch" },
                  { title: "Exclusive Publications", bg: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop", tags: "Books · E-books · Research" },
                  { title: "Limited Edition Merch", bg: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop", tags: "Clothing · Accessories · Posters" },
                ].map((col, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-[16/9] cursor-pointer group">
                    <img src={col.bg} alt={col.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="font-bold text-white mb-1">{col.title}</h3>
                      <p className="text-[10px] text-white/60 mb-2">{col.tags}</p>
                      <span className="text-xs font-bold text-[#E53945] flex items-center gap-1">Shop Collection <ChevronRight size={12} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN (Sidebar) */}
          <div className="col-span-1 space-y-6">
            
            {/* Exclusive Release */}
            <div className="bg-gradient-to-br from-[#1c1c1e] to-[#0f0f13] border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
              <p className="text-[#E53945] text-xs font-bold uppercase tracking-wider mb-4">Exclusive Release</p>
              <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&auto=format&fit=crop" alt="Book" className="w-32 h-44 object-cover rounded-lg shadow-2xl mb-4" />
              <h3 className="text-lg font-bold leading-tight mb-1">The Hidden History</h3>
              <p className="text-xs text-white/50 mb-4">By James Corbett</p>
              <button className="w-full py-2.5 bg-[#E53945] hover:bg-[#d12e39] text-white text-sm font-bold rounded-lg transition">Shop Now</button>
            </div>

            {/* Top Selling Creators */}
            <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6">Top Selling Creators</h3>
              <div className="space-y-4">
                {MOCK_CREATORS.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-sm font-bold text-white/30 w-4">{i + 1}</span>
                    <img src={c.photo} alt={c.name} className="w-8 h-8 rounded-full border border-white/10 group-hover:border-[#E53945] transition" />
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-[#E53945] transition">{c.name}</p>
                      <p className="text-[10px] text-white/40">{c.tags}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Become a Creator CTA */}
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] flex flex-col justify-end p-6 border border-white/10">
              <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=600&auto=format&fit=crop" alt="Creator" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="relative z-10">
                <h3 className="text-xl font-black text-white mb-2">Become a Creator</h3>
                <p className="text-xs text-white/70 mb-4">Share your work. Reach a global audience. Sell your books, merch and more.</p>
                <Link href="/apply" className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 rounded-lg text-sm font-bold text-white hover:bg-white/10 transition">
                  Join Now <ArrowRight size={14} />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
