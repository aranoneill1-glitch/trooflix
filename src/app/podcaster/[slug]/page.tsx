"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Play, Eye, Bell, Search, Lock, ShoppingBag } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FollowButton from "@/components/FollowButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedCreators, getCachedUser } from "@/lib/cache";

type Video = {
  id: number;
  title: string;
  description: string;
  type: string;
  posterUrl: string;
  backdropUrl: string;
  creatorId?: number | null;
  createdAt?: string;
  viewCount?: number;
  is_premium?: boolean;
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

type Tab = "home" | "podcasts" | "documentaries" | "videos" | "shop";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString();
}

const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

export default function PodcasterProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [premiumData, setPremiumData] = useState<{ enabled: boolean; price_cents: number } | null>(null);
  const [hasSub, setHasSub] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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

        fetch(`/api/creators/videos?creatorId=${found.id}`, { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => setVideos(Array.isArray(d.videos) ? d.videos : []))
          .catch(() => setVideos([]));

        fetch(`/api/follow-count?creator_id=${found.id}`)
          .then((r) => r.json())
          .then((d) => setFollowerCount(d.count ?? 0))
          .catch(() => setFollowerCount(0));

        fetch(`/api/creator/products?creatorId=${found.id}`)
          .then((r) => r.json())
          .then((d) => setProducts(d.products || []))
          .catch(() => setProducts([]));

        fetch(`/api/creator/public-premium?creatorId=${found.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.enabled) setPremiumData({ enabled: true, price_cents: d.price_cents });
          });

        getCachedUser().then((u) => {
          if (u) {
            setUserId(u.id);
            fetch(`/api/creator/check-sub?userId=${u.id}&creatorId=${found.id}`)
              .then((r) => r.json())
              .then((d) => setHasSub(!!d.hasSub));
          }
        });

        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  const handleSubscribe = async () => {
    if (isIOS) {
      alert("To subscribe to this creator, please visit trooflixtv.com on your web browser.");
      return;
    }

    if (!userId) return router.push("/login");
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, creatorId: creator?.id }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "Could not start checkout");
    } catch {
      alert("Network error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleVideoClick = (v: Video) => {
    if (v.is_premium && !hasSub) {
      if (premiumData?.enabled) handleSubscribe();
      else alert("This is a premium video.");
    } else {
      router.push(`/podcast/${v.id}`);
    }
  };

  const handleBuyProduct = async (productId: number) => {
    if (!userId) return router.push("/login");
    try {
      const res = await fetch("/api/stripe/merch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, productId, creatorSlug: slug }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "Checkout failed");
    } catch {
      alert("Network error");
    }
  };

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.toLowerCase();
    return videos.filter((v) => v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
  }, [videos, searchQuery]);

  const sorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    });
  }, [searched]);

  const podcasts = useMemo(() => sorted.filter((v) => v.type === "Podcast"), [sorted]);
  const documentaries = useMemo(() => sorted.filter((v) => v.type === "Documentary"), [sorted]);
  const videoPosts = useMemo(() => sorted.filter((v) => v.type !== "Podcast" && v.type !== "Documentary"), [sorted]);

  const latest = sorted[0];

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white">
        <TopBar />
        <div className="pt-32 text-center">
          <p className="text-white/50 mb-4">Podcaster not found</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">← Back to Podcasts</Link>
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
        <div className="h-screen flex items-center justify-center"><p className="text-white/50">Loading…</p></div>
      ) : (
        <>
          <div className="relative w-full h-[20vh] md:h-[30vh] overflow-hidden mt-16 md:mt-20">
            {bannerUrl ? <img src={bannerUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-yellow-900/30 to-black" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 md:-mt-16 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end md:gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full overflow-hidden border-4 border-black bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center flex-shrink-0">
                {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl md:text-6xl font-black">{creator?.name?.[0]?.toUpperCase() || "?"}</span>}
              </div>

              <div className="flex-1 min-w-0 md:pb-2 mt-3 md:mt-0">
                <h1 className="text-2xl md:text-4xl font-black inline-flex items-center gap-2 mb-1">
                  {creator?.name} {creator?.isVerified && <VerifiedBadge size={24} variant="gold" />}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/60 mb-2">
                  <span className="text-white/80">@{creator?.slug}</span><span>·</span><span>{followerCount !== null ? followerCount.toLocaleString() : "—"} subscribers</span><span>·</span><span>{videos.length} episodes</span>
                </div>
                {creator?.description && <p className={`text-sm text-white/80 max-w-2xl ${bioExpanded ? "" : "line-clamp-2"}`}>{creator.description}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <FollowButton creatorId={creator?.id as number} />
                  {premiumData?.enabled && (
                    hasSub ? (
                      <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-full text-xs font-bold">✓ Subscribed</div>
                    ) : (
                      <button onClick={handleSubscribe} disabled={checkoutLoading} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50">
                        {checkoutLoading ? "Loading..." : `Subscribe $${(premiumData.price_cents / 100).toFixed(2)}/mo`}
                      </button>
                    )
                  )}
                  <div className="relative w-40">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-white/10 border border-white/20 rounded-full pl-7 pr-2 py-1.5 text-xs outline-none focus:border-white/50 placeholder:text-white/40 transition" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex border-b border-white/10 mt-6 md:mt-8 gap-6 overflow-x-auto">
              {(["home", "podcasts", "documentaries", "videos", "shop"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`py-3 text-sm font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap ${tab === t ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"}`}>
                  {t === "home" ? "Home" : t === "podcasts" ? "Podcasts" : t === "documentaries" ? "Documentaries" : t === "videos" ? "Videos" : "Shop"}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
            {tab === "home" && (
              <div className="space-y-10">
                {latest && (
                  <div>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Latest Drop</h2>
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 cursor-pointer group bg-[#0f0f12] rounded-xl p-3 border border-white/5 hover:border-white/10 transition" onClick={() => handleVideoClick(latest)}>
                      <div className="w-full md:w-80 aspect-video rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                        {latest.posterUrl ? <img src={latest.posterUrl} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition ${latest.is_premium && !hasSub ? 'blur-sm opacity-60' : ''}`} /> : <div className="w-full h-full flex items-center justify-center"><Play size={40} className="text-white/30" /></div>}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition">
                          {latest.is_premium && !hasSub ? <div className="flex flex-col items-center justify-center"><Lock size={32} className="text-yellow-500 mb-1" /><span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Premium</span></div> : <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Play size={24} fill="black" className="text-black ml-0.5" /></div>}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-2">
                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">{latest.type}</p>
                        <h3 className="text-lg md:text-2xl font-black mb-2 line-clamp-2 group-hover:text-red-500 transition">{latest.title}</h3>
                        <div className="text-xs text-white/50 mb-3">{(latest.viewCount || 0).toLocaleString()} views · {timeAgo(latest.createdAt)}</div>
                        {latest.description && <p className="text-sm text-white/70 whitespace-pre-wrap line-clamp-3">{latest.description}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(tab === "podcasts" || tab === "documentaries" || tab === "videos") && (
              <>
                {(() => {
                  const list = tab === "podcasts" ? podcasts : tab === "documentaries" ? documentaries : videoPosts;
                  if (list.length === 0) return <div className="text-center py-16"><Play size={40} className="mx-auto text-white/20 mb-4" /><p className="text-white/60">No content published yet.</p></div>;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {list.map((v) => (
                        <div key={v.id} onClick={() => handleVideoClick(v)} className="cursor-pointer group">
                          <div className="aspect-video rounded-xl overflow-hidden bg-black mb-2 relative">
                            {v.posterUrl ? <img src={v.posterUrl} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition ${v.is_premium && !hasSub ? 'blur-sm opacity-60' : ''}`} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-white/30" /></div>}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                              {v.is_premium && !hasSub ? <Lock size={24} className="text-yellow-500" /> : <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Play size={20} fill="black" className="text-black ml-0.5" /></div>}
                            </div>
                          </div>
                          <p className="text-sm font-semibold line-clamp-2 mb-1">{v.title}</p>
                          <p className="text-xs text-white/50">{(v.viewCount || 0).toLocaleString()} views · {timeAgo(v.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {tab === "shop" && (
              <div>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><ShoppingBag size={20}/> Merchandise</h2>
                {products.length === 0 ? (
                  <div className="text-center py-16"><ShoppingBag size={40} className="mx-auto text-white/20 mb-4" /><p className="text-white/60">No products available yet.</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((p) => (
                      <div key={p.id} className="bg-[#0f0f12] border border-white/5 rounded-xl p-4 flex flex-col">
                        <div className="aspect-square rounded-lg overflow-hidden bg-black mb-4">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-white/20" /></div>}
                        </div>
                        <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                        <p className="text-sm text-white/50 mb-3 flex-1">{p.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xl font-black text-green-400">${(p.price_cents / 100).toFixed(2)}</span>
                          <button onClick={() => handleBuyProduct(p.id)} className="bg-white text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">Buy Now</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="h-16" />
        </>
      )}
      <MobileBottomNav />
    </main>
  );
}
