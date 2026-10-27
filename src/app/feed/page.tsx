"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, MoreVertical, Plus, VolumeX, ChevronLeft, Search } from "lucide-react";
import { motion } from "framer-motion";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";

type Video = {
  id: number;
  title: string;
  description?: string;
  type: string;
  posterUrl: string;
  backdropUrl?: string;
  creatorId?: number | null;
  createdAt?: string;
  duration?: string;
  viewCount?: number;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  isVerified?: boolean;
};

function timeAgo(iso?: string): string {
  if (!iso) return "Just now";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos", { cache: "no-store" }).then(r => r.json()),
      getCachedCreators()
    ])
      .then(([vData, cData]) => {
        const allVids = Array.isArray(vData) ? vData : [];
        // Sort by newest
        allVids.sort((a: any, b: any) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bt - at;
        });
        setVideos(allVids);
        setCreators(Array.isArray(cData) ? cData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getCreator = (id?: number | null) => {
    if (!id) return null;
    return creators.find(c => c.id === id);
  };

  const featuredVideo = videos[0];
  const moreEpisodes = videos.slice(1, 8);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      <TopBar />

      <div className="pt-24 md:pt-28 max-w-2xl mx-auto px-4 md:px-6">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => window.history.back()} className="p-2 bg-[#1c1c1e] rounded-full hover:bg-[#2c2c2e] transition">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex-1">Podcast Feed</h1>
          <button className="p-2 text-white/70 hover:text-white">
            <Search size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* FEATURED EPISODE */}
            {featuredVideo && (
              <div>
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#1c1c1e] group cursor-pointer shadow-xl border border-white/5">
                  <img src={featuredVideo.posterUrl || featuredVideo.backdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  
                  {/* Top Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                    <div className="bg-black/80 px-2 py-1 rounded-md text-[11px] font-bold tracking-wider">
                      {featuredVideo.duration || "1:34:29"}
                    </div>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-black/80 transition">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Center Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link href={`/podcast/${featuredVideo.id}`} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition shadow-2xl">
                      <Play size={28} fill="black" className="ml-1" />
                    </Link>
                  </div>
                </div>

                {/* Featured Info */}
                <div className="flex gap-3 mt-4">
                  <div className="flex-shrink-0 pt-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold leading-tight mb-1">{featuredVideo.title}</h2>
                    <p className="text-sm text-white/50">
                      {getCreator(featuredVideo.creatorId)?.name || "Trooflix Creator"} • {timeAgo(featuredVideo.createdAt)}
                    </p>
                  </div>
                  <button className="p-2 text-white/50 hover:text-white h-fit">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* EPISODES TO TRY (Horizontal Scroll) */}
            {moreEpisodes.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4">Episodes to try</h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                  {moreEpisodes.map(v => (
                    <div key={v.id} className="flex-shrink-0 w-[240px] cursor-pointer group">
                      <div className="relative rounded-xl overflow-hidden aspect-video bg-[#1c1c1e] mb-2 border border-white/5">
                        <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute bottom-2 left-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {v.duration || "45:00"}
                        </div>
                      </div>
                      <h4 className="text-sm font-bold line-clamp-2 leading-tight">{v.title}</h4>
                      <p className="text-xs text-white/50 mt-1">{getCreator(v.creatorId)?.name || "Creator"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EPISODES YOU MIGHT LIKE (Vertical List) */}
            <div>
              <h3 className="text-xl font-bold mb-4">Episodes you might like</h3>
              <div className="space-y-6">
                {videos.slice(0, 10).map(v => {
                  const creator = getCreator(v.creatorId);
                  return (
                    <div key={v.id} className="group">
                      <div className="flex gap-3 bg-[#141414] p-3 rounded-2xl border border-white/5 hover:border-white/10 transition">
                        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative">
                          <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="text-sm font-bold leading-tight line-clamp-2 mb-1">{v.title}</h4>
                          <p className="text-xs text-white/50 flex items-center gap-1.5 flex-wrap">
                            {creator?.name || "Creator"}
                            {creator?.isVerified && <VerifiedBadge size={12} variant="gold" />}
                          </p>
                          <p className="text-[11px] text-white/40 mt-1">
                            {timeAgo(v.createdAt)} • {v.duration || "1h 20m"}
                          </p>
                        </div>
                        <button className="p-2 text-white/40 hover:text-white h-fit">
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      {/* Action Bar underneath */}
                      <div className="flex items-center justify-between mt-3 px-1">
                        <button className="flex items-center gap-2 bg-[#1c1c1e] hover:bg-[#2c2c2e] px-4 py-2 rounded-full transition border border-white/10">
                          <VolumeX size={16} className="text-white/70" />
                          <span className="text-xs font-bold">Preview episode</span>
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition">
                            <Plus size={18} />
                          </button>
                          <Link href={`/podcast/${v.id}`} className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition">
                            <Play size={16} fill="black" className="ml-0.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
