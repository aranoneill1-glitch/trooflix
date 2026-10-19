"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Play, ChevronLeft, Eye, Calendar } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FollowButton from "@/components/FollowButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import VideoPlayer from "@/components/VideoPlayer";
import { getCachedVideos, getCachedCreators } from "@/lib/cache";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  textOverlays?: any[];
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  match: number;
  creatorId?: number | null;
  createdAt?: string;
  viewCount?: number;
};

type Creator = {
  id: number | string;
  name: string;
  slug: string;
  photoUrl: string;
  heroBackdropUrl?: string;
  description: string;
  isVerified?: boolean;
  ownerUserId?: string;
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

type SortMode = "newest" | "oldest" | "views";

export default function PodcasterProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [otherCreators, setOtherCreators] = useState<Creator[]>([]);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("newest");

  useEffect(() => {
    Promise.all([getCachedCreators(), getCachedVideos()])
      .then(([allCreators, allVideos]) => {
        const list: Creator[] = Array.isArray(allCreators) ? allCreators : [];
        const found = list.find((c) => c.slug === slug || String(c.id) === slug || String(c.id) === slug.replace(/^[^-]*-/, ""));
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCreator(found);
        setOtherCreators(list.filter((c) => String(c.id) !== String(found.id)).slice(0, 6));

        // Fetch their videos
        fetch(`/api/creators/videos?creatorId=${found.id}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => {
            const vids = Array.isArray(d.videos) ? d.videos : [];
            setVideos(vids);
          })
          .catch(() => setVideos([]));

        // Fetch follower count
        fetch(`/api/follow-count?creator_id=${found.id}`)
          .then((r) => r.json())
          .then((d) => setFollowerCount(d.count ?? 0))
          .catch(() => setFollowerCount(0));

        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  const sortedVideos = useMemo(() => {
    const copy = [...videos];
    if (sort === "newest") {
      copy.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return bt - at;
      });
    } else if (sort === "oldest") {
      copy.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return at - bt;
      });
    } else if (sort === "views") {
      copy.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    }
    return copy;
  }, [videos, sort]);

  const latest = sortedVideos[0] || null;
  const rest = sortedVideos.slice(1);

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white">
        <TopBar />
        <div className="pt-32 text-center">
          <p className="text-white/50 mb-4">Podcaster not found</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">
            ← Back to Podcasts
          </Link>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      {loading ? (
        <div className="h-screen flex items-center justify-center">
          <p className="text-white/50">Loading…</p>
        </div>
      ) : (
        <>
          {/* ============ HERO ============ */}
          <section className="relative w-full h-[45vh] md:h-[65vh] overflow-hidden">
            {creator?.heroBackdropUrl || latest?.backdropUrl ? (
              <img
                src={creator?.heroBackdropUrl || latest?.backdropUrl || ""}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/30 via-black to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

            <div className="absolute top-4 left-4 md:top-24 md:left-8 z-10">
              <Link
                href="/podcasts"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-xs text-white/80 hover:text-white transition"
              >
                <ChevronLeft size={14} /> Back
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 pb-8 md:pb-12">
              <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
                {/* Avatar */}
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-black flex-shrink-0 bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center">
                  {creator?.photoUrl ? (
                    <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-white">
                      {creator?.name?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs tracking-[0.3em] text-yellow-500 font-bold mb-2">
                    PODCASTER
                  </p>
                  <h1 className="text-3xl md:text-6xl font-black leading-tight mb-2 inline-flex items-center gap-2">
                    {creator?.name || ""}
                    {creator?.isVerified && <VerifiedBadge size={28} variant="gold" />}
                  </h1>
                  {creator?.description && (
                    <p className="text-sm md:text-base text-white/80 max-w-2xl mb-4 line-clamp-2">
                      {creator.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs md:text-sm text-white/60 mb-4">
                    <span>{videos.length} episode{videos.length !== 1 ? "s" : ""}</span>
                    {followerCount !== null && (
                      <span>{followerCount.toLocaleString()} followers</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {latest && (
                      <button
                        onClick={() => setPlaying(latest)}
                        className="flex items-center gap-2 bg-white text-black font-bold px-5 md:px-7 py-2.5 md:py-3 rounded-full hover:bg-white/90 transition"
                      >
                        <Play size={18} fill="black" /> Play Latest
                      </button>
                    )}
                    <FollowButton creatorId={creator?.id as number} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ LATEST EPISODE ============ */}
          {latest && (
            <section className="px-4 md:px-12 pt-8 md:pt-12">
              <p className="text-xs tracking-[0.3em] text-yellow-500 font-bold mb-3">
                NEW EPISODE
              </p>
              <div
                className="relative bg-[#0f0f12] border border-white/10 rounded-2xl overflow-hidden flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 cursor-pointer hover:border-yellow-600/40 transition"
                onClick={() => setPlaying(latest)}
              >
                <div className="w-full md:w-56 aspect-[4/5] md:aspect-auto md:h-64 rounded-xl overflow-hidden flex-shrink-0">
                  {latest.posterUrl ? (
                    <img src={latest.posterUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-900/40 to-black flex items-center justify-center">
                      <Play size={40} className="text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-xs text-white/40 mb-2">
                    {timeAgo(latest.createdAt)}
                  </p>
                  <h3 className="text-xl md:text-3xl font-black mb-2 line-clamp-2">
                    {latest.title}
                  </h3>
                  {latest.description && (
                    <p className="text-sm md:text-base text-white/70 mb-4 line-clamp-3">
                      {latest.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} />
                      {(latest.viewCount || 0).toLocaleString()} views
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ============ EPISODES GRID ============ */}
          {rest.length > 0 && (
            <section className="px-4 md:px-12 pt-8 md:pt-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-black">All Episodes</h2>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="bg-[#0f0f12] border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-yellow-600"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="views">Most Viewed</option>
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {rest.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setPlaying(v)}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-[#141418] mb-2">
                      {v.posterUrl ? (
                        <img
                          src={v.posterUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={24} className="text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Play size={20} fill="black" className="text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold line-clamp-2 mb-1">{v.title}</p>
                    <p className="text-xs text-white/50">{timeAgo(v.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============ ABOUT ============ */}
          {creator?.description && (
            <section className="px-4 md:px-12 pt-8 md:pt-12">
              <h2 className="text-xl md:text-2xl font-black mb-3">About</h2>
              <div className="bg-[#0f0f12] border border-white/10 rounded-2xl p-4 md:p-6 max-w-3xl">
                <p className="text-sm md:text-base text-white/80 whitespace-pre-wrap">
                  {creator.description}
                </p>
              </div>
            </section>
          )}

          {/* ============ RELATED PODCASTERS ============ */}
          {otherCreators.length > 0 && (
            <section className="px-4 md:px-12 pt-8 md:pt-12">
              <h2 className="text-xl md:text-2xl font-black mb-4">More Podcasters</h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {otherCreators.map((c) => (
                  <Link
                    key={c.id}
                    href={`/podcaster/${c.slug}`}
                    className="flex-shrink-0 w-32 md:w-40 group"
                  >
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-yellow-600 transition mb-3">
                      {c.photoUrl ? (
                        <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center text-3xl font-black">
                          {c.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-center inline-flex items-center justify-center gap-1 w-full">
                      <span className="truncate">{c.name}</span>
                      {c.isVerified && <VerifiedBadge size={12} variant="gold" />}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="h-16" />
        </>
      )}

      <MobileBottomNav />

      {playing && (
        <VideoPlayer
          src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
          title={playing.title}
          videoId={playing.id}
          textOverlays={playing.textOverlays}
          onClose={() => setPlaying(null)}
        />
      )}
    </main>
  );
}
