"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShoppingBag, Search, Star, X, Plus, ArrowRight, Heart } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function MerchandisePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"Merchandise" | "Books">("Merchandise");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [basket, setBasket] = useState<any[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [wishlistedIds, setWishlistedIds] = useState<number[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("profiles").select("user_id, username, avatar_url, display_name").not("avatar_url", "is", null)
      .then(({ data }) => { if (data) setCreatorProfiles(data); });

    fetch("/api/products/global")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        fetch(`/api/wishlist?userId=${data.user.id}`)
          .then(r => r.json())
          .then(d => {
            if (d.items) setWishlistedIds(d.items.map((i: any) => i.id));
          });
      }
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("trooflix_basket");
    if (stored) {
      try { setBasket(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  const addToBasket = (product: any) => {
    const newBasket = [...basket];
    const existing = newBasket.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      newBasket.push({ ...product, quantity: 1 });
    }
    setBasket(newBasket);
    localStorage.setItem("trooflix_basket", JSON.stringify(newBasket));
    alert(`Added "${product.name}" to your basket!`);
  };

  const toggleWishlist = async (e: React.MouseEvent, productId: number) => {
    e.stopPropagation();
    if (!user) return alert("Please log in to add to wishlist.");
    
    const isWishlisted = wishlistedIds.includes(productId);
    setWishlistedIds(prev => isWishlisted ? prev.filter(id => id !== productId) : [...prev, productId]);
    
    try {
      if (isWishlisted) {
        await fetch(`/api/wishlist?userId=${user.id}&productId=${productId}`, { method: "DELETE" });
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, productId })
        });
      }
    } catch (e) { console.error("Wishlist error:", e); }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.creatorName?.toLowerCase().includes(q));
    }
    
    if (activeTab === "Merchandise") {
      result = result.filter(p => p.type?.toLowerCase() !== 'book');
    } else if (activeTab === "Books") {
      result = result.filter(p => p.type?.toLowerCase() === 'book');
    }
    return result;
  }, [products, searchQuery, activeTab]);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 lg:pb-20 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      
      {/* EDITORIAL HERO COLLAGE */}
      <div className="relative w-full h-[45vh] md:h-[55vh] flex overflow-hidden">
        {/* 4 Image Slices */}
        <div className="flex-1 hidden md:block relative group">
          <img src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop" alt="" className="w-full h-full object-cover grayscale-[20%] opacity-80" />
        </div>
        <div className="flex-1 relative group">
          <img src="https://images.unsplash.com/photo-1615160460366-2c9c9c1e2d9f?q=80&w=800&auto=format&fit=crop" alt="" className="w-full h-full object-cover grayscale-[20%] opacity-80" />
        </div>
        <div className="flex-1 relative group">
          <img src="https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop" alt="" className="w-full h-full object-cover grayscale-[20%] opacity-80" />
        </div>
        <div className="flex-1 hidden md:block relative group">
          <img src="https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop" alt="" className="w-full h-full object-cover grayscale-[20%] opacity-80" />
        </div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

        {/* Centered Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 md:pb-16 text-center px-4 z-10">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none mb-8 drop-shadow-2xl">
            Creator <span className="bg-gradient-to-r from-orange-500 to-[#E53945] bg-clip-text text-transparent">Marketplace</span>
          </h1>
          
          <div className="flex flex-wrap justify-center gap-3">
            {(["Merchandise", "Books"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-full text-sm font-bold uppercase tracking-[0.15em] transition-all duration-300 border border-transparent ${
                  activeTab === tab
                    ? "bg-black text-white border-white/20 shadow-2xl scale-105"
                    : "bg-black/40 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH & ACTIONS ROW */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          
          {/* Search Bar */}
          <div className="relative w-full max-w-lg group">
            <div className="absolute inset-0 bg-[#E53945]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full pointer-events-none" />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#E53945] transition-colors z-10" size={18} />
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative z-10 w-full bg-[#0f0f12] border border-white/10 rounded-full py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E53945] transition-all shadow-xl"
            />
          </div>
          
          {/* Right Icons */}
          <div className="flex items-center gap-4 shrink-0">
             <div className="text-xs font-bold text-white/40 uppercase tracking-widest hidden md:block mr-2">
               {filteredProducts.length} Items
             </div>
             
             <button className="p-2.5 bg-[#0f0f12] border border-white/10 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white">
               <Heart size={20} />
             </button>
             <button className="relative p-2.5 bg-[#0f0f12] border border-white/10 rounded-full hover:bg-white/10 transition text-white/70 hover:text-white">
               <ShoppingBag size={20} />
               {basket.length > 0 && (
                 <span className="absolute -top-1 -right-1 bg-[#E53945] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#09090B]">
                   {basket.length}
                 </span>
               )}
             </button>
          </div>
        </div>

        {/* PRODUCT GRID */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-3xl bg-[#0f0f12]">
            <ShoppingBag className="mx-auto text-white/20 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">No items found</h3>
            <p className="text-white/50 text-sm">
              {searchQuery ? `We couldn't find anything matching "${searchQuery}".` : `No ${activeTab.toLowerCase()} listed yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((p) => (
              <div 
                key={p.id} 
                onClick={() => setSelectedProduct(p)}
                className="group flex flex-col cursor-pointer"
              >
                {/* Image Container */}
                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-[#141418] mb-3">
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700" 
                  />
                  
                  {/* Like Button */}
                  <button 
                    className={`absolute top-3 right-3 p-2 rounded-full shadow-md hover:scale-110 transition backdrop-blur-md ${wishlistedIds.includes(p.id) ? "bg-[#D4AF37] text-black" : "bg-black/40 text-white"}`} 
                    onClick={(e) => toggleWishlist(e, p.id)}
                  >
                    <Star size={16} fill={wishlistedIds.includes(p.id) ? "currentColor" : "none"} />
                  </button>

                  {/* Quick Add */}
                  <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToBasket(p); }}
                      className="w-full bg-white text-black font-bold text-xs py-2.5 rounded-xl hover:bg-gray-200 transition shadow-lg flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Quick Add
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1 truncate">{p.creatorName}</p>
                    <h3 className="text-sm font-bold text-white leading-tight truncate group-hover:text-[#E53945] transition-colors">{p.name}</h3>
                  </div>
                  <p className="text-sm font-black text-green-400 shrink-0">${(p.price_cents / 100).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRODUCT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            
            <button onClick={() => setSelectedProduct(null)} className="absolute top-3 right-3 z-10 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white transition">
              <X size={18} />
            </button>
            
            <div className="w-full aspect-[4/5] bg-black relative">
              <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="p-5">
              <p className="text-2xl font-black text-[#1DB954] mb-1">${(selectedProduct.price_cents / 100).toFixed(2)}</p>
              <h2 className="text-base font-bold text-white mb-2 leading-tight line-clamp-2">{selectedProduct.name}</h2>
              <p className="text-xs text-white/60 mb-4">Stock: {selectedProduct.stock} available</p>
              
              <Link href={`/profile/${selectedProduct.creatorSlug}`} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition group">
                <div className="flex items-center gap-2.5">
                  {selectedProduct.creatorPhoto ? (
                    <img src={selectedProduct.creatorPhoto} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#E53945] flex items-center justify-center font-bold text-white text-xs">
                      {selectedProduct.creatorName?.charAt(0) || "C"}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <p className="text-xs font-bold text-white group-hover:text-[#E53945] transition-colors">{selectedProduct.creatorName}</p>
                    <p className="text-[10px] text-white/50">Visit Store</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-white/30 group-hover:text-white transition" />
              </Link>

              <div className="flex gap-2 mt-5">
                <button onClick={() => addToBasket(selectedProduct)} className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition border border-white/10">
                  <Plus size={16} /> Add to Basket
                </button>
                <button className="flex-1 py-3 bg-[#E53945] hover:bg-[#d12e39] text-white text-xs font-bold rounded-xl transition shadow-[0_0_15px_rgba(229,57,69,0.3)]">
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}
