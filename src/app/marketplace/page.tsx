"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, ArrowLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

export default function MarketplacePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadMarketplace() {
      const supabase = createClient();

      // Fetch active products, and join with profiles to get the creator's name
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          price_cents,
          image_url,
          creator_id,
          inventory_count
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
        return;
      }

      // Fetch creator names for the products we got
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(p => p.creator_id))];
        
        const { data: creators } = await supabase
          .from("profiles")
          .select("creator_id, display_name")
          .in("creator_id", creatorIds);

        // Merge creator names into products
        const creatorMap = new Map(creators?.map(c => [c.creator_id, c.display_name]) || []);
        const enrichedProducts = data.map(p => ({
          ...p,
          creator_name: creatorMap.get(p.creator_id) || "Creator"
        }));

        setProducts(enrichedProducts);
      }
      setLoading(false);
    }
    loadMarketplace();
  }, []);

  const filteredProducts = products.filter(item => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.creator_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans">
      <TopBar />

      <div className="max-w-4xl mx-auto pt-24 px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-1 uppercase">
              Support Creators
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Creator <span className="text-[#E53945]">Store</span>
            </h1>
          </div>
          
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
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#1c1c1e] border border-white/10 rounded-2xl">
            <ShoppingBag size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/50 mb-2">No products available yet.</p>
            <p className="text-xs text-white/30">Check back soon — creators are adding new merch all the time!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {filteredProducts.map((item) => (
              <Link key={item.id} href={`/marketplace/${item.id}`} className="group cursor-pointer">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#1c1c1e] mb-3 border border-white/5">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <ShoppingBag size={32} />
                    </div>
                  )}
                  {item.inventory_count === 0 && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase tracking-wider">Sold Out</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ShoppingBag size={14} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition-colors">{item.name}</h3>
                  <p className="text-xs text-white/50 mt-0.5">{item.creator_name}</p>
                  <p className="text-sm font-black text-[#E53945] mt-1">${(item.price_cents / 100).toFixed(2)}</p>
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
