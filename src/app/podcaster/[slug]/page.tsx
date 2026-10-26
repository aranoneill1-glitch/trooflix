"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Play, Search, Lock, ShoppingBag, Sparkles, Plus, Settings, 
  Grid3x3, List, Eye, X, Camera, Bookmark, Wallet, LogOut, Loader2, MessageCircle, Share, MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import ProfileReelViewer from "@/components/ProfileReelViewer";
import EnablePush from "@/components/EnablePush";
import { getCachedCreators, getCachedUser, clearUserCache } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

type Video = {
  id: number;
  title: string;
  description?: string;
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

export default function UnifiedCreatorHub() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const [dashOpen, setDashOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

  const loadData = async () => {
    try {
      const all = await getCachedCreators();
      const list: Creator[] = Array.isArray(all) ? all : [];
      const found = list.find((c) => c.slug === slug || String(c.id) === slug);
      
      if (!found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCreator(found);
      setEditName(found.name || "");
      setEditBio(found.description || "");

      const user = await getCachedUser();
      if (user) setUserId(user.id);

      const [vData, fData, pData, premData, reelsData, subData] = await Promise.all([
        fetch(`/api/creators/videos?creatorId=${found.id}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/follow-count?creator_id=${found.id}`).then((r) => r.json()),
        fetch(`/api/creator/products?creatorId=${found.id}`).then((r) => r.json()),
        fetch(`/api/creator/public-premium?creatorId=${found.id}`).then((r) => r.json()),
        found.ownerUserId ? fetch(`/api/user/posts?userId=${found.ownerUserId}`).then(r => r.json()).catch(() => ({ posts: [] })) : Promise.resolve({ posts: [] }),
        (user && found.id) ? fetch(`/api/creator/check-sub?userId=${user.id}&creatorId=${found.id}`).then(r => r.json()).catch(() => ({ hasSub: false })) : Promise.resolve({ hasSub: false })
      ]);

      const cVids = Array.isArray(vData.videos) ? vData.videos : [];
      const uPosts = Array.isArray(reelsData.posts) ? reelsData.posts : [];
      
      const existingIds = new Set(cVids.map((v: any) => v.id));
      const newReels = uPosts.filter((v: any) => !existingIds.has(v.id));
      
      setVideos([...cVids, ...newReels]);
      setFollowerCount(fData.count ?? 0);
      setProducts(pData.products || []);
      if (premData.enabled) setPremiumData({ enabled: true, price_cents: premData.price_cents });
      if (subData.hasSub) setHasSub(true);

      setLoading(false);
    } catch {
      setNotFound(true);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [slug]);

  const handleSubscribe = async () => {
    if (isIOS) return alert("To subscribe, please visit trooflixtv.com on your web browser.");
    if (!userId) return router.push("/login");
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/creator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, creatorId: creator?.id }) });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
    } catch { alert("Network error"); } finally { setCheckoutLoading(false); }
  };

  const handleVideoClick = (v: Video) => {
    if (v.access_type && v.access_type !== "free" && !hasSub) {
      if (premiumData?.enabled) handleSubscribe();
    } else {
      router.push(`/podcast/${v.id}`);
    }
  };

  const handleBuyProduct = async (productId: number) => {
    if (!userId) return router.push("/login");
    try {
      const res = await fetch("/api/stripe/merch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, productId, creatorSlug: slug }) });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
    } catch { alert("Network error"); }
  };

  const saveEdit = async () => {
    if (!creator?.ownerUserId) return;
    setStatusMsg("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: creator.ownerUserId, displayName: editName.trim(), bio: editBio.trim() }),
    });
    if (res.ok) {
      setStatusMsg("✅ Saved");
      setTimeout(() => { setStatusMsg(""); setEditOpen(false); loadData(); }, 1200);
    } else { setStatusMsg("❌ Could not save"); }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creator?.ownerUserId) return;
    setUploading(true);
    try {
      const presign = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg", folder: "avatars" }) });
      const { signedUrl, publicUrl } = await presign.json();
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: creator.ownerUserId, avatarUrl: publicUrl }) });
      loadData();
    } catch { alert("Upload failed"); } finally { setUploading(false); }
  };

  const handleManageSubscription = async () => {
    if (!userId) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
    } catch {} finally { setPortalLoading(false); }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    router.push("/");
  };

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

  if (notFound) return (
    <main className="min-h-screen bg-black text-white"><TopBar /><div className="pt-32 text-center"><p className="text-white/50 mb-4">Creator not found</p><Link href="/creators" className="text-red-500 hover:underline">← Back</Link></div><MobileBottomNav /></main>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24 lg:pb-0">
      <TopBar />
      {loading ? (
        <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></div>
      ) : (
        <>
          {/* CINEMATIC BANNER */}
          <div className="relative w-full h-[35vh] md:h-[45vh] overflow-hidden mt-16 md:mt-20">
            <img src={creator?.heroBackdropUrl || latest?.backdropUrl || ""} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-black/30" />
            
            {/* MANAGE BUTTON (Top Right) */}
            {isOwner && (
              <div className="absolute top-6 right-4 md:right-8 z-20 flex gap-2">
                <button onClick={() => setEditOpen(true)} className="p-2.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-full hover:bg-black/70 transition text-white shadow-lg">
                  <Settings size={18} />
                </button>
                <button onClick={() => setDashOpen(true)} className="p-2.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-full hover:bg-black/70 transition text-white shadow-lg">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 -mt-16 md:-mt-24">
            
            {/* HEADER - Clean, Apple TV+ Style */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-8">
              
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-[#050505] bg-[#1c1c1e] flex items-center justify-center flex-shrink-0 shadow-2xl group">
                {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl md:text-6xl font-black">{creator?.name?.[0]?.toUpperCase()}</span>}
              </div>

              <div className="flex-1 text-center md:text-left pb-2">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-lg">{creator?.name}</h1>
                  {creator?.isVerified && <VerifiedBadge size={24} variant="gold" />}
                </div>
                <p className="text-sm md:text-base text-white/50 mb-2">@{creator?.slug}</p>
                
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm font-semibold text-white/80 mb-4">
                  <span>{videos.length} Videos</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span>{followerCount !== null ? followerCount.toLocaleString() : "0"} Followers</span>
                </div>
              </div>

              {/* PRIMARY ACTIONS */}
              <div className="flex items-center gap-2 w-full md:w-auto pb-2">
                {!isOwner && (
                  <>
                    <button onClick={async () => {
                      if (!userId) return router.push("/login");
                      await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, creatorId: creator?.id }) });
                      setFollowerCount((c) => (c || 0) + 1);
                      alert("Followed creator!");
                    }} className="flex-1 md:flex-none justify-center bg-white text-black font-bold px-8 py-3 rounded-xl text-sm transition hover:scale-105 shadow-xl">
                      Follow
                    </button>
                    {premiumData?.enabled && (
                      hasSub ? <div className="flex-1 md:flex-none justify-center bg-green-500/10 text-green-400 border border-green-500/30 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2"><Sparkles size={16} /> Member</div>
                      : <button onClick={handleSubscribe} disabled={checkoutLoading} className="flex-1 md:flex-none justify-center bg-yellow-500 text-black hover:bg-yellow-400 px-6 py-3 rounded-xl text-sm font-bold transition shadow-xl flex items-center gap-2"><Sparkles size={16} /> {checkoutLoading ? "..." : `Join $${(premiumData.price_cents / 100).toFixed(2)}/mo`}</button>
                    )}
                    <Link href={`/messages/${creator?.ownerUserId}`} className="p-3 bg-white/10 border border-white/20 hover:bg-white/20 rounded-xl transition flex-shrink-0">
                      <MessageCircle size={20} />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* BIO */}
            {creator?.description && (
              <p className="text-center md:text-left text-sm md:text-base text-white/70 max-w-3xl mb-8 leading-relaxed">
                {creator.description}
              </p>
            )}

            {/* SLEEK FLUID TABS */}
            <div className="flex w-full border-b border-white/10 mb-8 overflow-x-auto scrollbar-hide">
              <button onClick={() => setTab("home")} className={`flex-1 min-w-[80px] pb-3 text-sm font-bold transition-all border-b-2 ${tab === "home" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}>Home</button>
              <button onClick={() => setTab("videos")} className={`flex-1 min-w-[80px] pb-3 text-sm font-bold transition-all border-b-2 ${tab === "videos" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}>Videos</button>
              {premiumData?.enabled && <button onClick={() => setTab("premium")} className={`flex-1 min-w-[80px] pb-3 text-sm font-bold transition-all border-b-2 flex justify-center items-center gap-1.5 ${tab === "premium" ? "border-yellow-500 text-yellow-500" : "border-transparent text-white/40 hover:text-white"}`}><Sparkles size={14}/> Premium</button>}
              {products.length > 0 && <button onClick={() => setTab("shop")} className={`flex-1 min-w-[80px] pb-3 text-sm font-bold transition-all border-b-2 flex justify-center items-center gap-1.5 ${tab === "shop" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}><ShoppingBag size={14}/> Shop</button>}
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 md:px-8 py-2 min-h-[50vh]">
            {/* HOME TAB */}
            {tab === "home" && (
              <div className="space-y-12">
                {latest && (
                  <div className="relative rounded-3xl overflow-hidden group cursor-pointer" onClick={() => handleVideoClick(latest)}>
                    <div className="absolute inset-0 opacity-30 blur-[100px] scale-110 pointer-events-none"><img src={latest.posterUrl} alt="" className="w-full h-full object-cover" /></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 p-4 md:p-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl">
                      <div className="w-full md:w-[55%] aspect-video rounded-2xl overflow-hidden bg-black flex-shrink-0 relative shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                        <img src={latest.posterUrl} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition duration-700 ${latest.access_type && latest.access_type !== "free" && !hasSub ? 'blur-sm opacity-60' : ''}`} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {latest.access_type && latest.access_type !== "free" && !hasSub ? <div className="bg-black/60 px-6 py-4 rounded-2xl flex flex-col items-center"><Lock size={32} className="text-red-500 mb-2" /><span className="text-sm font-bold text-white">PREMIUM</span></div>
                          : <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"><Play size={36} fill="white" className="text-white ml-1" /></div>}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center py-4">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-3 drop-shadow-md">{latest.type} · LATEST DROP</p>
                        <h3 className="text-2xl md:text-4xl font-black mb-4 leading-tight drop-shadow-lg group-hover:text-red-400 transition-colors">{latest.title}</h3>
                        <p className="text-sm md:text-base text-white/70 line-clamp-3 leading-relaxed mb-6">{latest.description}</p>
                        <div className="flex items-center gap-3">
                           <span className="px-4 py-2 bg-white text-black font-bold text-sm rounded-lg group-hover:scale-105 transition-transform">Watch Now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {freeVideos.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5"><h2 className="text-xl md:text-2xl font-black">Recent Uploads</h2><button onClick={() => setTab("videos")} className="text-sm font-bold text-white/50 hover:text-white transition">View All</button></div>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-6">
                      {freeVideos.slice(0, 6).map(v => (
                        <div key={v.id} onClick={() => handleVideoClick(v)} className="flex-shrink-0 w-[220px] md:w-[300px] cursor-pointer group">
                          <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-3 relative border border-white/5">
                            <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition"></div>
                          </div>
                          <p className="text-sm md:text-base font-bold line-clamp-2 mb-1 group-hover:text-red-400 transition-colors">{v.title}</p>
                          <p className="text-xs text-white/40">{v.viewCount?.toLocaleString() || 0} views</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {products.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5"><h2 className="text-xl md:text-2xl font-black flex items-center gap-2"><ShoppingBag size={22} className="text-red-500"/> Creator Shop</h2><button onClick={() => setTab("shop")} className="text-sm font-bold text-white/50 hover:text-white transition">Visit Shop</button></div>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-6">
                      {products.slice(0, 4).map(p => (
                        <div key={p.id} onClick={() => handleBuyProduct(p.id)} className="flex-shrink-0 w-[160px] md:w-[200px] cursor-pointer group">
                          <div className="aspect-square rounded-2xl overflow-hidden bg-[#0f0f12] mb-3 relative border border-white/5">
                            <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-black text-green-400 shadow-lg">${(p.price_cents / 100).toFixed(2)}</div>
                          </div>
                          <p className="text-sm font-bold line-clamp-1 group-hover:text-white text-white/80">{p.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIDEOS TAB */}
            {tab === "videos" && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-black">All Content</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                      <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-white/30" />
                    </div>
                    <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-xl border border-white/10">
                      <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><Grid3x3 size={16} /></button>
                      <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"}`}><List size={16} /></button>
                    </div>
                  </div>
                </div>

                {freeVideos.length === 0 ? <p className="text-center text-white/50 py-16 text-sm">No videos found.</p>
                : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {freeVideos.map(v => (
                      <div key={v.id} onClick={() => handleVideoClick(v)} className="cursor-pointer group flex flex-col">
                        <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-3 relative border border-white/5 shadow-lg">
                          <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-white"><Eye size={10} className="inline mr-1" />{(v.viewCount || 0).toLocaleString()}</div>
                        </div>
                        <p className="text-sm md:text-base font-bold line-clamp-2 mb-1 group-hover:text-red-400 transition-colors">{v.title}</p>
                        <p className="text-xs text-white/40">{v.type}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {freeVideos.map(v => (
                      <div key={v.id} onClick={() => handleVideoClick(v)} className="flex items-center gap-4 p-3 rounded-xl bg-[#0f0f12] hover:bg-[#1c1c1e] transition cursor-pointer border border-white/5">
                        <div className="w-28 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0 relative"><img src={v.posterUrl} alt="" className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{v.title}</p><p className="text-xs text-white/40 mt-1">{v.type} · {(v.viewCount || 0).toLocaleString()} views</p></div>
                        <Play size={20} fill="white" className="text-white/40 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PREMIUM TAB */}
            {tab === "premium" && premiumData?.enabled && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-2xl font-black flex items-center gap-2"><Sparkles size={24} className="text-yellow-500" /> Premium Content</h2>
                    <p className="text-sm text-white/50 mt-1">Exclusive videos for your superfans.</p>
                  </div>
                  {!hasSub && <button onClick={handleSubscribe} className="bg-yellow-500 text-black hover:bg-yellow-400 px-8 py-3 rounded-xl text-sm font-bold shadow-xl transition hover:scale-105">Join for ${(premiumData.price_cents / 100).toFixed(2)}/mo</button>}
                </div>
                {premiumVideos.length === 0 ? <p className="text-center text-white/50 py-16 text-sm">No premium content yet.</p>
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {premiumVideos.map(v => {
                      const isLocked = !hasSub;
                      return (
                        <div key={v.id} onClick={() => !isLocked && handleVideoClick(v)} className={`relative group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-3 relative border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                            <img src={v.posterUrl} alt="" className={`w-full h-full object-cover transition duration-500 ${isLocked ? 'blur-md opacity-40' : 'group-hover:scale-105'}`} />
                            {isLocked && <div className="absolute inset-0 flex items-center justify-center"><div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2"><Lock size={16} className="text-yellow-500" /><span className="text-xs font-bold text-white tracking-wide">PREMIUM</span></div></div>}
                          </div>
                          <p className="text-sm md:text-base font-bold line-clamp-2 mb-1">{v.title}</p>
                          <p className="text-xs text-white/40">{v.type}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SHOP TAB */}
            {tab === "shop" && (
              <div>
                <div className="mb-8">
                   <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3"><ShoppingBag size={28} className="text-red-500"/> Creator Merch</h2>
                   <p className="text-sm text-white/50 mt-1">Support {creator?.name} by picking up some gear.</p>
                </div>
                {products.length === 0 ? <div className="text-center py-24 bg-[#0a0a0a] rounded-3xl border border-white/5"><ShoppingBag size={48} className="mx-auto text-white/20 mb-4" /><p className="text-white/50 text-lg">No products available yet.</p></div>
                : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((p) => (
                      <div key={p.id} className="group bg-[#0a0a0a] border border-white/5 rounded-2xl p-4 flex flex-col hover:border-white/20 transition hover:-translate-y-1 shadow-xl">
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#0f0f12] mb-4 relative">
                          <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        </div>
                        <h3 className="font-bold text-lg mb-1 truncate">{p.name}</h3>
                        <p className="text-sm text-white/50 mb-6 flex-1 line-clamp-2">{p.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                          <span className="text-xl font-black text-white">${(p.price_cents / 100).toFixed(2)}</span>
                          <button onClick={() => handleBuyProduct(p.id)} className="bg-white text-black font-bold px-5 py-2.5 rounded-xl text-sm hover:scale-105 transition shadow-lg">Buy Now</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="h-24" />
        </>
      )}
      <MobileBottomNav />

      {viewerIndex !== null && <ProfileReelViewer videos={freeVideos} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} author={{ name: creator?.name || "User", avatar: creator?.photoUrl || "", verified: creator?.isVerified || false, profileHref: `/podcaster/${creator?.slug}` }} />}

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0f0f12] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Edit Profile</h3><button onClick={() => setEditOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button></div>
              <label className="text-xs font-bold text-white/50 block mb-1">Display Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 mb-3 outline-none focus:border-red-600 text-sm" />
              <label className="text-xs font-bold text-white/50 block mb-1">Bio</label>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 mb-4 outline-none focus:border-red-600 resize-none text-sm" />
              <button onClick={saveEdit} className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3 rounded-xl transition text-sm">Save Changes</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DASHBOARD BOTTOM SHEET */}
      <AnimatePresence>
        {dashOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDashOpen(false)} className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed left-0 right-0 bottom-0 z-[501] bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-t-3xl md:max-w-md md:mx-auto md:rounded-3xl md:bottom-4 border-t md:border border-white/10 flex flex-col max-h-[85vh] shadow-2xl">
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-12 h-1.5 rounded-full bg-white/20" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e]">{creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{creator?.name?.[0]?.toUpperCase()}</div>}</div>
                  <div><p className="font-bold text-white leading-tight">{creator?.name}</p><p className="text-xs text-white/50 leading-tight">@{creator?.slug}</p></div>
                </div>
                <button onClick={() => setDashOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-6 overflow-y-auto scrollbar-hide">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-2 px-2 tracking-widest">Creator Tools</p>
                  <Link href="/studio" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-yellow-500/10 transition text-yellow-400 font-semibold"><Settings size={18} /><span className="text-sm">Creator Studio</span></Link>
                  <Link href="/profile/wallet" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-yellow-500/10 transition text-yellow-400 font-semibold"><Wallet size={18} /><span className="text-sm">Creator Wallet</span></Link>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-2 px-2 tracking-widest">Account</p>
                  <Link href="/orders" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition"><ShoppingBag size={18} className="text-white/70" /><span className="text-sm font-medium">My Orders</span></Link>
                  <Link href="/my-list" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition"><Bookmark size={18} className="text-white/70" /><span className="text-sm font-medium">My List</span></Link>
                  <div className="px-3 py-2 mt-2"><EnablePush /></div>
                  <button onClick={handleManageSubscription} disabled={portalLoading} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-left disabled:opacity-50"><Sparkles size={18} className="text-yellow-400" /><span className="text-sm font-medium">{portalLoading ? "Opening…" : "Manage Subscription"}</span></button>
                </div>
              </div>
              <div className="p-4 border-t border-white/5 shrink-0 pb-[env(safe-area-inset-bottom)]">
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition"><LogOut size={16} /> Log out</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
