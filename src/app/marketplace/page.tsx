"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, ArrowLeft, MoreVertical } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

// Mock data structure - we will replace this with your actual API fetch later
const MOCK_MERCH = [
  { id: 1, name: "Classic Logo Tee", price: 25.00, creator: "SSECA", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80" },
  { id: 2, name: "Director's Hoodie", price: 45.00, creator: "Indie Films", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80" },
  { id: 3, name: "Documentary Cap", price: 20.00, creator: "True Crime Pod", image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80" },
  { id: 4, name: "Script Coffee Mug", price: 15.00, creator: "Screenwriters", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&q=80" },
  { id: 5, name: "Vintage Film Poster", price: 30.00, creator: "History Buffs", image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=500&q=80" },
  { id: 6, name: "Creator Tote Bag", price: 18.00, creator: "Podcast Network", image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=500&q=80" },
];

export default function MarketplacePage() {
  const [merch, setMerch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setMerch(MOCK_MERCH);
      setLoading(false);
    }, 500);
  }, []);

  const filteredMerch = merch.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.creator.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans">
      <TopBar />

      <div className="max-w-4xl mx-auto pt-24 px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-1">
              SUPPORT CREATORS
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Creator <span className="text-[#E53945]">Store</span>
            </h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-white/40" />
            </div>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="Search merch or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Grid */}
            {filteredMerch.length === 0 ? (
              <div className="text-center py-20 text-white/50">
                No merchandise found for "{searchQuery}".
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {filteredMerch.map((item) => (
                  <Link key={item.id} href={`/marketplace/${item.id}`} className="group cursor-pointer">
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#1c1c1e] mb-3 border border-white/5">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ShoppingBag size={14} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition-colors">{item.name}</h3>
                      <p className="text-xs text-white/50 mt-0.5">{item.creator}</p>
                      <p className="text-sm font-black text-[#E53945] mt-1">${item.price.toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
        
      </div>

      <MobileBottomNav />
    </main>
  );
}
