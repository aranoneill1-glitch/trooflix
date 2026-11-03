"use client";

import { useState } from "react";
import { Heart, Eye, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Stream } from "@cloudflare/stream-react";

type FloatingHeart = { id: number; x: number };

export default function LivePlayer({ whepUrl, liveInputId }: { whepUrl?: string, liveInputId: string }) {
  const [viewers] = useState(Math.floor(Math.random() * 500) + 42);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const spawnHeart = () => {
    const id = Date.now();
    setHearts((prev) => [...prev, { id, x: Math.random() * 40 - 20 }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
      
      {/* THE OFFICIAL CLOUDFLARE STREAM PLAYER */}
      <div className="absolute inset-0 w-full h-full">
        <Stream 
          src={liveInputId} 
          controls 
          autoplay 
        />
      </div>
      
      {/* Top Glass UI */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start z-10">
        <div className="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-md flex items-center gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Eye size={14} /> {viewers}
        </div>
      </div>

      {/* Floating Hearts */}
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div 
            key={h.id} 
            initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }} 
            animate={{ opacity: 0, y: -150, scale: 1.5, x: h.x }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 1.5, ease: "easeOut" }} 
            className="absolute bottom-20 right-10 text-[#E53945] pointer-events-none z-30"
          >
            <Heart size={32} fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bottom Glass UI (Hearts & Share) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-end items-center gap-3 z-20 pointer-events-none">
        <button onClick={() => navigator.share?.({ url: window.location.href })} className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition">
          <Share2 size={20} />
        </button>
        <button onClick={spawnHeart} className="pointer-events-auto p-4 rounded-full bg-[#E53945] hover:bg-[#d12e39] shadow-[0_0_20px_rgba(229,57,69,0.4)] text-white transition active:scale-90">
          <Heart size={24} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
