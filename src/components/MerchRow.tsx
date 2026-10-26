"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

export default function MerchRow({ title, items }: { title: string; items: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.8;
    ref.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative group/row mt-6">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <ShoppingBag size={20} className="text-red-500" />
          {title}
        </h2>
        <Link href="/merchandise" className="text-xs font-semibold text-white/50 hover:text-white transition">
          Shop All
        </Link>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"
        >
          <ChevronLeft size={32} />
        </button>

        <div
          ref={ref}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-6 scroll-smooth"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/podcaster/${item.creatorSlug}`}
              className="group relative flex-shrink-0 w-[140px] md:w-[180px] flex flex-col"
            >
              {/* Product Image (Square) */}
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-[#1c1c1e] mb-3 relative border border-white/5 group-hover:border-white/20 transition-all duration-300">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ShoppingBag size={32} />
                  </div>
                )}
                
                {/* Price Badge */}
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-lg">
                  <span className="text-xs font-black text-green-400">
                    ${(item.price_cents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Info Below */}
              <div className="px-1 flex flex-col">
                <p className="text-sm font-bold text-white group-hover:text-red-400 transition line-clamp-1">
                  {item.name}
                </p>
                
                <div className="flex items-center gap-1.5 mt-1.5">
                  {item.creatorPhoto ? (
                    <img src={item.creatorPhoto} alt="" className="w-4 h-4 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-[8px] font-bold">
                      {item.creatorName?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <p className="text-[10px] text-white/50 truncate">
                    {item.creatorName || "Creator"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/60 hover:bg-black/80 opacity-0 group-hover/row:opacity-100 transition items-center justify-center"
        >
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
}
