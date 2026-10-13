"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Play, Info, X, ChevronLeft, ChevronRight } from "lucide-react";
import TopBar from "@/components/TopBar";
import FollowButton from "@/components/FollowButton";
import ViewCount from "@/components/ViewCount";
import BitChutePlayer from "@/components/BitChutePlayer";
import VideoPlayer from "@/components/VideoPlayer";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  bitchuteUrl: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  creatorId?: number | null
  createdAt?: string;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  heroBackdropUrl?: string;
  description: string;
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

export default function PodcasterProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json())
      .then((all: Creator[]) => {
        const found = all.find((c) => c.slug === slug);
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCreator(found);
        fetch(`/api/follow-count?creator_id=${found.id}`)
          .then((r) => r.json())
          .then((d) => setFollowerCount(d.count ?? 0))
          .catch(() => {});
        return fetch("/api/videos")
          .then((r) => r.json())
          .then((allVideos: Video[]) => {
            setVideos(allVideos.filter((v) => v.creatorId === found.id));
            setLoading(false);
          });
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </main>
    );
  }

  if (notFound || !creator) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">Podcaster not found.</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">← All Podcasters</Link>
        </div>
      </main>
    );
  }

  const heroVideo = videos[0];

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      <TopBar />

      {/* Hero */}
      <section className="relative w-full overflow-hidden pt-16">
        <div className="relative h-[52vh] md:h-[58vh] w-full">
          {/* Background layer — hero backdrop, blurred */}
          {creator.heroBackdropUrl ? (
            <img
              src={creator.heroBackdropUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-black to-black" />
          )}

          {/* Dark overlay so text is readable */}
          {/* Vertical fade — darkens bottom for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          {/* Horizontal fade — darkens left for text */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
          {/* Subtle blue tint layered on top */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10, 30, 60, 0.12) 0%, rgba(5, 20, 50, 0.2) 50%, rgba(0, 0, 0, 0) 100%)",
            }}
          />

          {/* Left-aligned content */}
          <div className="relative z-10 flex flex-col items-start justify-end h-full px-6 md:px-12 pb-12 text-left max-w-3xl">
            {creator.photoUrl ? (
              <img
                src={creator.photoUrl}
                alt={creator.name}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-2xl mb-6"
              />
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-5xl font-black border-4 border-white shadow-2xl mb-6">
                {creator.name[0]?.toUpperCase() || "?"}
              </div>
            )}

            <p className="text-xs tracking-[0.4em] text-red-500 font-bold mb-2">
              PODCASTER
            </p>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-4 drop-shadow-lg">
              {creator.name}
            </h1>
            {creator.description && (
              <p className="text-base md:text-lg text-white/85 max-w-2xl leading-relaxed mb-4">
                {creator.description}
              </p>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              <FollowButton creatorId={creator.id} />
              {followerCount !== null && (
                <span className="text-sm text-white/60">
                  {followerCount === 0
                    ? "No followers yet"
                    : `${followerCount.toLocaleString()} ${followerCount === 1 ? "follower" : "followers"}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Videos */}
      <div className="relative z-10 pt-10 pb-24 space-y-8">
        {videos.length === 0 && (
          <p className="px-12 text-white/40">No videos yet.</p>
        )}
        {videos.length > 0 && (
          <VideoList
            title="All Videos"
            items={videos}
            creatorSlug={slug}
          />
        )}
      </div>

      {/* Player — plays the video inline, no new tab */}
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
              <div className="absolute bottom-0 left-0 right-0 p-10">
                <h2 className="text-4xl font-black mb-6">{selected.title}</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setPlaying(selected);
                      setSelected(null);
                    }}
                    className="flex items-center gap-3 bg-white text-black font-bold px-8 py-3 rounded text-lg hover:bg-white/90 transition"
                  >
                    <Play size={22} fill="black" /> Play
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="flex items-center gap-3 bg-white/20 backdrop-blur text-white font-bold px-8 py-3 rounded text-lg"
                  >
                    <X size={22} /> Close
                  </button>
                </div>
              </div>
            </div>
            <div className="p-10">
              {selected.description && (
                <p className="text-lg text-white/90 leading-relaxed">{selected.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function VideoList({
  title,
  items,
  creatorSlug,
}: {
  title: string;
  items: Video[];
  creatorSlug: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="px-4 md:px-12">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/podcaster/${creatorSlug}/${item.id}`}
            className="flex gap-3 md:gap-4 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition group"
          >
            {/* Thumbnail */}
            <div className="relative w-[140px] md:w-[180px] aspect-video rounded-md overflow-hidden flex-shrink-0 bg-[#141418]">
              <img
                src={item.posterUrl || item.backdropUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 py-1">
              <h3 className="text-sm md:text-base font-semibold leading-snug line-clamp-2 mb-2">
                {item.title}
              </h3>
              <div className="flex items-center gap-2 text-xs md:text-sm text-white/50">
                <ViewCount videoId={item.id} />
                <span>·</span>
                <span>{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
