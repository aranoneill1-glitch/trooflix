"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, Unlock, Play } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Video = {
  id: string;
  title: string;
  type: string;
  is_premium?: boolean;
  posterUrl?: string;
};

export default function StudioEpisodes() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const user = await getCachedUser();
    if (!user) return;
    
    const res = await fetch(`/api/creator/videos?userId=${user.id}`);
    const d = await res.json();
    setVideos(d.videos || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const togglePremium = async (video: Video) => {
    // Optimistic UI update
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_premium: !v.is_premium } : v));
    
    await fetch("/api/creator/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id, is_premium: !video.is_premium }),
    });
  };

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition">
        <ChevronLeft size={16} /> Back to dashboard
      </Link>

      <h1 className="text-2xl font-black mb-1">Your Episodes</h1>
      <p className="text-white/50 text-sm mb-6">
        Mark episodes as Premium. Subscribers pay you directly to watch them.
      </p>

      <div className="space-y-3">
        {videos.map((v) => (
          <div key={v.id} className="bg-[#141418] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-10 bg-black rounded overflow-hidden flex-shrink-0 relative">
                {v.posterUrl ? (
                  <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Play size={16} className="absolute inset-0 m-auto text-white/30" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{v.title}</p>
                <p className="text-xs text-white/40 capitalize">{v.type}</p>
              </div>
            </div>

            <button
              onClick={() => togglePremium(v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                v.is_premium 
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" 
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {v.is_premium ? <Lock size={14} /> : <Unlock size={14} />}
              {v.is_premium ? "Premium" : "Free"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
