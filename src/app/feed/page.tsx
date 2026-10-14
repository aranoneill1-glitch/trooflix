"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Heart, Bookmark, Volume2, VolumeX } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import SaveButton from "@/components/SaveButton";
import LikeButton from "@/components/LikeButton";
import ViewCount from "@/components/ViewCount";
import BitChutePlayer from "@/components/BitChutePlayer";
import VideoPlayer from "@/components/VideoPlayer";
import OdyseePlayer from "@/components/OdyseePlayer";

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
  photoUrl?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
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
  const [playing, setPlaying] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos").then((r) => r.json()),
      fetch("/api/creators").then((r) => r.json()),
    ])
      .then(([vids, creats]) => {
        const list: Video[] = Array.isArray(vids) ? vids : [];
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

  // Track which card is centered as user scrolls
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.clientHeight;
      const idx = Math.round(el.scrollTop / h);
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const creatorById = (id?: number | null) =>
    id ? creators.find((c) => c.id === id) || null : null;

  return (
    <main className="h-screen bg-black text-white overflow-hidden flex flex-col">
      <TopBar />

      {/* Vertical snap scroller */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/50">Loading…</p>
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/50">Nothing here yet.</p>
          </div>
        )}

        {videos.map((video, i) => {
          const creator = creatorById(video.creatorId);
          const creatorName = creator ? creator.name : "TROOFLIX";
          const creatorSlug = creator?.slug;
          const isActive = i === activeIndex;

          return (
            <section
              key={video.id}
              className="relative w-full h-full snap-start snap-always flex items-center justify-center"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Poster/backdrop background */}
              <img
                src={video.backdropUrl || video.posterUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

              {/* Top overlay: creator + follow */}
              <div className="absolute top-20 md:top-24 left-0 right-0 px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {creator?.photoUrl ? (
                    <img
                      src={creator.photoUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold">
                      {creatorName[0]?.toUpperCase() || "T"}
                    </div>
                  )}
                  <div>
                    {creatorSlug ? (
                      <Link
                        href={`/podcaster/${creatorSlug}`}
                        className="font-semibold text-sm hover:underline"
                      >
                        {creatorName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-sm">{creatorName}</span>
                    )}
                    <p className="text-[11px] text-white/60">{timeAgo(video.createdAt)}</p>
                  </div>
                </div>

                {/* Mute toggle (visual only for now) */}
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>

              {/* Play button */}
              <button
                onClick={() => setPlaying(video)}
                className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center hover:bg-white/25 transition"
                aria-label="Play"
              >
                <Play size={32} fill="white" className="text-white" />
              </button>

              {/* Bottom info */}
              <div className="absolute left-0 right-0 bottom-24 md:bottom-10 px-4 md:px-6 flex items-end justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold leading-tight mb-1 line-clamp-2">
                    {video.title}
                  </h2>
                  {video.description && (
                    <p className="text-sm text-white/70 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
                    <ViewCount videoId={video.id} showIcon />
                    <span className="text-white/20">·</span>
                    <LikeButton videoId={video.id} size={14} showCount />
                    {video.category && (
                      <>
                        <span className="text-white/20">·</span>
                        <span>{video.category}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right action rail */}
                <div className="flex flex-col items-center gap-4 flex-shrink-0">
                  <LikeButton videoId={video.id} size={26} />
                  <SaveButton videoId={video.id} variant="icon" />
                  <button
                    onClick={() => setPlaying(video)}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                    aria-label="Play"
                  >
                    <Play size={20} fill="white" className="text-white" />
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <MobileBottomNav />

      {/* Fullscreen player */}
      {playing && playing.bitchuteUrl.includes("bitchute.com") && (
        <BitChutePlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
      {playing && playing.bitchuteUrl.includes("odysee.com") && (
        <OdyseePlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
      {playing &&
        !playing.bitchuteUrl.includes("bitchute.com") &&
        !playing.bitchuteUrl.includes("odysee.com") && (
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
