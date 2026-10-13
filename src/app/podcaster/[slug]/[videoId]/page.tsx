"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Plus } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import BitChutePlayer from "@/components/BitChutePlayer";
import VideoPlayer from "@/components/VideoPlayer";
import LikeButton from "@/components/LikeButton";
import ViewCount from "@/components/ViewCount";
import SaveButton from "@/components/SaveButton";

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
  creatorId?: number | null;
  createdAt?: string;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
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

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const videoId = Number(params.videoId);

  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [otherVideos, setOtherVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos").then((r) => r.json()),
      fetch("/api/creators").then((r) => r.json()),
    ])
      .then(([vids, creats]) => {
        const allVideos: Video[] = Array.isArray(vids) ? vids : [];
        const allCreators: Creator[] = Array.isArray(creats) ? creats : [];

        const found = allVideos.find((v) => v.id === videoId);
        const foundCreator = allCreators.find((c) => c.slug === slug);

        if (!found || !foundCreator) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setVideo(found);
        setCreator(foundCreator);
        setOtherVideos(
          allVideos
            .filter((v) => v.creatorId === foundCreator.id && v.id !== videoId)
            .slice(0, 8)
        );
        setLoading(false);
        setPlaying(true); // auto-play
      })
      .catch(() => setLoading(false));
  }, [slug, videoId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </main>
    );
  }

  if (notFound || !video || !creator) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/70 mb-4">Video not found.</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">
            ← Back to Podcasts
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-5xl mx-auto px-4 md:px-6">
        {/* Back button */}
        <button
          onClick={() => router.push(`/podcaster/${slug}`)}
          className="flex items-center gap-2 text-white/70 hover:text-white transition mb-4 text-sm"
        >
          <ArrowLeft size={18} /> Back to {creator.name}
        </button>

        {/* Video player */}
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
          {playing && video.bitchuteUrl.includes("bitchute.com") ? (
            <BitChutePlayer
              src={video.bitchuteUrl}
              title={video.title}
              onClose={() => setPlaying(false)}
            />
          ) : playing ? (
            <VideoPlayer
              src={video.bitchuteUrl}
              title={video.title}
              videoId={video.id}
              onClose={() => setPlaying(false)}
            />
          ) : (
            <div
              className="relative w-full h-full cursor-pointer group"
              onClick={() => setPlaying(true)}
            >
              <img
                src={video.backdropUrl || video.posterUrl}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition">
                <div className="bg-white/20 backdrop-blur rounded-full p-5">
                  <Play size={48} fill="white" className="text-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title + metadata */}
        <div className="mt-6">
          <h1 className="text-xl md:text-3xl font-bold leading-tight mb-3">
            {video.title}
          </h1>

          {/* Creator line */}
          <div className="flex items-center gap-3 mb-4">
            {creator.photoUrl && (
              <img
                src={creator.photoUrl}
                alt={creator.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            )}
            <Link
              href={`/podcaster/${slug}`}
              className="font-semibold hover:text-red-500 transition"
            >
              {creator.name}
            </Link>
            <span className="text-white/40">·</span>
            <span className="text-white/60 text-sm">
              {timeAgo(video.createdAt)}
            </span>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-4 flex-wrap py-4 border-y border-white/10">
            <LikeButton videoId={video.id} size={22} />
            <ViewCount videoId={video.id} showIcon />
            <div className="ml-auto flex items-center gap-4">
              <SaveButton videoId={video.id} variant="labeled" />
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <div className="mt-6 p-4 bg-white/5 rounded-lg">
              <p className="text-sm md:text-base text-white/80 leading-relaxed whitespace-pre-wrap">
                {video.description}
              </p>
            </div>
          )}
        </div>

        {/* More from this podcaster */}
        {otherVideos.length > 0 && (
          <div className="mt-12 mb-8">
            <h2 className="text-lg md:text-xl font-bold mb-4">
              More from {creator.name}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {otherVideos.map((v) => (
                <Link
                  key={v.id}
                  href={`/podcaster/${slug}/${v.id}`}
                  className="group"
                >
                  <div className="relative aspect-video rounded-md overflow-hidden bg-[#141418] mb-2">
                    <img
                      src={v.posterUrl || v.backdropUrl}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                      <Play size={24} fill="white" className="text-white" />
                    </div>
                  </div>
                  <p className="text-xs md:text-sm font-semibold leading-snug line-clamp-2">
                    {v.title}
                  </p>
                  <div className="text-[11px] text-white/50 mt-1">
                    <ViewCount videoId={v.id} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
