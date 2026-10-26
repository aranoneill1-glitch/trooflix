"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Play, Search, Lock, ShoppingBag, Sparkles, ChevronLeft, Plus, Settings, Grid3x3, List, Eye, MessageCircle } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import ProfileReelViewer from "@/components/ProfileReelViewer";
import { getCachedCreators, getCachedUser } from "@/lib/cache";

type Video = {
  id: number;
  title: string;
  description: string;
  type: string;
  posterUrl: string;
  backdropUrl?: string;
  videoUrl?: string;
  bitchuteUrl?: string;
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

type Tab = "home" | "videos" | "premium" | "shop";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const [premiumData, setPremiumData] = useState<{ enabled: boolean; price_cents: number } | null>(null);
  const [hasSub, setHasSub] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

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

        // Fetch all data in parallel
        Promise.all([
          fetch(`/api/creators/videos?creatorId=${found.id}`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/follow-count?creator_id=${found.id}`).then((r) => r.json()),
          fetch(`/api/creator/products?creatorId=${found.id}`).then((r) => r.json()),
          fetch(`/api/creator/public-premium?creatorId=${found.id}`).then((r) => r.json()),
        ]).then(([vData, fData, pData, premData]) => {
          setVideos(Array.isArray(vData.videos) ? vData.videos : []);
          setFollowerCount(fData.count ?? 0);
          setProducts(pData.products || []);
          if (premData.enabled) setPremiumData({ enabled: true, price_cents: premData.price_cents });
        }).catch(() => {});

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
    if (isIOS) return alert("To subscribe, please visit trooflixtv.com on your web browser.");
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
    } catch { alert("Network error"); } finally { setCheckoutLoading(false); }
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
    } catch { alert("Network error"); }
  };

  // Filter & Search Logic
  const filteredVideos = useMemo(() => {
    let list = videos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
      return bt - at;
    });
  }, [videos, searchQuery]);

  const freeVideos = filteredVideos.filter(v => !v.access_type || v.access_type === "free");
  const premiumVideos = filteredVideos.filter(v => v.access_type && v.access_type !== "free");
  
  const latest = filteredVideos[0];
  const isOwner = userId && creator?.ownerUserId === userId;

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white">
        <TopBar />
        <div className="pt-32 text-center">
          <p className="text-white/50 mb-4">Creator not found</p>
          <Link href="/creators" className="text-red-500 hover:underline">← Back to Creators</Link>
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
        <div className="h-screen flex items-center justify-center"><p className="text-white/50 animate-pulse">Loading Creator Hub…</p></div>
      ) : (
        <>
          {/* CINEMATIC BANNER */}
          {bannerUrl && (
            <div className="relative w-full h-[35vh] md:h-[45vh] overflow-hidden mt-16 md:mt-20">
              <img src={bannerUrl} alt="" className="w-full h-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent" />
            </div>
          )}

          {/* HEADER */}
          <div className={`max-w-6xl mx-auto px-4 md:px-8 relative z-10 ${bannerUrl ? "-mt-20 md:-mt-24" : "pt-28 md:pt-32"}`}>
            <div className="flex flex-col md:flex-row md:items-end md:gap-10">
              
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 md:border-[6px] border-[#050505] bg-[#1c1c1e] flex items-center justify-center flex-shrink-0 shadow-2xl">
                {creator?.photoUrl ? (
                  <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl md:text-7xl font-black">{creator?.name?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              <div className="flex-1 min-w-0 md:pb-2 mt-4 md:mt-0">
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <h1 className="text-3xl md:text-6xl font-black tracking-tight drop-shadow-lg">{creator?.name}</h1>
                  {creator?.isVerified && <VerifiedBadge size={28} variant="gold" />}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-sm md:text-base text-white/60 mb-4 font-medium">
                  <span className="text-white/90">@{creator?.slug}</span>
                  <span>·</span>
                  <span>{followerCount !== null ? followerCount.toLocaleString() : "—"} followers</span>
                  <span>·</span>
                  <span>{videos.length} uploads</span>
                </div>
                
                {creator?.description && (
                  <p className="text-sm md:text-lg text-white/70 max-w-3xl mb-6 line-clamp-2 md:line-clamp-none">
                    {creator.description}
                  </p>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  {isOwner ? (
                    <>
                      <Link href="/studio/upload" className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2">
                        <Plus size={18} /> Add Video
                      </Link>
                      <Link href="/studio/shop" className="bg-[#1c1c1e] text-white border border-white/20 font-bold px-6 py-2.5 rounded-xl text-sm transition hover:bg-white/10 flex items-center gap-2">
                        <ShoppingBag size={18} /> Add Merch
                      </Link>
                      <Link href="/studio" className="bg-white/10 text-white border border-white/10 font-bold px-6 py-2.5 rounded-xl text-sm transition hover:bg-white/20 flex items-center gap-2">
                        <Settings size={18} /> Studio
                      </Link>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={async () => {
                          if (!userId) return router.push("/login");
                          await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, creatorId: creator?.id }) });
                          alert("Followed creator!");
                        }} 
                        className="bg-white text-black font-bold px-8 py-2.5 rounded-xl text-sm transition hover:scale-105 shadow-lg flex items-center gap-2"
                      >
                        + Follow
                      </button>
                      {premiumData?.enabled && (
                        hasSub ? (
                          <div className="bg-green-500/10 text-green-400 border border-green-500/30 px-5 py-2.5 rounded-xl text-sm font-bold backdrop-blur-md flex items-center gap-2">
                            <Sparkles size={18} /> Premium Member
                          </div>
                        ) : (
                          <button onClick={handleSubscribe} disabled={checkoutLoading} className="bg-yellow-500 text-black hover:bg-yellow-400 px-5 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 shadow-lg flex items-center gap-2">
                            <Sparkles size={18} /> {checkoutLoading ? "Loading..." : `Join Premium $${(premiumData.price_cents / 100).toFixed(2)}/mo`}
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* STICKY TABS */}
            <div className={`flex justify-center mt-8 mb-8 md:sticky md:top-20 z-40`}>
              <div className="flex gap-2 p-1.5 bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl overflow-x-auto scrollbar-hide">
                <button onClick={() => setTab("home")} className={`px-6 md:px-8 py-2 rounded-full text-sm font-semibold transition-all ${tab === "home" ? "bg-white text-black shadow-md" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Home</button>
                <button onClick={() => setTab("videos")} className={`px-6 md:px-8 py-2 rounded-full text-sm font-semibold transition-all ${tab === "videos" ? "bg-white text-black shadow-md" : "text-white/60 hover:text-white hover:bg-white/5"}`}>Videos</button>
                {premiumData?.enabled && (
                  <button onClick={() => setTab("premium")} className={`px-6 md:px-8 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === "premium" ? "bg-yellow-500 text-black shadow-md" : "text-yellow-500/70 hover:text-yellow-400 hover:bg-white/5"}`}>
                    <Sparkles size={14} /> Premium
                  </button>
                )}
                {products.length > 0 && (
                  <button onClick={() => setTab("shop")} className={`px-6 md:px-8 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${tab === "shop" ? "bg-white text-black shadow-md" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                    <ShoppingBag size={14} /> Shop
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8 min-h-[50vh]">
            
            {/* === HOME TAB === */}
            {tab === "home" && (
              <div className="space-y-12">
                {latest && (
                  <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl group cursor-pointer" onClick={() => handleVideoClick(latest)}>
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
                        <p className="text-xs md:text-sm font-bold text-red-500 uppercase tracking-widest mb-3">{latest.type} · LATEST DROP</p>
                        <h3 className="text-2xl md:text-4xl font-black mb-4 line-clamp-3 group-hover:text-red-500 transition-colors">{latest.title}</h3>
                        <div className="text-sm text-white/50 mb-6 font-medium">
                          {(latest.viewCount || 0).toLocaleString()} views
                        </div>
                        {latest.description && (
                          <p className="text-sm md:text-base text-white/70 whitespace-pre-wrap line-clamp-4 leading-relaxed">{latest.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Uploads Row */}
                {freeVideos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl md:text-2xl font-black">Recent Uploads</h2>
                      <button onClick={() => setTab("videos")} className="text-sm font-bold text-white/50 hover:text-white transition">View All</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                      {freeVideos.slice(0, 6).map(v => (
                        <div key={v.id} onClick={() => handleVideoClick(v)} className="flex-shrink-0 w-[200px] md:w-[260px] cursor-pointer group">
                          <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-2 relative border border-white/5">
                             {v.posterUrl ? <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-white/30" /></div>}
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-transform">
                                  <Play size={16} fill="white" className="text-white ml-0.5" />
                                </div>
                             </div>
                          </div>
                          <p className="text-sm font-bold line-clamp-2 group-hover:text-red-400 transition-colors">{v.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Merch Spotlight */}
                {products.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl md:text-2xl font-black flex items-center gap-2"><ShoppingBag size={20} className="text-red-500"/> Creator Shop</h2>
                      <button onClick={() => setTab("shop")} className="text-sm font-bold text-white/50 hover:text-white transition">Visit Shop</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                      {products.slice(0, 4).map(p => (
                        <div key={p.id} onClick={() => handleBuyProduct(p.id)} className="flex-shrink-0 w-[140px] md:w-[180px] cursor-pointer group">
                          <div className="aspect-square rounded-xl overflow-hidden bg-[#0f0f12] mb-2 relative border border-white/5">
                            {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-white/30" /></div>}
                            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-green-400">${(p.price_cents / 100).toFixed(2)}</div>
                          </div>
                          <p className="text-sm font-bold line-clamp-1 group-hover:text-white">{p.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === VIDEOS TAB === */}
            {tab === "videos" && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-black">All Videos</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-white/30" />
                    </div>
                    <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg border border-white/10">
                      <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded transition ${viewMode === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><Grid3x3 size={16} /></button>
                      <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition ${viewMode === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><List size={16} /></button>
                    </div>
                  </div>
                </div>

                {freeVideos.length === 0 ? (
                  <p className="text-center text-white/50 py-16">No videos found.</p>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {freeVideos.map(v => (
                      <div key={v.id} onClick={() => handleVideoClick(v)} className="cursor-pointer group flex flex-col">
                        <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-3 relative border border-white/5">
                          {v.posterUrl ? <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-white/30" /></div>}
                          <div className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"><Eye size={10} className="inline mr-1" />{(v.viewCount || 0).toLocaleString()}</div>
                        </div>
                        <p className="text-sm font-bold line-clamp-2 mb-1 group-hover:text-red-400 transition-colors">{v.title}</p>
                        <p className="text-xs text-white/40">{v.type}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {freeVideos.map(v => (
                      <div key={v.id} onClick={() => handleVideoClick(v)} className="flex items-center gap-4 p-3 rounded-xl bg-[#0f0f12] hover:bg-[#1c1c1e] transition cursor-pointer border border-white/5">
                        <div className="w-24 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                          {v.posterUrl ? <img src={v.posterUrl} alt="" className="w-full h-full object-cover" /> : <Play size={16} className="m-auto text-white/30 mt-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{v.title}</p>
                          <p className="text-xs text-white/40 mt-1">{v.type} · {(v.viewCount || 0).toLocaleString()} views</p>
                        </div>
                        <Play size={18} fill="white" className="text-white/40 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* === PREMIUM TAB === */}
            {tab === "premium" && premiumData?.enabled && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-2"><Sparkles size={24} className="text-yellow-500" /> Premium Content</h2>
                  {!hasSub && (
                    <button onClick={handleSubscribe} className="bg-yellow-500 text-black hover:bg-yellow-400 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg">
                      Join for ${(premiumData.price_cents / 100).toFixed(2)}/mo
                    </button>
                  )}
                </div>

                {premiumVideos.length === 0 ? (
                  <p className="text-center text-white/50 py-16">No premium content yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {premiumVideos.map(v => {
                      const isLocked = !hasSub;
                      return (
                        <div key={v.id} onClick={() => !isLocked && handleVideoClick(v)} className={`relative group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-3 relative border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                            {v.posterUrl ? <img src={v.posterUrl} alt="" className={`w-full h-full object-cover transition duration-500 ${isLocked ? 'blur-md opacity-50' : 'group-hover:scale-105'}`} loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-white/30" /></div>}
                            
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                                  <Lock size={16} className="text-yellow-500" />
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">Premium</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-bold line-clamp-2 mb-1">{v.title}</p>
                          <p className="text-xs text-white/40">{v.type}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* === SHOP TAB === */}
            {tab === "shop" && (
              <div>
                <h2 className="text-2xl md:text-3xl font-black mb-8 flex items-center gap-3"><ShoppingBag size={28} className="text-red-500"/> Creator Merch</h2>
                {products.length === 0 ? (
                  <div className="text-center py-24 bg-[#0a0a0a] rounded-3xl border border-white/5">
                    <ShoppingBag size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/50 text-lg">No products available yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((p) => (
                      <div key={p.id} className="group bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex flex-col hover:border-white/20 transition group">
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

      {viewerIndex !== null && (
        <ProfileReelViewer
          videos={freeVideos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          author={{
            name: creator?.name || "User",
            avatar: creator?.photoUrl || "",
            verified: creator?.isVerified || false,
            profileHref: `/podcaster/${creator?.slug}`
          }}
        />
      )}
    </main>
  );
}
