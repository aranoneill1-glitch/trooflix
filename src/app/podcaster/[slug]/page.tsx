"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Play, Search, Lock, ShoppingBag, Sparkles, Plus, Settings, 
  Grid3x3, List, Eye, X, Camera, Bookmark, Wallet, LogOut, Loader2, 
  MessageCircle, Share, MoreHorizontal, BookOpen, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import EnablePush from "@/components/EnablePush";
import { getCachedCreators, getCachedUser, clearUserCache } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

type Video = {
  id: number;
  title: string;
  description?: string;
  duration?: string;
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

type Tab = "home" | "videos" | "podcasts" | "shop" | "about";

export default function CreatorProfilePage() {
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
  
  const [tab, setTab] = useState<Tab>("home");

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
      
      const allVids = [...cVids, ...newReels].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
        return bt - at;
      });

      setVideos(allVids);
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

  const saveEdit = async () => {
    if (!creator?.ownerUserId) return;
    const res = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: creator.ownerUserId, displayName: editName.trim(), bio: editBio.trim() }) });
    if (res.ok) { setEditOpen(false); loadData(); }
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

  const logout = async () => { const supabase = createClient(); await supabase.auth.signOut(); clearUserCache(); router.push("/"); };

  const videosOnly = videos.filter(v => v.type === "Documentary" || v.type === "Movie");
  const podcastsOnly = videos.filter(v => v.type === "Podcast");
  const latestVideo = videos[0];
  
  const isOwner = userId && creator?.ownerUserId === userId;

  const roles = [];
  if (videosOnly.length > 0) roles.push("Filmmaker");
  if (podcastsOnly.length > 0) roles.push("Podcaster");
  roles.push("Creator");
  const tagline = roles.join(" · ");

  if (notFound) return <main className="min-h-screen bg-[#080808] text-white"><div className="pt-32 text-center"><p className="text-white/50 mb-4">Creator not found</p><Link href="/creators" className="text-[#E53945] hover:underline">← Back</Link></div><MobileBottomNav /></main>;
  if (loading) return <main className="min-h-screen bg-[#080808] flex items-center justify-center"><Loader2 className="animate-spin text-[#E53945]" size={32} /></main>;

  return (
    <main className="min-h-screen bg-[#080808] text-white pb-24 font-sans">
      
      {/* BANNER SECTION (Now edge-to-edge at the top) */}
      <div className="relative w-full h-[35vh] md:h-[45vh]">
        <img src={creator?.heroBackdropUrl || latestVideo?.backdropUrl || ""} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/20 to-black/60" />
        
        {/* Top Controls (Using Safe Area Padding) */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-6 flex justify-between items-center z-20">
          <button onClick={() => router.back()} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-lg border border-white/10">
            <ChevronLeft size={24} />
          </button>
          <button className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-lg border border-white/10">
            <Share size={20} />
          </button>
        </div>
      </div>

      {/* PROFILE INFO */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 relative z-30 -mt-20 md:-mt-24">
        
        {/* Avatar */}
        <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-[#080808] bg-[#202020] flex items-center justify-center shadow-2xl group mb-4">
          {creator?.photoUrl ? <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl md:text-5xl font-black">{creator?.name?.[0]?.toUpperCase()}</span>}
          {isOwner && (
            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              {uploading ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" size={24} />}
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />

        {/* Name & Tagline */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{creator?.name}</h1>
          {creator?.isVerified && <VerifiedBadge size={24} variant="gold" />}
        </div>
        <p className="text-sm md:text-base text-white/60 font-medium mb-4">{tagline}</p>
        
        {/* Bio */}
        <p className="text-sm md:text-base text-white/80 leading-relaxed mb-6">
          {creator?.description}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div>
            <p className="text-xl md:text-2xl font-black">{videosOnly.length}</p>
            <p className="text-xs text-white/50">Films & Docs</p>
          </div>
          <div>
            <p className="text-xl md:text-2xl font-black">{podcastsOnly.length}</p>
            <p className="text-xs text-white/50">Podcast Episodes</p>
          </div>
          <div>
            <p className="text-xl md:text-2xl font-black">{followerCount !== null ? followerCount.toLocaleString() : "0"}</p>
            <p className="text-xs text-white/50">Followers</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-8">
          {!isOwner && (
            <>
              <button onClick={async () => {
                if (!userId) return router.push("/login");
                await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, creatorId: creator?.id }) });
                setFollowerCount((c) => (c || 0) + 1);
              }} className="flex-1 md:flex-none justify-center bg-[#E53945] hover:bg-[#E53945]/90 text-white font-bold px-6 py-3 rounded-full text-sm transition shadow-lg flex items-center gap-2">
                <Plus size={18} /> Follow
              </button>
              <Link href={`/messages/${creator?.ownerUserId}`} className="flex-1 md:flex-none justify-center bg-[#1c1c1e] border border-[#303030] text-white font-semibold px-6 py-3 rounded-full text-sm transition hover:bg-[#202020] flex items-center gap-2">
                <MessageCircle size={18} /> Message
              </Link>
              {premiumData?.enabled && (
                hasSub ? <div className="flex-1 md:flex-none justify-center bg-green-500/10 text-green-400 border border-green-500/30 px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2"><Sparkles size={18} /> Member</div>
                : <button onClick={handleSubscribe} disabled={checkoutLoading} className="flex-1 md:flex-none justify-center bg-[#F5B041] text-black hover:bg-[#F5B041]/90 px-6 py-3 rounded-full text-sm font-bold transition shadow-lg flex items-center gap-2"><Sparkles size={18} /> Join ${(premiumData.price_cents / 100).toFixed(2)}/mo</button>
              )}
              <button className="p-3 bg-[#1c1c1e] border border-[#303030] hover:bg-[#202020] rounded-full text-white transition">
                <MoreHorizontal size={18} />
              </button>
            </>
          )}
        </div>

        {/* TABS */}
        <div className="flex w-full border-b border-[#303030] mb-6 overflow-x-auto scrollbar-hide gap-6">
          <button onClick={() => setTab("home")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${tab === "home" ? "border-[#E53945] text-white" : "border-transparent text-white/50 hover:text-white"}`}>Home</button>
          <button onClick={() => setTab("videos")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${tab === "videos" ? "border-[#E53945] text-white" : "border-transparent text-white/50 hover:text-white"}`}>Videos</button>
          <button onClick={() => setTab("podcasts")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${tab === "podcasts" ? "border-[#E53945] text-white" : "border-transparent text-white/50 hover:text-white"}`}>Podcasts</button>
          <button onClick={() => setTab("shop")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${tab === "shop" ? "border-[#E53945] text-white" : "border-transparent text-white/50 hover:text-white"}`}>Shop</button>
          <button onClick={() => setTab("about")} className={`pb-3 text-sm font-bold transition-all border-b-2 ${tab === "about" ? "border-[#E53945] text-white" : "border-transparent text-white/50 hover:text-white"}`}>About</button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 pb-12">
        
        {/* HOME TAB */}
        {tab === "home" && (
          <div className="space-y-8">
            {latestVideo && (
              <div>
                <h2 className="text-xl font-black mb-4">Latest Episode</h2>
                <div onClick={() => handleVideoClick(latestVideo)} className="group cursor-pointer flex flex-col md:flex-row gap-4 bg-[#171717] rounded-2xl p-4 border border-[#303030] hover:border-[#E53945]/50 transition">
                  <div className="w-full md:w-1/2 aspect-video rounded-xl overflow-hidden relative bg-[#202020]">
                    <img src={latestVideo.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/20">
                        <Play size={24} fill="white" className="text-white ml-1" />
                      </div>
                    </div>
                    {latestVideo.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white">
                        {latestVideo.duration}
                      </div>
                    )}
                  </div>
                  <div className="w-full md:w-1/2 py-2">
                    <span className="text-[10px] font-bold text-[#E53945] uppercase tracking-wider mb-2 block">{latestVideo.type}</span>
                    <h3 className="text-xl font-bold mb-2 leading-tight group-hover:text-[#E53945] transition">{latestVideo.title}</h3>
                    <p className="text-xs text-white/40 mb-3">Episode 12 · {new Date(latestVideo.createdAt || Date.now()).toLocaleDateString()}</p>
                    <p className="text-sm text-white/60 line-clamp-3 leading-relaxed">{latestVideo.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Uploads */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">Recent Uploads</h2>
                <button onClick={() => setTab("videos")} className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1">View All <ChevronRight size={14}/></button>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                {videos.slice(0, 6).map(v => (
                  <div key={v.id} onClick={() => handleVideoClick(v)} className="flex-shrink-0 w-[240px] md:w-[280px] cursor-pointer group">
                    <div className="aspect-video rounded-xl overflow-hidden bg-[#202020] mb-3 relative border border-[#303030]">
                      <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    </div>
                    <p className="text-sm font-bold line-clamp-2 group-hover:text-[#E53945] transition">{v.title}</p>
                    <p className="text-xs text-white/40 mt-1">{v.type} · {(v.viewCount || 0).toLocaleString()} views</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIDEOS TAB */}
        {tab === "videos" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {videosOnly.length === 0 ? <p className="text-white/50 text-sm py-12">No videos found.</p> : videosOnly.map(v => (
              <div key={v.id} onClick={() => handleVideoClick(v)} className="cursor-pointer group">
                <div className="aspect-video rounded-xl overflow-hidden bg-[#202020] mb-2 relative border border-[#303030]">
                  <img src={v.posterUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                </div>
                <p className="text-sm font-bold truncate group-hover:text-[#E53945]">{v.title}</p>
              </div>
            ))}
          </div>
        )}

        {/* PODCASTS TAB */}
        {tab === "podcasts" && (
          <div className="space-y-4">
            {podcastsOnly.length === 0 ? <p className="text-white/50 text-sm py-12">No podcasts found.</p> : podcastsOnly.map(v => (
              <div key={v.id} onClick={() => handleVideoClick(v)} className="flex gap-4 p-3 rounded-xl bg-[#171717] border border-[#303030] hover:border-[#E53945]/50 cursor-pointer group">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#202020] flex-shrink-0 relative">
                  <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={16} fill="white" className="text-white/70" />
                  </div>
                </div>
                <div className="flex-1 py-1">
                  <p className="text-sm font-bold truncate group-hover:text-[#E53945]">{v.title}</p>
                  <p className="text-xs text-white/40 mt-1">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SHOP TAB */}
        {tab === "shop" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map(p => (
              <div key={p.id} onClick={() => handleBuyProduct(p.id)} className="cursor-pointer group bg-[#171717] rounded-xl p-3 border border-[#303030]">
                <div className="aspect-square rounded-lg overflow-hidden bg-[#202020] mb-3 relative">
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-bold truncate">{p.name}</p>
                <p className="text-xs text-[#E53945] font-bold mt-1">${(p.price_cents / 100).toFixed(2)}</p>
              </div>
            ))}
            {books.map(b => (
              <div key={b.id} className="cursor-pointer group bg-[#171717] rounded-xl p-3 border border-[#303030]">
                <div className="aspect-square rounded-lg overflow-hidden bg-[#202020] mb-3 relative">
                  <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-bold truncate">{b.title}</p>
                <p className="text-xs text-[#E53945] font-bold mt-1">${(b.price_cents / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ABOUT TAB */}
        {tab === "about" && (
          <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
            {creator?.description}
          </div>
        )}
      </div>

      <MobileBottomNav />

      {/* EDIT PROFILE MODAL (Owner Only) */}
      <AnimatePresence>
        {editOpen && (
          <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#171717] border border-[#303030] rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Edit Profile</h3><button onClick={() => setEditOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={18} /></button></div>
              <label className="text-xs font-bold text-white/50 block mb-1">Display Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-[#202020] border border-[#303030] rounded-xl px-3 py-2.5 mb-3 outline-none focus:border-[#E53945] text-sm text-white" />
              <label className="text-xs font-bold text-white/50 block mb-1">Bio</label>
              <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} className="w-full bg-[#202020] border border-[#303030] rounded-xl px-3 py-2.5 mb-4 outline-none focus:border-[#E53945] resize-none text-sm text-white" />
              <button onClick={saveEdit} className="w-full bg-[#E53945] hover:bg-[#E53945]/90 text-white font-bold py-3 rounded-xl transition text-sm">Save Changes</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
