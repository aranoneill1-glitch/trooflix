"use client";

import { useState } from "react";
import { Play, AlertCircle } from "lucide-react";

export default function LivePlayer({ streamId }: { streamId: string }) {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);

  if (error || !streamId) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-white font-bold text-lg mb-2">Stream unavailable</p>
        <button 
          onClick={() => { setError(false); setStarted(false); }}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-bold transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
      
      {/* Cloudflare's official iframe player */}
      {started ? (
        <iframe
          src={`https://customer-139pmz2lqaevjhkm.cloudflarestream.com/${streamId}/iframe`}
          className="w-full h-full border-none"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      ) : (
        <div 
          onClick={() => setStarted(true)}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 cursor-pointer backdrop-blur-sm"
        >
          <div className="w-16 h-16 bg-[#E53945] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(229,57,69,0.5)]">
            <Play size={32} className="text-white ml-1" fill="currentColor" />
          </div>
          <p className="text-white font-bold text-lg">Tap to watch live</p>
        </div>
      )}
      
      <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse z-10 pointer-events-none">
        <div className="w-2 h-2 bg-white rounded-full" /> LIVE
      </div>
    </div>
  );
}
