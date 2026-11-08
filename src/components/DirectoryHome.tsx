"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play } from "lucide-react";

export default function DirectoryHome({ videos, creators }: { videos: any[], creators: any[] }) {
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  
  useEffect(() => {
    fetch("/api/products/global")
      .then(r => r.json())
      .then(d => setShopProducts(d.products || []))
      .catch(() => {});
  }, []);

  return (
    <div className="relative z-10 pt-4 pb-32 md:pb-20 max-w-[1600px] mx-auto px-4 md:px-12 space-y-10 mt-6">
      
      {/* 1. DISCOVER CREATORS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Discover <span className="text-[#E53945]">Creators</span></h2>
          <Link href="/creators" className="text-xs font-bold text-white/50 hover:text-white transition">View All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
          {creators.slice(0, 15).map((c: any) => (
            <Link key={c.id} href={`/profile/${c.slug}`} className="flex flex-col items-center shrink-0 w-20 md:w-24 group">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-white/10 group-hover:border-[#E53945] transition mb-2">
                {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl font-bold">{c.name?.[0]}</div>}
              </div>
              <span className="text-xs font-semibold truncate w-full text-center">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. DON'T MISS A THING */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Don't Miss A <span className="text-[#E53945]">Thing</span></h2>
          <Link href="/latest" className="text-xs font-bold text-white/50 hover:text-white transition">View All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
          {videos.filter((v: any) => {
            const t = v.type?.toLowerCase();
            return t !== "short" && t !== "tweet" && v.visibility !== "premium" && v.feed_visible !== false;
          }).slice(0, 8).map((v: any) => (
            <Link key={v.id} href="/latest" className="flex flex-col w-64 md:w-72 shrink-0 group">
              <div className="relative aspect-video rounded-xl overflow-hidden mb-2 border border-white/5 bg-[#1c1c1e]">
                <img src={v.backdropUrl || v.posterUrl} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-1.5 py-0.5 rounded">{v.duration || "0:00"}</div>
              </div>
              <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-[#E53945] transition">{v.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. SHORTS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="w-6 h-6 bg-[#E53945] rounded-full flex items-center justify-center"><Play size={12} fill="white" className="text-white ml-0.5" /></span>
            Shorts
          </h2>
          <Link href="/feed" className="text-xs font-bold text-white/50 hover:text-white transition">View All</Link>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide">
          {videos.filter((v: any) => v.type?.toLowerCase() === "short").slice(0, 10).map((v: any) => (
            <Link key={v.id} href="/feed" className="relative w-[120px] md:w-[150px] aspect-[9/16] shrink-0 rounded-xl overflow-hidden group">
              {(v.videoUrl || v.bitchuteUrl) ? (
                  <video 
                    src={v.videoUrl || v.bitchuteUrl} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img src={v.posterUrl || v.backdropUrl} className="w-full h-full object-cover" />
                )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white text-[11px] font-bold leading-tight line-clamp-2 mb-1">{v.title}</h3>
                <p className="text-white/60 text-[10px] font-semibold">{v.views || 0} views</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. MERCHANDISE */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">Discover <span className="text-[#E53945]">Merchandise</span></h2>
          <Link href="/merchandise" className="text-xs font-bold text-white/50 hover:text-white transition">View All</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
          {shopProducts.slice(0, 10).map((p: any) => (
            <Link key={p.id} href="/merchandise" className="flex flex-col w-36 md:w-44 shrink-0 group">
              <div className="relative aspect-square rounded-xl overflow-hidden mb-2 border border-white/5 bg-[#1c1c1e]">
                <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
              </div>
              <p className="text-[#1DB954] font-black text-xs md:text-sm tracking-tight leading-none mb-1">${(p.price_cents / 100).toFixed(2)}</p>
              <h3 className="text-[11px] md:text-sm font-semibold text-white/90 line-clamp-2 leading-tight">{p.name}</h3>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
