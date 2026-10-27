"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, MoreVertical, Plus, VolumeX } from "lucide-react";
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
  videoUrl?: string;
  creatorId?: number | null;
  createdAt?: string;
  duration?: string;
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col">
            {videos.map((v) => {
              const creator = getCreator(v.creatorId);
              return (
                <div key={v.id} className="w-full mb-10">
                  
                  {/* VIDEO SECTION (Full Width) */}
                  <div className="relative w-full aspect-video bg-black group cursor-pointer">
                    <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                    
                    {/* Top Overlays */}
                    <div className="absolute top-4 left-4 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white z-10">
                      {v.duration || "1:34:29"}
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
                      <button className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition">
                        <Plus size={20} />
                      </button>
                      <button className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition">
                        <VolumeX size={20} />
                      </button>
                    </div>

                    {/* Center Play Button */}
                    <Link href={`/podcast/${v.id}`} className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition shadow-2xl">
                        <Play size={28} fill="black" className="ml-1" />
                      </div>
                    </Link>
                  </div>

                  {/* RED STATUS/PROGRESS BAR UNDER VIDEO */}
                  <div className="w-full h-1 bg-[#1c1c1e]">
                    {/* Hardcoded width for visual demo, dynamically this would be width: {progress}% */}
                    <div className="h-full bg-[#E53945] w-[33%]" />
                  </div>

                  {/* INFO SECTION */}
                  <div className="px-4 py-3">
                    <div className="flex gap-3">
                      {/* SQUARE AVATAR */}
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-[#1c1c1e] flex-shrink-0">
                        {creator?.photoUrl ? (
                          <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-red-900 flex items-center justify-center font-bold text-sm">
                            {creator?.name?.[0] || "?"}
                          </div>
                        )}
                      </div>

                      {/* TITLE & CREATOR */}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-white leading-tight mb-1">
                          {v.title}
                        </h2>
                        <div className="flex items-center gap-1.5 text-sm text-white/60">
                          <span className="truncate">{creator?.name || "Creator"}</span>
                          {creator?.isVerified && <VerifiedBadge size={14} variant="gold" />}
                          <span>•</span>
                          <span>{timeAgo(v.createdAt)}</span>
                        </div>
                      </div>

                      {/* THREE DOTS */}
                      <button className="p-1 text-white/50 hover:text-white h-fit">
                        <MoreVertical size={20} />
                      </button>
                    </div>

                    {/* DESCRIPTION */}
                    {v.description && (
                      <p className="mt-3 text-sm text-white/70 line-clamp-2 leading-relaxed pl-[52px]">
                        {v.description}
                      </p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
