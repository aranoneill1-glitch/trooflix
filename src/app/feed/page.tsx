"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Info, X } from "lucide-react";
import TopBar from "@/components/TopBar";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import ViewCount from "@/components/ViewCount";
import MobileBottomNav from "@/components/MobileBottomNav";
import BitChutePlayer from "@/components/BitChutePlayer";
import VideoPlayer from "@/components/VideoPlayer";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  featured: boolean;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  duration: string;
  creatorId?: number | null;
  createdAt?: string;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos").then((r) => r.json()),
      fetch("/api/creators").then((r) => r.json()),
    ])
      .then(([vids, creats]) => {
        const list: Video[] = Array.isArray(vids) ? vids : [];
        // Sort by createdAt descending (newest first)
        list.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bTime - aTime;
        });
        setVideos(list);
        setCreators(Array.isArray(creats) ? creats : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const creatorById = (id?: number | null) => {
    if (!id) return null;
    return creators.find((c) => c.id === id) || null;
  };

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20 lg:pb-0">
      <TopBar />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 md:px-6">
        <h1 className="text-3xl md:text-4xl font-black mb-1">Feed</h1>
        <p className="text-white/50 mb-8">The newest from Trooflix</p>

        {loading && (
          <p className="text-white/50 text-center py-12">Loading…</p>
        )}

        {!loading && videos.length === 0 && (
          <p className="text-white/50 text-center py-12">Nothing here yet.</p>
        )}

        <div className="space-y-6">
          {videos.map((video) => {
            const creator = creatorById(video.creatorId);
            const label = creator ? creator.name : "TROOFLIX";
            const labelHref = creator ? `/podcaster/${creator.slug}` : null;

            return (
              <article
                key={video.id}
                className="bg-[#141418] border border-white/5 rounded-xl overflow-hidden hover:border-white/20 transition"
              >
                {/* Image / backdrop */}
                <div
                  onClick={() => setSelected(video)}
                  className="relative aspect-video cursor-pointer overflow-hidden group"
                >
                  <img
                    src={video.backdropUrl || video.posterUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-white/20 backdrop-blur rounded-full p-5">
                      <Play size={36} fill="white" className="text-white" />
                    </div>
                  </div>
                  {video.type && (
                    <span className="absolute top-3 left-3 bg-black/70 backdrop-blur text-xs font-bold uppercase tracking-wide px-2 py-1 rounded">
                      {video.type}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                    {labelHref ? (
                      <Link
                        href={labelHref}
                        className="font-semibold text-red-500 hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="font-semibold text-red-500">{label}</span>
                    )}
                    <span>·</span>
                    <span>{timeAgo(video.createdAt)}</span>
                  </div>

                  <h2
                    onClick={() => setSelected(video)}
                    className="text-xl md:text-2xl font-bold leading-tight mb-2 cursor-pointer hover:text-red-500 transition"
                  >
                    {video.title}
                  </h2>

                  {video.description && (
                    <p className="text-sm text-white/70 leading-relaxed mb-4 line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setPlaying(video)}
                      className="flex items-center gap-2 bg-white text-black font-bold px-5 py-2 rounded text-sm hover:bg-white/80 transition"
                    >
                      <Play size={16} fill="black" /> Play
                    </button>
                    <button
                      onClick={() => setSelected(video)}
                      className="flex items-center gap-2 bg-white/10 text-white font-semibold px-5 py-2 rounded text-sm hover:bg-white/20 transition"
                    >
                      <Info size={16} /> More Info
                    </button>
                    <div className="ml-auto flex items-center gap-3">
                      <LikeButton videoId={video.id} size={20} />
                    </div>
                    <div className="ml-4">
                      <SaveButton videoId={video.id} size={28} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-white/50 mt-3">
                    <ViewCount videoId={video.id} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <MobileBottomNav />

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-4xl mx-auto my-8 bg-[#141418] rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[50vh] w-full">
              <img
                src={selected.backdropUrl || selected.posterUrl}
                alt={selected.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141418] via-[#141418]/40 to-transparent" />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 rounded-full p-2"
              >
                <X size={20} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h2 className="text-3xl md:text-5xl font-black mb-6 drop-shadow-lg">
                  {selected.title}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPlaying(selected);
                      setSelected(null);
                    }}
                    className="flex items-center gap-2 bg-white text-black font-bold px-8 py-3 rounded hover:bg-white/80 transition"
                  >
                    <Play size={20} fill="black" /> Play
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur text-white font-semibold px-6 py-3 rounded hover:bg-white/30 transition"
                  >
                    <X size={20} /> Close
                  </button>
                </div>
              </div>
            </div>
            <div className="p-8">
              {selected.description && (
                <p className="text-white/90 leading-relaxed">{selected.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Players */}
      {playing && playing.bitchuteUrl.includes("bitchute.com") && (
        <BitChutePlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
      {playing && !playing.bitchuteUrl.includes("bitchute.com") && (
        <VideoPlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          videoId={playing.id}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
  );
}
