"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, Edit, Trash2, Package, DollarSign, TrendingUp, 
  Search, MoreVertical, ShoppingBag
} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

export default function CreatorShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadShop() {
      const user = await getCachedUser();
      if (!user) return setLoading(false);

      const supabase = createClient();
      
      // 1. Get the creator_id from the user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("creator_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.creator_id) {
        // 2. Fetch real products and completed orders
        const [productsRes, ordersRes] = await Promise.all([
          supabase
            .from("products")
            .select("*")
            .eq("creator_id", profile.creator_id)
            .order('created_at', { ascending: false }),
          supabase
            .from("merch_orders")
            .select("*")
            .eq("creator_id", profile.creator_id)
            .eq("status", "paid") // Only count paid orders as revenue
        ]);

        if (productsRes.data) setProducts(productsRes.data);
        if (ordersRes.data) setOrders(ordersRes.data);
      }
      setLoading(false);
    }
    loadShop();
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate real stats
  const totalRevenueCents = orders.reduce((acc, o) => acc + (o.amount_cents || 0), 0);
  const totalSold = orders.length;
  const activeListings = products.filter(p => p.active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-4xl mx-auto pt-24 px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-1 uppercase">
              Creator Shop
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Manage Your <span className="text-[#E53945]">Store</span>
            </h1>
          </div>
          
          <button className="flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-[#E53945]/20 w-full md:w-auto">
            <Plus size={18} /> Add New Product
          </button>
        </div>

        {/* Real Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
            <DollarSign className="absolute top-4 right-4 text-[#1ed760]/20" size={40} />
            <p className="text-xs text-white/60 font-semibold mb-1">Total Revenue</p>
            <h3 className="text-3xl font-black text-white">${(totalRevenueCents / 100).toFixed(2)}</h3>
          </div>
          <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
            <Package className="absolute top-4 right-4 text-[#E53945]/20" size={40} />
            <p className="text-xs text-white/60 font-semibold mb-1">Items Sold</p>
            <h3 className="text-3xl font-black text-white">{totalSold}</h3>
          </div>
          <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
            <TrendingUp className="absolute top-4 right-4 text-blue-500/20" size={40} />
            <p className="text-xs text-white/60 font-semibold mb-1">Active Listings</p>
            <h3 className="text-3xl font-black text-white">{activeListings}</h3>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-white/40" />
          </div>
          <input
            type="text"
            className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/40 rounded-full py-3 pl-11 pr-4 focus:outline-none focus:border-white/30 transition-colors"
            placeholder="Search your products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-[#1c1c1e] border border-white/10 rounded-2xl">
              <ShoppingBag size={40} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/50">You haven't added any products yet.</p>
              <button className="mt-4 text-[#E53945] font-bold hover:text-white transition">
                Create your first listing
              </button>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 flex gap-4 group hover:border-white/20 transition-colors"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0 relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <ShoppingBag size={24} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-white truncate pr-2">{product.name}</h3>
                      <button className="text-white/40 hover:text-white transition">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    <p className="text-[#E53945] font-black text-lg">${(product.price_cents / 100).toFixed(2)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`font-bold px-2 py-1 rounded-md ${
                        product.inventory_count === 0 ? "bg-red-500/20 text-red-400" : 
                        product.inventory_count <= 5 ? "bg-yellow-500/20 text-yellow-400" : 
                        "bg-[#1ed760]/20 text-[#1ed760]"
                      }`}>
                        {product.inventory_count === 0 ? "Out of Stock" : `${product.inventory_count} left`}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
