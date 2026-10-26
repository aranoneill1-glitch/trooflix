"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Play, Search, Lock, ShoppingBag, Sparkles, Plus, Settings, 
  Grid3x3, List, Eye, X, Camera, Bookmark, Wallet, LogOut, Loader2, MessageCircle, Share, MoreHorizontal, BookOpen, ChevronRight 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
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

type ViewMode = "home" | "library" | "store" | "premium";

export default function UnifiedCreatorHub() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [videoFilter, setVideoFilter] = useState<string>("all");
  const [gridMode, setGridMode] = useState<"grid" | "list">("grid");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const [premiumData, setPremiumData] = useState<{ enabled: boolean; price_cents: number } | null>(null);
  const [hasSub, setHasSub] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Owner Modals
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
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

      const [vData, fData, pData, premData, reelsData, subData, booksData] = await Promise.all([
        fetch(`/api/creators/videos?creatorId=${found.id}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/follow-count?creator_id=${found.id}`).then((r) => r.json()),
        fetch(`/api/creator/products?creatorId=${found.id}`).then((r) => r.json()),
        fetch(`/api/creator/public-premium?creatorId=${found.id}`).then((r) => r.json()),
        found.ownerUserId ? fetch(`/api/user/posts?userId=${found.ownerUserId}`).then(r => r.json()).catch(() => ({ posts: [] })) : Promise.resolve({ posts: [] }),
        (user && found.id) ? fetch(`/api/creator/check-sub?userId=${user.id}&creatorId=${found.id}`).then(r => r.json()).catch(() => ({ hasSub: false })) : Promise.resolve({ hasSub: false }),
        fetch(`/api/books`, { cache: "no-store" }).then(r => r.json()).catch(() => []),
      ]);

      const cVids = Array.isArray(vData.videos) ? vData.videos : [];
      const uPosts = Array.isArray(reelsData.posts) ? reelsData.posts : [];
      const existingIds = new Set(cVids.map((v: any) => v.id));
      const newReels = uPosts.filter((v: any) => !existingIds.has(v.id));
      
      setVideos([...cVids, ...newReels]);
      setFollowerCount(fData.count ?? 0);
      setProducts(pData.products || []);
      
      const allBooks = Array.isArray(booksData) ? booksData : [];
      setBooks(allBooks.filter((b: any) => String(b.creator_id) === String(found.id)));

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

  const handleBuyBook = async (bookId: number) => {
    if (!userId) return router.push("/login");
    try {
      const res = await fetch("/api/stripe/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, bookId }) });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "Checkout not available yet");
    } catch { alert("Network error"); }
  };

  const saveEdit = async () => {
    if (!creator?.ownerUserId) return;
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: creator.ownerUserId, displayName: editName.trim(), bio: editBio.trim() }),
    });
    if (res.ok) {
      setEditOpen(false);
      loadData();
    }
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

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    freeVideos.forEach(v => { if (v.type) types.add(v.type); });
    return Array.from(types);
  }, [freeVideos]);

  const displayedFreeVideos = videoFilter === "all" 
    ? freeVideos 
    : freeVideos.filter(v => v.type?.toLowerCase() === videoFilter.toLowerCase());

  if (notFound) return (
    <main className="min-h-screen bg-black text-white"><TopBar /><div className="pt-32 text-center"><p className="text-white/50 mb-4">Creator not found</p><Link href="/creators" className="text-red-500 hover:underline">← Back</Link></div><MobileBottomNav /></main>
  );

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={32} /></main>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24 lg:pb-0">
      <TopBar />

      {/* CINEMATIC HERO AT THE VERY TOP */}
      {latest && (
        <div className="relative w-full h-[45vh] md:h-[60vh] overflow-hidden group cursor-pointer" onClick={() => handleVideoClick(latest)}>
          <img src={latest.backdropUrl || latest.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-700" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/95 via-[#050505]/40 to-transparent" />
          
          <div className="relative z-10 flex flex-col justify-end h-full max-w-5xl mx-auto px-4 md:px-8 pb-32 md:pb-40">
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-xs md:text-sm tracking-[0.3em] text-red-500 font-bold mb-3 uppercase">
              {creator?.name || "TROOFLIX"} PRESENTS
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-4 tracking-tight drop-shadow-2xl">
              {latest.title}
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex items-center gap-3 text-sm md:text-base mb-4 flex-wrap">
              <span className="text-white/80">{new Date(latest.createdAt || Date.now()).getFullYear()}</span>
              <span className="border border-white/40 px-1.5 py-0.5 text-xs rounded">TV-MA</span>
              <span className="text-white/80">{latest.type}</span>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex gap-3">
              <button className="flex items-center gap-2 bg-white text-black font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-xl shadow-xl hover:bg-gray-200 transition-all active:scale-95">
                <Play size={20} fill="currentColor" /> Watch Now
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* HEADER SECTION (Overlapping the Hero) */}
      <div className={`max-w-5xl mx-auto px-4 md:px-8 relative z-20 ${latest ? "-mt-20 md:-mt-28" : "pt-24 md:pt-28"}`}>
        <div className="flex items-start gap-4 md:gap-6">
          <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-[#050505] bg-[#1c1c1e] flex items-center justify-center flex-shrink-0 shadow-xl group">
            {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl md:text-5xl font-black">{creator?.name?.[0]?.toUpperCase()}</span>}
            {isOwner && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                {uploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" size={24} />}
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />

          <div className="flex-1 pt-1 md:pt-2 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight truncate">{creator?.name}</h1>
              {creator?.isVerified && <VerifiedBadge size={18} variant="gold" />}
            </div>
            <p className="text-sm md:text-base text-white/50 mb-3">@{creator?.slug}</p>
            
            <div className="flex items-center gap-3 md:gap-5 text-sm md:text-base text-white/80 font-medium">
              <span><strong className="text-white">{videos.length}</strong> Videos</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span><strong className="text-white">{followerCount !== null ? followerCount.toLocaleString() : "0"}</strong> Followers</span>
            </div>
          </div>
        </div>

        {/* BIO & ACTIONS */}
        {creator?.description && (
          <p className="text-sm md:text-base text-white/80 max-w-3xl leading-relaxed mt-4 whitespace-pre-wrap">{creator.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-4 mb-6">
          {!isOwner && (
            <>
              <button onClick={async () => {
                if (!userId) return router.push("/login");
                await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, creatorId: creator?.id }) });
                setFollowerCount((c) => (c || 0) + 1);
              }} className="flex-1 md:flex-none justify-center bg-white text-black font-bold px-6 py-2.5 rounded-lg text-sm transition hover:bg-gray-200 shadow-md">
                Follow
              </button>
              <Link href={`/messages/${creator?.ownerUserId}`} className="flex-1 md:flex-none justify-center bg-white/10 text-white border border-white/20 font-semibold px-4 py-2.5 rounded-lg text-sm transition hover:bg-white/20 flex items-center gap-2">
                <MessageCircle size={16} /> Message
              </Link>
              {premiumData?.enabled && (
                hasSub ? <div className="flex-1 md:flex-none justify-center bg-green-500/10 text-green-400 border border-green-500/30 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Sparkles size={16} /> Member</div>
                : <button onClick={handleSubscribe} disabled={checkoutLoading} className="flex-1 md:flex-none justify-center bg-yellow-500 text-black hover:bg-yellow-400 px-4 py-2.5 rounded-lg text-sm font-bold transition shadow-md flex items-center gap-2"><Sparkles size={16} /> {checkoutLoading ? "..." : `Join $${(premiumData.price_cents / 100).toFixed(2)}/mo`}</button>
              )}
            </>
          )}
          {isOwner && (
            <div className="flex gap-2">
              <button onClick={() => setEditOpen(true)} className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"><Settings size={16} /> Edit Profile</button>
              <button onClick={() => setDashOpen(true)} className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition"><MoreHorizontal size={16} /> Dashboard</button>
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="flex w-full border-b border-white/10 mb-6 overflow-x-auto scrollbar-hide gap-6 md:gap-12">
          <button onClick={() => setViewMode("home")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${viewMode === "home" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}>Home</button>
          <button onClick={() => setViewMode("library")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${viewMode === "library" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}>Library</button>
          <button onClick={() => setViewMode("store")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${viewMode === "store" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white"}`}>Store</button>
          {premiumData?.enabled && <button onClick={() => setViewMode("premium")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${viewMode === "premium" ? "border-yellow-500 text-yellow-500" : "border-transparent text-white/40 hover:text-white"}`}>Premium</button>}
        </div>
      </div>

      <div className="min-h-[50vh]">
        
        {/* === HOME TAB (Rows Only, Hero is at the top now) === */}
        {viewMode === "home" && (
          <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-10 pt-4">
            <CreatorRow title="Recent Uploads" items={freeVideos} onSelect={handleVideoClick} />
            {premiumVideos.length > 0 && <CreatorRow title="Premium Exclusives" items={premiumVideos} onSelect={handleVideoClick} isPremium />}
            
            {/* MERCH & BOOKS ROW */}
            {(products.length > 0 || books.length > 0) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-black">Merch & Books</h2>
                  <button onClick={() => setViewMode("store")} className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1">View All <ChevronRight size={14}/></button>
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                  {products.map(p => (
                    <div key={`p-${p.id}`} onClick={() => handleBuyProduct(p.id)} className="flex-shrink-0 w-[140px] md:w-[180px] cursor-pointer group">
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#0f0f12] mb-2 relative border border-white/5">
                        <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[9px] font-bold text-white">MERCH</div>
                      </div>
                      <p className="text-sm font-bold truncate">{p.name}</p>
                    </div>
                  ))}
                  {books.map(b => (
                    <div key={`b-${b.id}`} onClick={() => handleBuyBook(b.id)} className="flex-shrink-0 w-[140px] md:w-[180px] cursor-pointer group">
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#0f0f12] mb-2 relative border border-white/5">
                        <img src={b.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[9px] font-bold text-white">BOOK</div>
                      </div>
                      <p className="text-sm font-bold truncate">{b.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === LIBRARY TAB === */}
        {viewMode === "library" && (
          <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold">All Content</h2>
              <div className="flex items-center gap-3">
                <div className="relative w-full md:w-56">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input type="text" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1c1c1e] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-white/30" />
                </div>
                <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg border border-white/10">
                  <button onClick={() => setGridMode("grid")} className={`p-1.5 rounded transition ${gridMode === "grid" ? "bg-white/15 text-white" : "text-white/40"}`}><Grid3x3 size={16} /></button>
                  <button onClick={() => setGridMode("list")} className={`p-1.5 rounded transition ${gridMode === "list" ? "bg-white/15 text-white" : "text-white/40"}`}><List size={16} /></button>
                </div>
              </div>
            </div>

            {availableTypes.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
                <button onClick={() => setVideoFilter("all")} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${videoFilter === "all" ? "bg-white text-black border-white" : "bg-[#1c1c1e] text-white/60 border-white/10 hover:text-white"}`}>All</button>
                {availableTypes.map((type) => (
                  <button key={type} onClick={() => setVideoFilter(type)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border capitalize ${videoFilter === type ? "bg-white text-black border-white" : "bg-[#1c1c1e] text-white/60 border-white/10 hover:text-white"}`}>{type}s</button>
                ))}
              </div>
            )}

            {displayedFreeVideos.length === 0 ? <p className="text-center text-white/50 py-16 text-sm">No videos found.</p>
            : gridMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedFreeVideos.map(v => (
                  <div key={v.id} onClick={() => handleVideoClick(v)} className="cursor-pointer group flex flex-col">
                    <div className="aspect-video rounded-lg overflow-hidden bg-[#0f0f12] mb-2 relative border border-white/5">
                      <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" />
                      <div className="absolute bottom-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"><Eye size={10} className="inline mr-1" />{(v.viewCount || 0).toLocaleString()}</div>
                    </div>
                    <p className="text-sm font-semibold line-clamp-2 mb-1 group-hover:text-white text-white/90">{v.title}</p>
                    <p className="text-xs text-white/40">{v.type}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedFreeVideos.map(v => (
                  <div key={v.id} onClick={() => handleVideoClick(v)} className="flex items-center gap-4 p-3 rounded-lg bg-[#0f0f12] hover:bg-[#1c1c1e] transition cursor-pointer border border-white/5">
                    <div className="w-20 h-12 rounded overflow-hidden bg-black flex-shrink-0 relative"><img src={v.posterUrl} alt="" className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate text-white/90">{v.title}</p><p className="text-xs text-white/40 mt-1">{v.type} · {(v.viewCount || 0).toLocaleString()} views</p></div>
                    <Play size={16} fill="white" className="text-white/40 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === STORE TAB === */}
        {viewMode === "store" && (
          <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4">
            <div className="mb-8">
              <h2 className="text-2xl font-black flex items-center gap-2"><ShoppingBag size={24} className="text-red-500"/> Creator Store</h2>
              <p className="text-sm text-white/50 mt-1">Support {creator?.name} by picking up merch or their books.</p>
            </div>

            {(products.length === 0 && books.length === 0) ? (
              <div className="text-center py-24 bg-[#0a0a0a] rounded-2xl border border-white/5"><ShoppingBag size={40} className="mx-auto text-white/20 mb-3" /><p className="text-white/50 text-sm">No products available yet.</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <div key={`p-${p.id}`} className="group bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex flex-col hover:border-white/20 transition">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#0f0f12] mb-3 relative">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">Merch</div>
                    </div>
                    <h3 className="font-bold text-sm mb-1 truncate">{p.name}</h3>
                    <p className="text-xs text-white/50 mb-3 flex-1 line-clamp-2">{p.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      <span className="text-base font-black">${(p.price_cents / 100).toFixed(2)}</span>
                      <button onClick={() => handleBuyProduct(p.id)} className="bg-white text-black font-bold px-3 py-1.5 rounded-lg text-xs hover:scale-105 transition">Buy</button>
                    </div>
                  </div>
                ))}
                {books.map(b => (
                  <div key={`b-${b.id}`} className="group bg-[#0a0a0a] border border-white/5 rounded-xl p-3 flex flex-col hover:border-white/20 transition">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[#0f0f12] mb-3 relative">
                      <img src={b.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1"><BookOpen size={10} /> Book</div>
                    </div>
                    <h3 className="font-bold text-sm mb-1 truncate">{b.title}</h3>
                    <p className="text-xs text-white/50 mb-3 flex-1 line-clamp-2">{b.description}</p>
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                      <span className="text-base font-black">${(b.price_cents / 100).toFixed(2)}</span>
                      <button onClick={() => handleBuyBook(b.id)} className="bg-white text-black font-bold px-3 py-1.5 rounded-lg text-xs hover:scale-105 transition">Buy</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === PREMIUM TAB === */}
        {viewMode === "premium" && premiumData?.enabled && (
          <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles size={20} className="text-yellow-500" /> Premium Content</h2>
                <p className="text-sm text-white/50 mt-1">Exclusive videos for {creator?.name}'s VIP members.</p>
              </div>
              {!hasSub && <button onClick={handleSubscribe} className="bg-yellow-500 text-black hover:bg-yellow-400 px-4 py-2 rounded-lg text-sm font-bold shadow-lg">Join for ${(premiumData.price_cents / 100).toFixed(2)}/mo</button>}
            </div>
            {premiumVideos.length === 0 ? <p className="text-center text-white/50 py-16 text-sm">No premium content yet.</p>
            : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {premiumVideos.map(v => {
                  const isLocked = !hasSub;
                  return (
                    <div key={v.id} onClick={() => !isLocked && handleVideoClick(v)} className={`relative group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <div className="aspect-video rounded-lg overflow-hidden bg-[#0f0f12] mb-2 relative border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                        <img src={v.posterUrl} alt="" className={`w-full h-full object-cover transition duration-500 ${isLocked ? 'blur-md opacity-50' : 'group-hover:scale-105'}`} />
                        {isLocked && <div className="absolute inset-0 flex items-center justify-center"><div className="bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5"><Lock size={14} className="text-yellow-500" /><span className="text-[10px] font-bold text-white uppercase tracking-wider">Premium</span></div></div>}
                      </div>
                      <p className="text-sm font-semibold line-clamp-2 mb-1 text-white/90">{v.title}</p>
                      <p className="text-xs text-white/40">{v.type}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-16" />
      <MobileBottomNav />

      {/* EDIT PROFILE MODAL (Owner Only) */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0f0f12] rounded-2xl p-6 w-full max-w-md border border-white/10">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Edit Profile</h3><button onClick={() => setEditOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button></div>
              <label className="text-xs font-bold text-white/50 block mb-1">Display Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 mb-3 outline-none focus:border-red-600 text-sm" />
              <label className="text-xs font-bold text-white/50 block mb-1">Bio</label>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 mb-4 outline-none focus:border-red-600 resize-none text-sm" />
              <button onClick={saveEdit} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition text-sm">Save Changes</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DASHBOARD BOTTOM SHEET (Owner Only) */}
      <AnimatePresence>
        {dashOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDashOpen(false)} className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed left-0 right-0 bottom-0 z-[501] bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-t-3xl md:max-w-md md:mx-auto md:rounded-3xl md:bottom-4 border-t md:border border-white/10 flex flex-col max-h-[85vh]">
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
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-2 px-2">Account</p>
                  <Link href="/studio" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition"><Settings size={16} className="text-white/70" /><span className="text-sm font-medium">Creator Studio</span></Link>
                  <Link href="/orders" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition"><ShoppingBag size={16} className="text-white/70" /><span className="text-sm font-medium">My Orders</span></Link>
                  <Link href="/my-list" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition"><Bookmark size={16} className="text-white/70" /><span className="text-sm font-medium">My List</span></Link>
                  <Link href="/profile/wallet" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition"><Wallet size={16} className="text-white/70" /><span className="text-sm font-medium">Wallet</span></Link>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase mb-2 px-2">Billing</p>
                  <div className="px-3 py-2"><EnablePush /></div>
                  <button onClick={handleManageSubscription} disabled={portalLoading} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition text-left disabled:opacity-50"><Sparkles size={16} className="text-yellow-400" /><span className="text-sm font-medium">{portalLoading ? "Opening…" : "Manage Subscription"}</span></button>
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

// Helper component for creator rows
function CreatorRow({ title, items, onSelect, isPremium = false }: { title: string; items: Video[]; onSelect: (v: Video) => void; isPremium?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
          {isPremium && <Sparkles size={20} className="text-yellow-500" />}
          {title}
        </h2>
        <button className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1">View All <ChevronRight size={14}/></button>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
        {items.slice(0, 10).map(v => {
          const isLocked = isPremium;
          return (
            <div key={v.id} onClick={() => !isLocked && onSelect(v)} className={`flex-shrink-0 w-[200px] md:w-[280px] group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <div className="aspect-video rounded-xl overflow-hidden bg-[#0f0f12] mb-2 relative border border-white/5 group-hover:border-white/20 transition">
                <img src={v.posterUrl} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${isLocked ? 'blur-md opacity-50' : ''}`} />
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
                      <Lock size={14} className="text-yellow-500" /><span className="text-[10px] font-bold text-white uppercase tracking-wider">Premium</span>
                    </div>
                  </div>
                )}
                {!isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                      <Play size={20} fill="white" className="text-white ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm font-bold truncate group-hover:text-white text-white/90">{v.title}</p>
              <p className="text-xs text-white/40 mt-1">{v.type} · {(v.viewCount || 0).toLocaleString()} views</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
