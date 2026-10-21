"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ChevronLeft, Pencil } from "lucide-react";
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
};

type Post = {
  id: number;
  title?: string;
  posterUrl?: string;
  backdropUrl?: string;
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
  const [isCreator, setIsCreator] = useState(false);
  const [tab, setTab] = useState<"reels" | "premium">("reels");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
          found =
            d.users.find(
              (u: User) => (u.username || "").toLowerCase() === clean
            ) || d.users[0] || null;
        }
        if (!found) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setUser(found);

        // Fetch profile to check if they are a podcaster
        const pRes = await fetch(`/api/profile?user_id=${found.user_id}`).then((r) => r.json());
        const isPod = pRes.profile?.tier === "podcaster";
        setIsCreator(isPod);

        // 1. Fetch standard posts
        let combinedPosts: Post[] = [];
        try {
          const pr = await fetch(`/api/user/posts?userId=${found.user_id}`);
          const pd = await pr.json();
          combinedPosts = pd.posts || [];
        } catch {}

        // 2. If podcaster, fetch creator videos and merge them
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

  // Filter by access_type instead of content type
  const visibleReels = posts.filter(p => !p.access_type || p.access_type === "free");
  const visiblePremium = posts.filter(p => p.access_type === "pass" || p.access_type === "creator");

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
        </div>

        {loading && <p className="text-white/50 py-12 text-center">Loading…</p>}

        {!loading && notFound && (
          <div className="text-center py-16">
            <p className="text-white/70 mb-2">User not found.</p>
            <Link href="/" className="text-red-500 hover:underline text-sm">
              Go home →
            </Link>
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
                  <span className="text-3xl font-bold">
                    {(name[0] || "?").toUpperCase()}
                  </span>
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
                {user.is_verified && <VerifiedBadge size={16} />}
              </p>
              {displayHandle && (
                <p className="text-sm text-white/50">{displayHandle}</p>
              )}
              {user.bio && (
                <p className="text-sm text-white/90 whitespace-pre-wrap mt-2">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mb-6">
              {isMe ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  <Pencil size={14} /> Edit profile
                </Link>
              ) : (
                <>
                  <UserFollowButton userId={user.user_id} />
                  {meId && (
                    <Link
                      href={`/messages/${user.user_id}`}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      <MessageCircle size={16} /> Message
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Tabs */}
            {isCreator && (
              <div className="flex border-b border-white/10 mb-3">
                <button
                  onClick={() => setTab("reels")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
                    tab === "reels" ? "border-white text-white" : "border-transparent text-white/50"
                  }`}
                >
                  Reels
                </button>
                <button
                  onClick={() => setTab("premium")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
                    tab === "premium" ? "border-white text-white" : "border-transparent text-white/50"
                  }`}
                >
                  Premium
                </button>
              </div>
            )}

            {/* Grid */}
            {(!isCreator || tab === "reels") && (
              visibleReels.length === 0 ? (
                <p className="text-center text-white/50 text-sm py-16">No posts yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 -mx-4 md:-mx-6">
                  {visibleReels.map((p) => (
                    <Link
                      key={p.id}
                      href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                      className="relative aspect-[4/5] bg-[#141418] overflow-hidden"
                    >
                      <img
                        src={p.posterUrl || p.backdropUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </Link>
                  ))}
                </div>
              )
            )}

            {isCreator && tab === "premium" && (
              visiblePremium.length === 0 ? (
                <p className="text-center text-white/50 text-sm py-16">No premium content yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 -mx-4 md:-mx-6">
                  {visiblePremium.map((p) => (
                    <Link
                      key={p.id}
                      href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                      className="relative aspect-[4/5] bg-[#141418] overflow-hidden"
                    >
                      <img
                        src={p.posterUrl || p.backdropUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      {p.access_type === "pass" && (
                        <div className="absolute bottom-1 right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                          TF
                        </div>
                      )}
                      {p.access_type === "creator" && (
                        <div className="absolute bottom-1 right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                          SUB
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
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
