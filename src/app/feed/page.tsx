"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, MessageCircle } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import SaveButton from "@/components/SaveButton";
import FollowButton from "@/components/FollowButton";
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
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return new Date(iso).toLocaleDateString();
}


function CommentCount({ videoId }: { videoId: number }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch(`/api/comments?video_id=${videoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        const list = Array.isArray(d) ? d : Array.isArray(d.comments) ? d.comments : [];
        setCount(list.length);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [videoId]);

  return (
    <span className="inline-flex items-center gap-1.5 text-white/70">
      <MessageCircle size={18} />
      {count !== null && <span className="text-sm">{count}</span>}
    </span>
  );
}

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

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

  const creatorById = (id?: number | null) =>
    id ? creators.find((c) => c.id === id) || null : null;

  const playing = playingIndex !== null ? videos[playingIndex] : null;

  const next = () => {
    if (playingIndex === null) return;
    if (playingIndex < videos.length - 1) setPlayingIndex(playingIndex + 1);
  };
  const prev = () => {
    if (playingIndex === null) return;
    if (playingIndex > 0) setPlayingIndex(playingIndex - 1);
  };

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-3 md:px-0">
        <h1 className="text-2xl md:text-3xl font-black mb-4 px-2">Feed</h1>

        {loading && (
          <p className="text-white/50 text-center py-12">Loading…</p>
        )}
        {!loading && videos.length === 0 && (
          <p className="text-white/50 text-center py-12">Nothing here yet.</p>
        )}

        <div className="space-y-3 md:space-y-5">
          {videos.map((video, i) => {
            const creator = creatorById(video.creatorId);
            const name = creator?.name || "TROOFLIX";
            const slug = creator?.slug;
            const handle = slug ? `@${slug.replace(/-/g, "")}` : "@trooflix";

            return (
              <article
                key={video.id}
                className="bg-[#0d0d10] md:bg-transparent border border-white/5 md:border-0 md:border-b md:border-white/10 md:rounded-none rounded-xl overflow-hidden"
              >
                {/* Author row (top) */}
                <div className="flex items-center gap-3 p-3 md:px-2 md:py-3">
                  {creator?.photoUrl ? (
                    <img
                      src={creator.photoUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold flex-shrink-0">
                      {name[0]?.toUpperCase() || "T"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {slug ? (
                      <Link
                        href={`/podcaster/${slug}`}
                        className="font-semibold text-[15px] hover:underline block truncate"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[15px] block truncate">{name}</span>
                    )}
                    <p className="text-xs text-white/50 truncate">
                      {handle} · {timeAgo(video.createdAt)}
                    </p>
                  </div>
                  {creator && <FollowButton creatorId={creator.id} />}
                </div>

                {/* Video card */}
                <button
                  onClick={() => setPlayingIndex(i)}
                  className="relative block w-full bg-black group"
                  aria-label="Play"
                >
                  <div className="relative w-full aspect-video md:aspect-video overflow-hidden md:rounded-xl">
                    <img
                      src={video.backdropUrl || video.posterUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:bg-white/30 transition">
                        <Play size={28} fill="white" className="text-white ml-1" />
                      </div>
                    </div>
                  </div>
                </button>

                {/* Title + description */}
                <div className="px-3 md:px-2 py-3">
                  <h2 className="font-semibold text-[15px] leading-snug mb-1">
                    {video.title}
                  </h2>
                  {video.description && (
                    <p className="text-sm text-white/60 leading-snug line-clamp-3">
                      {video.description}
                    </p>
                  )}
                </div>

                {/* Action rail (X-style: reply · like · bookmark · views) */}
                <div className="flex items-center gap-6 px-3 md:px-2 pb-3 md:pb-4 pt-1">
                  <LikeButton videoId={video.id} size={18} showCount />
                  <CommentCount videoId={video.id} />
                  <SaveButton videoId={video.id} variant="icon" />
                  <ViewCount videoId={video.id} showIcon />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <MobileBottomNav />

      {/* Fullscreen player with swipe/arrow navigation */}
      {playing && playing.bitchuteUrl.includes("bitchute.com") && (
        <BitChutePlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          onClose={() => setPlayingIndex(null)}
        />
      )}
      {playing && playing.bitchuteUrl.includes("odysee.com") && (
        <OdyseePlayer
          src={playing.bitchuteUrl}
          title={playing.title}
          onClose={() => setPlayingIndex(null)}
        />
      )}
      {playing &&
        !playing.bitchuteUrl.includes("bitchute.com") &&
        !playing.bitchuteUrl.includes("odysee.com") && (
          <VideoPlayer
            src={playing.bitchuteUrl}
            title={playing.title}
            videoId={playing.id}
            onClose={() => setPlayingIndex(null)}
            onPrev={playingIndex !== null && playingIndex > 0 ? prev : undefined}
            onNext={
              playingIndex !== null && playingIndex < videos.length - 1 ? next : undefined
            }
          />
        )}
    </main>
  );
}
