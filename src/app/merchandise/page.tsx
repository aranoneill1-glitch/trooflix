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

  const books = filteredProducts.slice(0, 10);
  const merch = filteredProducts.slice(10, 20);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 lg:pb-20">
      <TopBar />

      <div className="pt-20 lg:pt-24 max-w-[1600px] mx-auto px-4 lg:px-8">
        
        {/* TOP HERO BANNER */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-[#0d0d12] border border-white/5 mb-8 lg:mb-10 flex flex-col lg:flex-row items-center min-h-[300px] lg:min-h-[360px]">
          <div className="absolute inset-0 z-0">
            <img src="https://images.unsplash.com/photo-1555636222-cae831e670b3?q=80&w=2000&auto=format&fit=crop" alt="Creator" className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#09090B] via-[#09090B]/80 to-transparent w-full" />
          </div>
          
          <div className="relative z-10 px-6 py-8 lg:px-12 flex flex-col lg:flex-row w-full justify-between items-center gap-8">
            <div className="max-w-2xl text-center lg:text-left flex flex-col items-center lg:items-start">
              <p className="text-[#E53945] font-bold tracking-[0.2em] text-[10px] lg:text-xs uppercase mb-2 lg:mb-3">Trooflix Marketplace</p>
              <h1 className="text-3xl lg:text-5xl font-black leading-tight mb-3 lg:mb-4">
                Support the Creators.<br className="hidden lg:block"/> Own the Knowledge.
              </h1>
              <p className="text-white/60 text-sm lg:text-lg mb-6 lg:mb-8 max-w-lg">
                Discover exclusive books, merch and more from the creators you love. Every purchase helps independent voices keep creating.
              </p>
              <button className="bg-[#E53945] hover:bg-[#d12e39] text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-lg font-bold transition flex items-center gap-2 text-sm lg:text-base">
                Explore Marketplace <ArrowRight size={18} />
              </button>
            </div>

            {/* Trust Badges (Hidden on mobile to save space) */}
            <div className="hidden lg:flex w-80 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex-col gap-6">
              <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Star size={18} className="text-white" /></div><div><p className="font-bold text-sm">Support independent creators</p></div></div>
              <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Truck size={18} className="text-white" /></div><div><p className="font-bold text-sm">Worldwide shipping</p></div></div>
              <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Shield size={18} className="text-white" /></div><div><p className="font-bold text-sm">Secure payments</p></div></div>
              <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"><Crown size={18} className="text-white" /></div><div><p className="font-bold text-sm">Exclusive creator products</p></div></div>
            </div>
          </div>
        </div>

        {/* MAIN GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT COLUMN (Main Content) */}
          <div className="lg:col-span-3 space-y-10 lg:space-y-12">
            
            {/* Featured Creator Stores */}
            <section>
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-white">Featured Creator Stores</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              
              {/* Mobile: Horizontal scroll, Desktop: Grid */}
              <div className="flex overflow-x-auto scrollbar-hide gap-4 lg:grid lg:grid-cols-6 pb-2 lg:pb-0">
                {MOCK_CREATORS.map((c, i) => (
                  <div key={i} className="flex flex-col items-center text-center group cursor-pointer flex-shrink-0 w-[100px] lg:w-auto">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#E53945] transition mb-3">
                      <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#E53945] transition truncate w-full">{c.name}</h3>
                    <p className="text-[10px] text-white/40 mb-3 truncate w-full">{c.tags}</p>
                    <button className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-bold hover:bg-white hover:text-black transition">Follow</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Books & Publications */}
            <section>
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2"><BookOpen size={20} className="text-[#E53945]"/> Books & Publications</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                {books.length > 0 ? books.map((p) => (
                  <div key={p.id} className="bg-[#0f0f13] border border-white/5 rounded-xl p-2.5 lg:p-3 flex flex-col hover:border-white/20 transition group cursor-pointer">
                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-3 bg-white/5 relative">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                    <h3 className="text-xs lg:text-sm font-bold leading-tight line-clamp-2 mb-1">{p.name}</h3>
                    <p className="text-[10px] lg:text-xs text-white/50 mb-2 lg:mb-3">{p.creatorName}</p>
                    <p className="text-sm lg:text-lg font-black text-white mb-2 lg:mb-4">${(p.price_cents / 100).toFixed(2)}</p>
                    <button className="mt-auto w-full py-1.5 lg:py-2 bg-white/5 hover:bg-[#E53945] text-white text-[10px] lg:text-xs font-bold rounded-lg transition">Add to Cart</button>
                  </div>
                )) : (
                  <div className="col-span-2 lg:col-span-5 text-white/40 py-8 text-center border border-dashed border-white/10 rounded-xl">No books available yet.</div>
                )}
              </div>
            </section>

            {/* Creator Merchandise */}
            <section>
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2"><Shirt size={20} className="text-[#E53945]"/> Creator Merchandise</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
                {merch.length > 0 ? merch.map((p) => (
                  <div key={p.id} className="bg-[#0f0f13] border border-white/5 rounded-xl p-2.5 lg:p-3 flex flex-col hover:border-white/20 transition group cursor-pointer">
                    <div className="aspect-square w-full rounded-lg overflow-hidden mb-3 bg-white/5 relative">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                    <h3 className="text-xs lg:text-sm font-bold leading-tight line-clamp-2 mb-1">{p.name}</h3>
                    <p className="text-[10px] lg:text-xs text-white/50 mb-2 lg:mb-3">{p.creatorName}</p>
                    <p className="text-sm lg:text-lg font-black text-white mb-2 lg:mb-4">${(p.price_cents / 100).toFixed(2)}</p>
                    <button className="mt-auto w-full py-1.5 lg:py-2 bg-white/5 hover:bg-[#E53945] text-white text-[10px] lg:text-xs font-bold rounded-lg transition">Add to Cart</button>
                  </div>
                )) : (
                  <div className="col-span-2 lg:col-span-5 text-white/40 py-8 text-center border border-dashed border-white/10 rounded-xl">No merch available yet.</div>
                )}
              </div>
            </section>

            {/* Featured Collections */}
            <section>
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-2"><ShoppingBag size={20} className="text-[#E53945]"/> Featured Collections</h2>
                <button className="text-sm text-white/50 hover:text-white flex items-center gap-1 transition">View all <ArrowRight size={14}/></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {[
                  { title: "History Collection", bg: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=600&auto=format&fit=crop", tags: "Books · Documentaries · Merch" },
                  { title: "Documentary Collection", bg: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop", tags: "Books · Videos · Merch" },
                  { title: "Exclusive Publications", bg: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop", tags: "Books · E-books · Research" },
                  { title: "Limited Edition Merch", bg: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600&auto=format&fit=crop", tags: "Clothing · Accessories · Posters" },
                ].map((col, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-[2/1] lg:aspect-[16/9] cursor-pointer group">
                    <img src={col.bg} alt={col.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-3 lg:p-4">
                      <h3 className="font-bold text-white text-sm lg:text-base mb-1">{col.title}</h3>
                      <p className="text-[9px] lg:text-[10px] text-white/60 mb-1 lg:mb-2">{col.tags}</p>
                      <span className="text-[10px] lg:text-xs font-bold text-[#E53945] flex items-center gap-1">Shop Collection <ChevronRight size={12} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN (Sidebar - Stacks on mobile) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Exclusive Release */}
            <div className="bg-gradient-to-br from-[#1c1c1e] to-[#0f0f13] border border-white/10 rounded-2xl p-5 lg:p-6 flex flex-col items-center text-center">
              <p className="text-[#E53945] text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-3 lg:mb-4">Exclusive Release</p>
              <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=300&auto=format&fit=crop" alt="Book" className="w-24 h-32 lg:w-32 lg:h-44 object-cover rounded-lg shadow-2xl mb-3 lg:mb-4" />
              <h3 className="text-base lg:text-lg font-bold leading-tight mb-1">The Hidden History</h3>
              <p className="text-[10px] lg:text-xs text-white/50 mb-4">By James Corbett</p>
              <button className="w-full py-2 lg:py-2.5 bg-[#E53945] hover:bg-[#d12e39] text-white text-xs lg:text-sm font-bold rounded-lg transition">Shop Now</button>
            </div>

            {/* Top Selling Creators */}
            <div className="bg-[#0f0f13] border border-white/5 rounded-2xl p-5 lg:p-6">
              <h3 className="font-bold text-white text-sm lg:text-base mb-4 lg:mb-6">Top Selling Creators</h3>
              <div className="space-y-3 lg:space-y-4">
                {MOCK_CREATORS.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-xs lg:text-sm font-bold text-white/30 w-3 lg:w-4">{i + 1}</span>
                    <img src={c.photo} alt={c.name} className="w-7 h-7 lg:w-8 lg:h-8 rounded-full border border-white/10 group-hover:border-[#E53945] transition" />
                    <div className="min-w-0">
                      <p className="text-xs lg:text-sm font-bold text-white group-hover:text-[#E53945] transition truncate">{c.name}</p>
                      <p className="text-[9px] lg:text-[10px] text-white/40 truncate">{c.tags}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Become a Creator CTA */}
            <div className="relative rounded-2xl overflow-hidden aspect-[2/1] lg:aspect-[3/4] flex flex-col justify-end p-4 lg:p-6 border border-white/10">
              <img src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=600&auto=format&fit=crop" alt="Creator" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="relative z-10">
                <h3 className="text-lg lg:text-xl font-black text-white mb-1 lg:mb-2">Become a Creator</h3>
                <p className="text-[10px] lg:text-xs text-white/70 mb-3 lg:mb-4">Share your work. Reach a global audience. Sell your books, merch and more.</p>
                <Link href="/apply" className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 border border-white/30 rounded-lg text-xs lg:text-sm font-bold text-white hover:bg-white/10 transition">
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
