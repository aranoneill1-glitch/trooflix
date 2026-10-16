"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, X } from "lucide-react";
import SaveButton from "@/components/SaveButton";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VideoPlayer from "@/components/VideoPlayer";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { getCachedVideos, getCachedCreators } from "@/lib/cache";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  creatorId?: number | null;
};

export default function MyListPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const user = await getCachedUser();
      setSignedIn(!!user);

      if (!user) {
        setLoading(false);
        return;
      }

      const [idsRes, vidsRes] = await Promise.all([
        fetch(`/api/my-list?user_id=${user.id}`).then((r) => r.json()),
        getCachedVideos(),
      ]);

      const ids: number[] = Array.isArray(idsRes.ids) ? idsRes.ids : [];
      const allVideos: Video[] = Array.isArray(vidsRes) ? vidsRes : [];

      setSavedIds(ids);
      setVideos(allVideos.filter((v) => ids.includes(v.id)));
      setLoading(false);
    };

    load();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20 lg:pb-0">
      <TopBar />

      <div className="pt-24 pb-16 max-w-6xl mx-auto px-4 md:px-8">
        <h1 className="text-3xl md:text-4xl font-black mb-1">My List</h1>
        <p className="text-white/50 mb-8">
          {signedIn
            ? `${videos.length} saved video${videos.length === 1 ? "" : "s"}`
            : "Sign in to see your list"}
        </p>

        {loading && <p className="text-white/50 py-8">Loading…</p>}

        {!loading && !signedIn && (
          <div className="text-center py-16">
            <p className="text-white/70 mb-6 text-lg">
              Sign in to save videos and access them anywhere.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/login"
                className="bg-red-600 hover:bg-red-500 font-semibold px-6 py-3 rounded transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-white/10 hover:bg-white/20 font-semibold px-6 py-3 rounded transition"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {!loading && signedIn && videos.length === 0 && (
          <div className="text-center py-16">
            <p className="text-white/70 mb-4 text-lg">Your list is empty.</p>
            <p className="text-white/50 mb-8 text-sm">
              Tap the + button on any video to add it here.
            </p>
            <Link
              href="/feed"
              className="bg-white text-black font-bold px-6 py-3 rounded transition hover:bg-white/80"
            >
              Browse the Feed
            </Link>
          </div>
        )}

        {!loading && signedIn && videos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer bg-[#141418] hover:scale-105 transition group"
              >
                <div
                  onClick={() => setSelected(video)}
                  className="absolute inset-0"
                >
                  <img
                    src={video.posterUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-white/20 backdrop-blur rounded-full p-4">
                      <Play size={28} fill="white" className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute top-2 right-2 z-10">
                  <SaveButton videoId={video.id} size={22} />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none">
                  <p className="text-xs md:text-sm font-bold leading-tight line-clamp-2">
                    {video.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
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
      {playing && (
        <VideoPlayer
          src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
          title={playing.title}
          videoId={playing.id}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
  );
}