"use client";

import { useEffect, useState, useMemo } from "react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ShoppingBag, Search, Heart, ShieldCheck, X } from "lucide-react";

export default function MerchandisePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetch("/api/products/global")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(q) || p.creatorName?.toLowerCase().includes(q));
  }, [products, searchQuery]);

  const merchandise = useMemo(() => {
    return filteredProducts.filter(p => p.type?.toLowerCase().includes('merch') || !p.type?.toLowerCase().includes('book'));
  }, [filteredProducts]);

  const books = useMemo(() => {
    return filteredProducts.filter(p => p.type?.toLowerCase().includes('book'));
  }, [filteredProducts]);

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-24 lg:pb-20">
      <TopBar />
      
      {/* CINEMATIC HERO */}
      <div className="relative w-full h-[45vh] md:h-[55vh] flex flex-col justify-end overflow-hidden pb-8 md:pb-12">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=2000&auto=format&fit=crop" 
            alt="Marketplace" 
            className="w-full h-full object-cover object-center" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/60 to-black/30" />
        </div>

        <div className="relative z-10 px-4 md:px-8 w-full max-w-7xl mx-auto flex flex-col items-start">
          <p className="text-[#E53945] font-bold tracking-[0.3em] text-[10px] md:text-xs uppercase mb-2 md:mb-3 drop-shadow-md">
            Explore Merchandise
          </p>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight drop-shadow-2xl mb-6">
            Marketplace
          </h1>

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
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        
        {/* 1. FEATURED MERCHANDISE (3-Column Grid) */}
        {merchandise.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
               {searchQuery ? "Merchandise Results" : "Featured Merchandise"}
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 pb-4">
              {merchandise.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
              ))}
            </div>
          </section>
        )}

        {/* 2. FEATURED BOOKS (3-Column Grid) */}
        {books.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              {searchQuery ? "Book Results" : "Featured Books"}
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 pb-4">
              {books.map((p) => (
                <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
              ))}
            </div>
          </section>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredProducts.length === 0 && (
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

      </div>

      {/* ITEM MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition">
              <X size={20} />
            </button>
            
            <div className="w-full aspect-square bg-black relative">
              <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="p-6 md:p-8">
              <p className="text-3xl font-black text-[#1DB954] mb-2">${(selectedProduct.price_cents / 100).toFixed(2)}</p>
              <h2 className="text-xl font-bold text-white mb-4 leading-tight">{selectedProduct.name}</h2>
              
              <div className="flex items-center gap-3 pt-6 border-t border-white/10">
                {selectedProduct.creatorPhoto ? (
                  <img src={selectedProduct.creatorPhoto} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#E53945] flex items-center justify-center font-bold text-white text-lg">
                    {selectedProduct.creatorName?.charAt(0) || "C"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-white">{selectedProduct.creatorName}</p>
                  <p className="text-xs text-white/50">Seller</p>
                </div>
              </div>
              
              <button className="w-full mt-8 py-4 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(229,57,69,0.3)]">
                Buy Now
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}

// VINTED-STYLE PRODUCT CARD
function ProductCard({ product, onClick }: { product: any, onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex flex-col group cursor-pointer w-full">
      
      {/* Image Container */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-2 border border-white/5 bg-[#1c1c1e]">
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
        
        {/* Like Button */}
        <button className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-black shadow-md hover:scale-110 transition" onClick={(e) => e.stopPropagation()}>
          <Heart size={14} />
        </button>

        {/* Delivery Tag (Hidden on small mobile to save space) */}
        <div className="hidden sm:flex absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
          <ShieldCheck size={10} className="text-white" /> Delivery
        </div>
      </div>

      {/* Details */}
      <p className="text-[#1DB954] font-black text-sm md:text-base tracking-tight leading-none mb-1">${(product.price_cents / 100).toFixed(2)}</p>
      <h3 className="text-[11px] md:text-sm font-semibold text-white/90 line-clamp-2 leading-tight">{product.name}</h3>
    </div>
  );
}
