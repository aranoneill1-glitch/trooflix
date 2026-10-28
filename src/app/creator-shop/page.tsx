"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Plus, Edit, Trash2, Tag, Package, DollarSign, TrendingUp, 
  ArrowLeft, Search, MoreVertical 
} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { motion } from "framer-motion";

// Mock Data for the creator's shop
const MOCK_PRODUCTS = [
  { id: 1, name: "Classic Logo Tee", price: 25.00, stock: 45, sold: 120, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80" },
  { id: 2, name: "Director's Hoodie", price: 45.00, stock: 12, sold: 85, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80" },
  { id: 3, name: "Documentary Cap", price: 20.00, stock: 0, sold: 200, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80" },
  { id: 4, name: "Script Coffee Mug", price: 15.00, stock: 2, sold: 34, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&q=80" },
];

export default function CreatorShopPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = products.reduce((acc, p) => acc + (p.price * p.sold), 0);
  const totalSold = products.reduce((acc, p) => acc + p.sold, 0);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-4xl mx-auto pt-24 px-4 md:px-8">
        
        {/* Header Area */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
            <DollarSign className="absolute top-4 right-4 text-[#1ed760]/20" size={40} />
            <p className="text-xs text-white/60 font-semibold mb-1">Total Revenue</p>
            <h3 className="text-3xl font-black text-white">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
            <Package className="absolute top-4 right-4 text-[#E53945]/20" size={40} />
            <p className="text-xs text-white/60 font-semibold mb-1">Items Sold</p>
            <h3 className="text-3xl font-black text-white">{totalSold}</h3>
          </div>
          <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl relative overflow-hidden">
            <TrendingUp className="absolute top-4 right-4 text-blue-500/20" size={40} />
            <p className="text-xs text-white/60 font-semibold mb-1">Active Listings</p>
            <h3 className="text-3xl font-black text-white">{products.length}</h3>
          </div>
        </div>

        {/* Search Bar */}
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
          {filteredProducts.map((product) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 flex gap-4 group hover:border-white/20 transition-colors"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0 relative">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-white truncate pr-2">{product.name}</h3>
                    <button className="text-white/40 hover:text-white transition">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <p className="text-[#E53945] font-black text-lg">${product.price.toFixed(2)}</p>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-bold px-2 py-1 rounded-md ${
                      product.stock === 0 ? "bg-red-500/20 text-red-400" : 
                      product.stock <= 5 ? "bg-yellow-500/20 text-yellow-400" : 
                      "bg-[#1ed760]/20 text-[#1ed760]"
                    }`}>
                      {product.stock === 0 ? "Out of Stock" : `${product.stock} left`}
                    </span>
                    <span className="text-white/50">{product.sold} sold</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition" title="Price">
                      <Tag size={14} />
                    </button>
                    <button className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
