"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Play, Search, Lock, ShoppingBag, Sparkles, ChevronLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
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
  access_type?: string;
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
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
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
    if (v.access_type && v.access_type !== "free" && !hasSub) {
      if (premiumData?.enabled) handleSubscribe();
      else alert("This is premium content.");
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
          <p className="text-white/50 mb-4">Creator not found</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">← Back to Creators</Link>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  const bannerUrl = creator?.heroBackdropUrl || latest?.backdropUrl || "";

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24 lg:pb-0">
      <TopBar />

      {loading ? (
        <div className="h-screen flex items-center justify-center"><p className="text-white/50">Loading…</p></div>
      ) : (
        <>
          {/* CINEMATIC BANNER */}
          <div className="relative w-full h-[40vh] md:h-[65vh] overflow-hidden mt-16 md:mt-20">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-900/40 via-black to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent" />
          </div>

          {/* CREATOR HEADER (Desktop Overlap) */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-24 md:-mt-40 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end md:gap-10">
              
              {/* Avatar */}
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border-4 md:border-[6px] border-[#050505] bg-[#1c1c1e] flex items-center justify-center flex-shrink-0 shadow-2xl shadow-black/50">
                {creator?.photoUrl ? (
                  <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl md:text-7xl font-black">{creator?.name?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 md:pb-6 mt-4 md:mt-0">
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <h1 className="text-3xl md:text-6xl font-black tracking-tight drop-shadow-lg">{creator?.name}</h1>
                  {creator?.isVerified && <VerifiedBadge size={28} variant="gold" />}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-sm md:text-base text-white/60 mb-4 font-medium">
                  <span className="text-white/90">@{creator?.slug}</span>
                  <span>·</span>
                  <span>{followerCount !== null ? followerCount.toLocaleString() : "—"} subscribers</span>
                  <span>·</span>
                  <span>{videos.length} episodes</span>
                </div>
                
                {creator?.description && (
                  <p className="text-sm md:text-lg text-white/70 max-w-3xl mb-6 line-clamp-2 md:line-clamp-none">
                    {creator.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <button 
                    onClick={async () => {
                      if (!userId) return router.push("/login");
                      await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, creatorId: creator?.id }) });
                      alert("Subscribed to updates!");
                    }} 
                    className="bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl text-sm md:text-base transition hover:scale-105 shadow-lg flex items-center gap-2"
                  >
                    + Subscribe
                  </button>
                  
                  {premiumData?.enabled && (
                    hasSub ? (
                      <div className="bg-green-500/10 text-green-400 border border-green-500/30 px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold backdrop-blur-md flex items-center gap-2">
                        <Sparkles size={18} /> Premium Member
                      </div>
                    ) : (
                      <button onClick={handleSubscribe} disabled={checkoutLoading} className="bg-yellow-500 text-black hover:bg-yellow-400 px-5 md:px-6 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold transition disabled:opacity-50 shadow-lg flex items-center gap-2">
                        <Sparkles size={18} /> {checkoutLoading ? "Loading..." : `Join Premium $${(premiumData.price_cents / 100).toFixed(2)}/mo`}
                      </button>
                    )
                  )}

                  <div className="relative flex-1 md:flex-none md:w-72 mt-2 md:mt-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input 
                      type="text" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      placeholder="Search content..." 
                      className="w-full bg-[#1c1c1e]/80 backdrop-blur-md border border-white/10 rounded-xl pl-11 pr-4 py-2.5 md:py-3 text-sm md:text-base outline-none focus:border-white/30 placeholder:text-white/30 transition" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* DESKTOP TABS (Centered, Sticky) */}
            <div className="flex justify-center mt-12 md:mt-16 mb-8 md:sticky md:top-20 z-40">
              <div className="flex gap-2 p-1.5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl overflow-x-auto scrollbar-hide">
                {(["home", "podcasts", "documentaries", "videos", "shop"] as Tab[]).map((t) => (
                  <button 
                    key={t} 
                    onClick={() => setTab(t)} 
                    className={`px-6 md:px-8 py-2 md:py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                      tab === t 
                        ? "bg-white text-black shadow-md" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {t === "home" ? "Home" : t === "podcasts" ? "Podcasts" : t === "documentaries" ? "Documentaries" : t === "videos" ? "Videos" : "Shop"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8 min-h-[50vh]">
            
            {tab === "home" && (
              <div className="space-y-12">
                {latest && (
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Latest Drop
                    </h2>
                    
                    {/* Cinematic Featured Video Card */}
                    <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl group cursor-pointer" onClick={() => handleVideoClick(latest)}>
                      {/* Blurred background glow */}
                      <div className="absolute inset-0 opacity-20 blur-[80px] scale-110 pointer-events-none">
                        <img src={latest.posterUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="relative z-10 flex flex-col md:flex-row gap-6 p-6 md:p-10">
                        <div className="w-full md:w-1/2 aspect-video rounded-2xl overflow-hidden bg-black flex-shrink-0 relative shadow-2xl">
                          {latest.posterUrl ? (
                            <img src={latest.posterUrl} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${latest.access_type && latest.access_type !== "free" && !hasSub ? 'blur-sm opacity-60' : ''}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Play size={48} className="text-white/30" /></div>
                          )}
                          
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
                            {latest.access_type && latest.access_type !== "free" && !hasSub ? (
                              <div className="flex flex-col items-center justify-center bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
                                <Lock size={32} className="text-red-500 mb-2" />
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Premium</span>
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-transform transform scale-90 group-hover:scale-100 shadow-2xl">
                                <Play size={36} fill="white" className="text-white ml-1" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center py-2">
                          <p className="text-xs md:text-sm font-bold text-red-500 uppercase tracking-widest mb-3">{latest.type}</p>
                          <h3 className="text-2xl md:text-4xl font-black mb-4 line-clamp-3 group-hover:text-red-500 transition-colors">{latest.title}</h3>
                          <div className="text-sm text-white/50 mb-6 font-medium">
                            {(latest.viewCount || 0).toLocaleString()} views · {timeAgo(latest.createdAt)}
                          </div>
                          {latest.description && (
                            <p className="text-sm md:text-base text-white/70 whitespace-pre-wrap line-clamp-4 leading-relaxed">{latest.description}</p>
                          )}
                        </div>
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
                  if (list.length === 0) return (
                    <div className="text-center py-24 bg-[#0a0a0a] rounded-3xl border border-white/5">
                      <Play size={48} className="mx-auto text-white/20 mb-4" />
                      <p className="text-white/50 text-lg">No content published yet.</p>
                    </div>
                  );
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {list.map((v) => (
                        <div key={v.id} onClick={() => handleVideoClick(v)} className="cursor-pointer group flex flex-col">
                          <div className="aspect-video rounded-2xl overflow-hidden bg-[#0f0f12] mb-4 relative shadow-lg border border-white/5">
                            {v.posterUrl ? (
                              <img src={v.posterUrl} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${v.access_type && v.access_type !== "free" && !hasSub ? 'blur-sm opacity-60' : ''}`} loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-white/30" /></div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                              {v.access_type && v.access_type !== "free" && !hasSub ? (
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                                  <Lock size={16} className="text-red-500" />
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">Premium</span>
                                </div>
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-transform transform scale-90 group-hover:scale-100">
                                  <Play size={24} fill="white" className="text-white ml-1" />
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-base font-bold line-clamp-2 mb-2 group-hover:text-red-400 transition-colors">{v.title}</p>
                          <p className="text-sm text-white/40 font-medium mt-auto">
                            {(v.viewCount || 0).toLocaleString()} views · {timeAgo(v.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            )}

            {tab === "shop" && (
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-8 flex items-center gap-3"><ShoppingBag size={28} className="text-red-500"/> Creator Merch</h2>
                {products.length === 0 ? (
                  <div className="text-center py-24 bg-[#0a0a0a] rounded-3xl border border-white/5">
                    <ShoppingBag size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/50 text-lg">No products available yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((p) => (
                      <div key={p.id} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex flex-col hover:border-white/20 transition group">
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#0f0f12] mb-4 relative">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-white/20" /></div>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-1 truncate">{p.name}</h3>
                        <p className="text-sm text-white/50 mb-6 flex-1 line-clamp-2">{p.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                          <span className="text-xl font-black text-white">${(p.price_cents / 100).toFixed(2)}</span>
                          <button onClick={() => handleBuyProduct(p.id)} className="bg-white text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition shadow-lg">
                            Buy Now
                          </button>
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
