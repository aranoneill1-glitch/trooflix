"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Play, Eye, Bell , Search} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FollowButton from "@/components/FollowButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedCreators } from "@/lib/cache";

type Video = {
  id: number;
  title: string;
  description: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  textOverlays?: any[];
  posterUrl: string;
  backdropUrl: string;
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
};

type Tab = "home" | "podcasts" | "documentaries" | "videos";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PodcasterProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getCachedCreators()
      .then((all) => {
        const list: Creator[] = Array.isArray(all) ? all : [];
        const found = list.find((c) => c.slug === slug || String(c.id) === slug);
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setCreator(found);

        // Fetch their videos
        fetch(`/api/creators/videos?creatorId=${found.id}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => setVideos(Array.isArray(d.videos) ? d.videos : []))
          .catch(() => setVideos([]));

        // Follower count
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

  // Apply search filter first
  const searched = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.toLowerCase();
    return videos.filter(
      (v) =>
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
    );
  }, [videos, searchQuery]);

  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    });
  }, [searched]);

  const podcasts = useMemo(
    () => sorted.filter((v) => v.type === "Podcast"),
    [sorted]
  );
  const documentaries = useMemo(
    () => sorted.filter((v) => v.type === "Documentary"),
    [sorted]
  );
  const videoPosts = useMemo(
    () => sorted.filter((v) => v.type !== "Podcast" && v.type !== "Documentary"),
    [sorted]
  );

  const latest = sorted[0];
  const rest = sorted.slice(1);

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

  const bannerUrl = creator?.heroBackdropUrl || latest?.backdropUrl || "";

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      {loading ? (
        <div className="h-screen flex items-center justify-center">
          <p className="text-white/50">Loading…</p>
        </div>
      ) : (
        <>
          {/* Banner */}
          <div className="relative w-full h-[20vh] md:h-[30vh] overflow-hidden mt-16 md:mt-20">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-yellow-900/30 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          {/* Header row — avatar + name */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 md:-mt-16 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end md:gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-black bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center flex-shrink-0">
                {creator?.photoUrl ? (
                  <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl md:text-6xl font-black">
                    {creator?.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 md:pb-2 mt-3 md:mt-0">
                <h1 className="text-2xl md:text-4xl font-black inline-flex items-center gap-2 mb-1">
                  {creator?.name}
                  {creator?.isVerified && <VerifiedBadge size={24} variant="gold" />}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/60 mb-2">
                  <span className="text-white/80">@{creator?.slug}</span>
                  <span>·</span>
                  <span>{followerCount !== null ? followerCount.toLocaleString() : "—"} subscribers</span>
                  <span>·</span>
                  <span>{videos.length} {videos.length === 1 ? "episode" : "episodes"}</span>
                </div>

                {creator?.description && (
                  <p className={`text-sm text-white/80 max-w-2xl ${bioExpanded ? "" : "line-clamp-2"}`}>
                    {creator.description}
                  </p>
                )}
                {creator?.description && creator.description.length > 100 && (
                  <button
                    onClick={() => setBioExpanded((v) => !v)}
                    className="text-xs text-white/60 hover:text-white mt-1 transition"
                  >
                    {bioExpanded ? "Show less" : "...more"}
                  </button>
                )}

                <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                  <FollowButton creatorId={creator?.id as number} />
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search this podcaster..."
                      className="w-full bg-white/10 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:border-white/30 placeholder:text-white/40 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mt-6 md:mt-8 gap-6">
              {(["home", "podcasts", "documentaries", "videos"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 text-sm font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
                    tab === t
                      ? "border-white text-white"
                      : "border-transparent text-white/50 hover:text-white/80"
                  }`}
                >
                  {t === "home" ? "Home" : t === "podcasts" ? "Podcasts" : t === "documentaries" ? "Documentaries" : "Videos"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
                        {tab === "home" && (
              <div className="space-y-10">
                {/* 1. Latest Drop */}
                {latest && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Latest Drop
                    </h2>
                    <div
                      className="flex flex-col md:flex-row gap-4 md:gap-6 cursor-pointer group bg-[#0f0f12] rounded-xl p-3 border border-white/5 hover:border-white/10 transition"
                      onClick={() => router.push(`/podcast/${latest.id}`)}
                    >
                      <div className="w-full md:w-80 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                        {latest.posterUrl ? (
                          <img src={latest.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Play size={40} className="text-white/30" /></div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Play size={24} fill="black" className="text-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-2">
                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">{latest.type}</p>
                        <h3 className="text-lg md:text-2xl font-black mb-2 line-clamp-2 group-hover:text-red-500 transition">{latest.title}</h3>
                        <div className="text-xs text-white/50 mb-3">
                          {(latest.viewCount || 0).toLocaleString()} views · {timeAgo(latest.createdAt)}
                        </div>
                        {latest.description && (
                          <p className="text-sm text-white/70 whitespace-pre-wrap line-clamp-3">{latest.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Recent Podcasts Row */}
                {podcasts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold">Recent Podcasts</h2>
                       <button onClick={() => setTab("podcasts")} className="text-xs font-semibold text-white/50 hover:text-white transition">View all</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {podcasts.slice(0, 4).map(v => (
                         <div key={v.id} onClick={() => router.push(`/podcast/${v.id}`)} className="cursor-pointer group">
                           <div className="aspect-video rounded-lg overflow-hidden bg-black mb-2 relative">
                             <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <Play size={16} fill="black" className="text-black ml-0.5" />
                                </div>
                             </div>
                           </div>
                           <p className="text-sm font-semibold line-clamp-1">{v.title}</p>
                         </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Recent Documentaries Row */}
                {documentaries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl font-bold">Recent Documentaries</h2>
                       <button onClick={() => setTab("documentaries")} className="text-xs font-semibold text-white/50 hover:text-white transition">View all</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {documentaries.slice(0, 4).map(v => (
                         <div key={v.id} onClick={() => router.push(`/podcast/${v.id}`)} className="cursor-pointer group">
                           <div className="aspect-video rounded-lg overflow-hidden bg-black mb-2 relative">
                             <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <Play size={16} fill="black" className="text-black ml-0.5" />
                                </div>
                             </div>
                           </div>
                           <p className="text-sm font-semibold line-clamp-1">{v.title}</p>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {!latest && podcasts.length === 0 && documentaries.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-white/50">No content published yet.</p>
                  </div>
                )}
              </div>
            )}

{tab === "podcasts" && (
              <>
                {podcasts.length === 0 ? (
                  <div className="text-center py-16">
                    <Play size={40} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60">No podcasts published yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {podcasts.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => router.push(`/podcast/${v.id}`)}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-video rounded-xl overflow-hidden bg-black mb-2 relative">
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
                        <p className="text-xs text-white/50">
                          {(v.viewCount || 0).toLocaleString()} views · {timeAgo(v.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "documentaries" && (
              <>
                {documentaries.length === 0 ? (
                  <div className="text-center py-16">
                    <Play size={40} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60">No documentaries published yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documentaries.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => router.push(`/podcast/${v.id}`)}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-video rounded-xl overflow-hidden bg-black mb-2 relative">
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
                        <p className="text-xs text-white/50">
                          {(v.viewCount || 0).toLocaleString()} views · {timeAgo(v.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "videos" && (
              <>
                {videoPosts.length === 0 ? (
                  <div className="text-center py-16">
                    <Play size={40} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60">No videos published yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videoPosts.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => router.push(`/podcast/${v.id}`)}
                        className="cursor-pointer group"
                      >
                        <div className="aspect-video rounded-xl overflow-hidden bg-black mb-2 relative">
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
                        <p className="text-xs text-white/50">
                          {(v.viewCount || 0).toLocaleString()} views · {timeAgo(v.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="h-16" />
        </>
      )}

      <MobileBottomNav />
    </main>
  );
}
