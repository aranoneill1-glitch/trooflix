"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ChevronLeft, Pencil, Grid3x3, List, Play, Eye, ShoppingBag, Settings } from "lucide-react";
import ProfileReelViewer from "@/components/ProfileReelViewer";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import UserFollowButton from "@/components/UserFollowButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

type User = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified?: boolean;
  tier?: string;
};

type Post = {
  id: number;
  title?: string;
  posterUrl?: string;
  backdropUrl?: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  type?: string;
  creatorId?: number | null;
  viewCount?: number;
  access_type?: string;
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handle = decodeURIComponent(params.handle as string);

  const [user, setUser] = useState<User | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "premium" | "shop">("reels");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [uploadsView, setUploadsView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then((user) => {
      setMeId(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!handle) return;

    const looksLikeUuid = /^[0-9a-f]{8}-/.test(handle);
    const fetcher = looksLikeUuid
      ? fetch(`/api/users?id=${handle}`)
      : fetch(`/api/users?q=${encodeURIComponent(handle.replace(/^@/, ""))}`);

    fetcher
      .then((r) => r.json())
      .then(async (d) => {
        let found: User | null = null;
        if (looksLikeUuid && d.user) {
          found = d.user;
        } else if (Array.isArray(d.users)) {
          const clean = handle.replace(/^@/, "").toLowerCase();
          found = d.users.find((u: User) => (u.username || "").toLowerCase() === clean) || d.users[0] || null;
        }
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setUser(found);

        const pRes = await fetch(`/api/profile?user_id=${found.user_id}`).then((r) => r.json());
        const isPod = pRes.profile?.tier === "podcaster";
        setIsCreator(isPod);

        let combinedPosts: Post[] = [];
        try {
          const pr = await fetch(`/api/user/posts?userId=${found.user_id}`);
          const pd = await pr.json();
          combinedPosts = pd.posts || [];
        } catch {}

        if (isPod) {
          try {
            const cr = await fetch(`/api/me/creator?user_id=${found.user_id}`).then((r) => r.json());
            if (cr.creator?.id) {
              const vr = await fetch(`/api/creators/videos?creatorId=${cr.creator.id}`);
              const vd = await vr.json();
              if (vd.videos) {
                const existingIds = new Set(combinedPosts.map(p => p.id));
                const newVids = vd.videos.filter((v: any) => !existingIds.has(v.id));
                combinedPosts = [...combinedPosts, ...newVids];
              }
              // Fetch products for shop
              const prRes = await fetch(`/api/creator/products?creatorId=${cr.creator.id}`);
              const prData = await prRes.json();
              setProducts(prData.products || []);
            }
          } catch {}
        }

        setPosts(combinedPosts);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [handle]);

  const isMe = user && meId && user.user_id === meId;
  const name = user?.display_name || (user?.username ? `@${user.username}` : "User");
  const displayHandle = user?.username ? `@${user.username}` : "";

  // Filters based on private profile logic
  const visibleFree = posts.filter(p => !p.access_type || p.access_type === "free");
  const visibleReels = visibleFree.filter(p => p.videoUrl || p.bitchuteUrl || p.type === "Reel" || p.type === "Podcast" || p.type === "Documentary");
  const visibleImagePosts = visibleFree.filter(p => !p.videoUrl && !p.bitchuteUrl && p.type !== "Reel" && p.type !== "Podcast" && p.type !== "Documentary" && p.type !== "Troo");
  const visiblePremium = posts.filter(p => p.access_type === "pass" || p.access_type === "creator");

  const listToShow = activeTab === "posts" ? visibleImagePosts : visibleReels;

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0 overflow-x-hidden">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        <div className="mb-4">
          <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition">
            <ChevronLeft size={22} />
          </button>
        </div>

        {loading && <p className="text-white/50 py-12 text-center">Loading…</p>}

        {!loading && notFound && (
          <div className="text-center py-16">
            <p className="text-white/70 mb-2">User not found.</p>
            <Link href="/" className="text-red-500 hover:underline text-sm">Go home →</Link>
          </div>
        )}

        {!loading && user && (
          <>
            {/* Header */}
            <div className="flex items-center gap-5 mb-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold">{(name[0] || "?").toUpperCase()}</span>
                )}
              </div>

              <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{posts.length}</p>
                  <p className="text-xs text-white/60">posts</p>
                </div>
                <StatsInline userId={user.user_id} />
              </div>
            </div>

            {/* Name + handle + bio */}
            <div className="mb-4">
              <p className="font-semibold inline-flex items-center gap-1.5">
                <span>{name}</span>
                {user.is_verified && <VerifiedBadge size={16} variant={isCreator ? "gold" : "red"} />}
              </p>
              {displayHandle && <p className="text-sm text-white/50">{displayHandle}</p>}
              {user.bio && <p className="text-sm text-white/90 whitespace-pre-wrap mt-2">{user.bio}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              {isMe ? (
                <>
                  <Link href="/studio" className="flex-1 md:flex-none justify-center bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 backdrop-blur-md shadow-lg shadow-yellow-500/5">
                    <Settings size={16} /> My Studio
                  </Link>
                  <Link href="/profile" className="flex-1 md:flex-none justify-center bg-[#1c1c1e]/80 backdrop-blur-xl text-white border border-white/10 hover:bg-[#1c1c1e]/95 px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg">
                    <Pencil size={16} /> Edit Profile
                  </Link>
                </>
              ) : (
                <>
                  <UserFollowButton userId={user.user_id} />
                  {meId && (
                    <Link href={`/messages/${user.user_id}`} className="flex items-center gap-2 bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 hover:bg-[#1c1c1e]/95 px-6 py-3 rounded-xl text-sm font-bold transition shadow-lg">
                      <MessageCircle size={16} /> Message
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide border-b border-white/5">
              <button
                onClick={() => setActiveTab("posts")}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                  activeTab === "posts" ? "bg-white text-black border-white shadow-lg" : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab("reels")}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                  activeTab === "reels" ? "bg-white text-black border-white shadow-lg" : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                }`}
              >
                Reels
              </button>
              {isCreator && (
                <button
                  onClick={() => setActiveTab("premium")}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                    activeTab === "premium" ? "bg-white text-black border-white shadow-lg" : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                  }`}
                >
                  Premium
                </button>
              )}
              {isCreator && (
                <button
                  onClick={() => setActiveTab("shop")}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                    activeTab === "shop" ? "bg-white text-black border-white shadow-lg" : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                  }`}
                >
                  Shop
                </button>
              )}
            </div>

            {/* Grid Content */}
            {(activeTab === "posts" || activeTab === "reels") && (
              <div>
                <div className="flex items-center justify-between px-4 md:px-6 mb-4 mt-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {activeTab === "posts" ? "Posts" : "Reels"}
                  </h2>
                  <div className="flex items-center gap-1 bg-[#1c1c1e]/80 backdrop-blur-md p-1 rounded-lg border border-white/10">
                    <button onClick={() => setUploadsView("grid")} className={`p-1.5 rounded transition ${uploadsView === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}>
                      <Grid3x3 size={16} />
                    </button>
                    <button onClick={() => setUploadsView("list")} className={`p-1.5 rounded transition ${uploadsView === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}>
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {listToShow.length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm px-4">No content yet.</div>
                ) : uploadsView === "grid" ? (
                  <div className="grid grid-cols-3 gap-1 md:gap-2 px-2 md:px-0">
                    {listToShow.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => activeTab === "reels" ? setViewerIndex(idx) : router.push(`/podcast/${p.id}`)}
                        className="relative aspect-[4/5] bg-[#141418] rounded-xl overflow-hidden cursor-pointer group"
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
    <video src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300 pointer-events-none" preload="auto" muted playsInline />
  ) : (
    <img src={p.posterUrl || p.backdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
  )}
                        {activeTab === "reels" && (
                          <div className="absolute top-1 right-1">
                            <Play size={14} fill="white" className="text-white drop-shadow" />
                          </div>
                        )}
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow">
                          <Eye size={11} /> {(p.viewCount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-4 md:px-6">
                    {listToShow.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => activeTab === "reels" ? setViewerIndex(idx) : router.push(`/podcast/${p.id}`)}
                        className="flex items-center gap-3 p-2 rounded-lg bg-[#141418] hover:bg-white/5 transition cursor-pointer"
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
    <video src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`} className="w-12 h-16 rounded object-cover flex-shrink-0 pointer-events-none" preload="auto" muted playsInline />
  ) : (
    <img src={p.posterUrl || p.backdropUrl} alt="" className="w-12 h-16 rounded object-cover flex-shrink-0" loading="lazy" />
  )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{p.title || "Untitled"}</p>
                          <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                            <Eye size={11} /> {(p.viewCount ?? 0).toLocaleString()} views
                          </p>
                        </div>
                        <Play size={14} fill="white" className="text-white/60 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "premium" && isCreator && (
              <div>
                <div className="flex items-center justify-between px-4 md:px-6 mb-4 mt-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Premium Content</h2>
                </div>
                {visiblePremium.length === 0 ? (
                  <p className="text-center text-white/50 text-sm py-16">No premium content yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 md:gap-2 px-2 md:px-0">
                    {visiblePremium.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/podcast/${p.id}`)}
                        className="relative aspect-[4/5] bg-[#141418] rounded-xl overflow-hidden cursor-pointer group"
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
    <video src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300 pointer-events-none" preload="auto" muted playsInline />
  ) : (
    <img src={p.posterUrl || p.backdropUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
  )}
                        
                        {p.access_type === "pass" && (
                          <div className="absolute bottom-1 right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">TF</div>
                        )}
                        {p.access_type === "creator" && (
                          <div className="absolute bottom-1 right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">SUB</div>
                        )}
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow">
                          <Eye size={11} /> {(p.viewCount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "shop" && isCreator && (
              <div>
                <div className="flex items-center justify-between px-4 md:px-6 mb-4 mt-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Creator Shop</h2>
                </div>
                {products.length === 0 ? (
                  <div className="text-center py-16 bg-[#141418] rounded-2xl border border-white/5 mx-4 md:mx-0">
                    <ShoppingBag size={40} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/50 text-sm">No products in this shop yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4 md:px-0">
                    {products.map((p) => (
                      <div key={p.id} className="bg-[#141418] border border-white/5 rounded-2xl p-3 flex flex-col hover:border-white/10 transition">
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#1c1c1e] mb-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-white/20" /></div>
                          )}
                        </div>
                        <h3 className="font-bold text-sm mb-1 truncate">{p.name}</h3>
                        <p className="text-sm text-green-400 font-bold mt-auto">${(p.price_cents / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
      
      {viewerIndex !== null && (
        <ProfileReelViewer
          videos={visibleReels}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          author={{
            name: user?.display_name || user?.username || "User",
            avatar: user?.avatar_url || "",
            verified: user?.is_verified || false,
            profileHref: user?.username ? `/u/${user.username}` : "#"
          }}
        />
      )}
    </main>
  );
}

function StatsInline({ userId }: { userId: string }) {
  const [followers, setFollowers] = useState<number | null>(null);
  const [following, setFollowing] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/user-follows?user_id=${userId}&counts=1`)
      .then((r) => r.json())
      .then((d) => {
        setFollowers(d.followers ?? 0);
        setFollowing(d.following ?? 0);
      })
      .catch(() => {
        setFollowers(0);
        setFollowing(0);
      });
  }, [userId]);

  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString());

  return (
    <>
      <Link href={`/profile/${userId}/followers`} className="block">
        <p className="text-lg font-bold">{fmt(followers)}</p>
        <p className="text-xs text-white/60">followers</p>
      </Link>
      <Link href={`/profile/${userId}/following`} className="block">
        <p className="text-lg font-bold">{fmt(following)}</p>
        <p className="text-xs text-white/60">following</p>
      </Link>
    </>
  );
}
