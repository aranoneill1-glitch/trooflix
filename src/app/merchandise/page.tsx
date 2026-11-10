"use client";

import { useRouter } from "next/navigation";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ArrowLeft, ShoppingBag, Search, Star, X, Plus, ArrowRight, Heart } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function MerchandisePage() {
  const router = useRouter();
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
      
                  {/* CINEMATIC HERO */}
      <div className="relative w-full h-[40vh] md:h-[50vh]">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop"
          alt="Marketplace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-black/60" />
        
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 z-20 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition border border-white/10"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-2 uppercase">
              Explore Category
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl">
              Marketplace
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10">
              {(["Merchandise", "Books"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={"px-5 py-2 rounded-full font-bold text-sm transition " + (activeTab === tab ? "bg-white text-black" : "text-white/70 hover:text-white hover:bg-white/10")}>{tab}</button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 backdrop-blur-xl border border-white/20 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#E53945]/50 transition-all shadow-xl"
              />
            </div>
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
