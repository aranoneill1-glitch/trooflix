"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Sparkles, Wallet, List, Package, Star, Clock, ChevronRight, CheckCircle2, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { getCachedUser } from "@/lib/cache";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import { getAllProgress } from "@/lib/progress";
import { createClient } from "@/utils/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  rating: string;
  duration: string;
  creatorId?: number | null;
  progressSeconds?: number;
  progressDuration?: number;
  chapters?: any[];
  textOverlays?: any[];
};

export default function MyTrooFlixContent({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Hub Data
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<number[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        const supabase = createClient();
        const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", u.id).single();
        if (prof) setProfile(prof);

        Promise.all([
          fetch("/api/videos", { cache: "no-store" }).then(r => r.json()),
          fetch("/api/creators", { cache: "no-store" }).then(r => r.json()).catch(() => []),
          fetch(`/api/follows?user_id=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: [] })),
          fetch(`/api/wishlist?userId=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ items: [] })),
          fetch(`/api/wallet?userId=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ balance: 0 })),
          fetch(`/api/user/orders?userId=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ orders: [] })),
        ]).then(([vData, cData, fData, wData, walletData, ordersData]) => {
          setVideos(Array.isArray(vData) ? vData.filter(v => v.type?.toLowerCase() !== "tweet" && v.type?.toLowerCase() !== "short") : []);
          setCreators(Array.isArray(cData) ? cData : []);
          setFollowedCreatorIds(Array.isArray(fData.ids) ? fData.ids : []);
          setWishlistItems(Array.isArray(wData.items) ? wData.items : []);
          setWalletBalance(walletData.balance || 0);
          setMyOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
          setProgressList(getAllProgress());
          
          try {
            const ml = localStorage.getItem("trooflix:mylist");
            if (ml) {
              const arr = JSON.parse(ml);
              setWatchlistCount(Array.isArray(arr) ? arr.length : 0);
            }
          } catch (e) {}
        }).catch((err) => console.error(err));
      }
    });
  }, []);

  type VideoWithProgress = Video & { progressSeconds: number; progressDuration: number };

  const continueWatching = useMemo<VideoWithProgress[]>(() => {
    const items: VideoWithProgress[] = [];
    for (const p of progressList) {
      const video = videos.find((v) => v.id === p.id);
      if (!video) continue;
      const seconds = Number(p.seconds) || 0;
      const duration = Number(p.duration) || 0;
      if (seconds > 0 && duration > 0 && seconds / duration < 0.95) {
        items.push({ ...video, progressSeconds: seconds, progressDuration: duration });
      }
    }
    items.sort((a, b) => b.progressSeconds - a.progressSeconds);
    return items.slice(0, 10);
  }, [progressList, videos]);

  const followedCreators = useMemo(() => {
    return creators.filter(c => followedCreatorIds.includes(c.id));
  }, [creators, followedCreatorIds]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || "User";
  const isCreator = profile?.tier === "creator" || profile?.tier === "podcaster" || profile?.tier === "pro";
  const badgeLabel = isCreator ? "CREATOR ACCESS" : (profile?.tier === "plus" ? "VIP ACCESS" : "MEMBER");

  if (loading) {
    return (
      <div className={`${embedded ? "" : "min-h-screen bg-[#0a0303]"} flex items-center justify-center py-20`}>
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${embedded ? "" : "min-h-screen bg-[#0a0303]"} flex flex-col items-center justify-center py-20`}>
        <h1 className="text-2xl font-bold mb-4">Log in to view your hub</h1>
        <Link href="/login" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Log In</Link>
      </div>
    );
  }

  return (
    <main className={`${embedded ? "bg-transparent pb-4" : "min-h-screen bg-[#0a0303] pb-32"} text-white font-sans selection:bg-[#E53945]/30`}>
      {!embedded && <div className="relative z-[100]"><TopBar /></div>}

      <div className="w-full max-w-7xl mx-auto px-5 md:px-12 pt-8 md:pt-12">
        
        {/* 1. WELCOME HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] md:text-xs tracking-[0.3em] text-[#E53945] font-bold uppercase mb-1">
              {badgeLabel}
            </p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              {getGreeting()}, {displayName}.
            </h1>
            <p className="text-sm text-white/50 mt-2">Your Trooflix. Your World.</p>
          </div>
          {isCreator ? (
            <div className="flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full px-4 py-2">
              <Star size={16} className="text-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37] tracking-wide">CREATOR TIER</span>
            </div>
          ) : profile?.tier === "plus" ? (
            <div className="flex items-center gap-2 bg-[#E53945]/10 border border-[#E53945]/30 rounded-full px-4 py-2">
              <Sparkles size={16} className="text-[#E53945]" />
              <span className="text-xs font-bold text-[#E53945] tracking-wide">PLUS MEMBER</span>
            </div>
          ) : null}
        </div>

        {/* 2. QUICK STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
          <Link href="/wallet" className="bg-[#1c1c1e] border border-white/5 hover:border-[#E53945]/50 rounded-2xl p-4 transition group">
            <div className="flex items-center gap-2 text-white/50 mb-2">
              <Wallet size={16} className="group-hover:text-[#E53945] transition" /> 
              <span className="text-[10px] font-bold uppercase tracking-wider">TrooBank</span>
            </div>
            <p className="text-2xl font-black text-white">{walletBalance.toFixed(2)} <span className="text-sm text-[#E53945]">TC</span></p>
          </Link>
          <Link href="/my-list" className="bg-[#1c1c1e] border border-white/5 hover:border-[#E53945]/50 rounded-2xl p-4 transition group">
            <div className="flex items-center gap-2 text-white/50 mb-2">
              <List size={16} className="group-hover:text-[#E53945] transition" /> 
              <span className="text-[10px] font-bold uppercase tracking-wider">My List</span>
            </div>
            <p className="text-2xl font-black text-white">{watchlistCount} <span className="text-sm text-white/40">saved</span></p>
          </Link>
          <Link href="/orders" className="bg-[#1c1c1e] border border-white/5 hover:border-[#E53945]/50 rounded-2xl p-4 transition group">
            <div className="flex items-center gap-2 text-white/50 mb-2">
              <Package size={16} className="group-hover:text-[#E53945] transition" /> 
              <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
            </div>
            <p className="text-2xl font-black text-white">{myOrders.length} <span className="text-sm text-white/40">total</span></p>
          </Link>
          <Link href="/creators" className="bg-[#1c1c1e] border border-white/5 hover:border-[#E53945]/50 rounded-2xl p-4 transition group">
            <div className="flex items-center gap-2 text-white/50 mb-2">
              <CheckCircle2 size={16} className="group-hover:text-[#E53945] transition" /> 
              <span className="text-[10px] font-bold uppercase tracking-wider">Subscriptions</span>
            </div>
            <p className="text-2xl font-black text-white">{followedCreators.length} <span className="text-sm text-white/40">creators</span></p>
          </Link>
        </div>

        {/* 3. CONTINUE WATCHING */}
        {continueWatching.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Continue Watching</h2>
              <Link href="/my-list" className="text-xs font-bold text-white/50 hover:text-white transition flex items-center gap-1">See All <ChevronRight size={14} /></Link>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
              {continueWatching.map((v) => {
                const progress = v.progressDuration ? Math.min((v.progressSeconds / v.progressDuration) * 100, 100) : 0;
                return (
                  <div key={v.id} onClick={() => setPlaying(v)} className="flex-shrink-0 w-[240px] md:w-[320px] group cursor-pointer">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-3 shadow-2xl">
                      <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                          <Play size={20} fill="white" className="text-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div className="h-full bg-[#E53945]" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition">{v.title}</h3>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. YOUR SUBSCRIPTIONS */}
        {followedCreators.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-black tracking-tight">Your Subscriptions</h2>
              <Link href="/creators" className="text-xs font-bold text-white/50 hover:text-white transition flex items-center gap-1">Discover More <ChevronRight size={14} /></Link>
            </div>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4">
              {followedCreators.map((c: any) => (
                <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-3 flex-shrink-0 group w-[80px] md:w-[100px]">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-gradient-to-br from-[#E53945] to-[#D4AF37] group-hover:scale-105 transition-transform shadow-lg">
                    <div className="w-full h-full rounded-full border-2 border-[#0a0303] overflow-hidden bg-[#1c1c1e]">
                      {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]}</div>}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white/70 group-hover:text-white transition truncate w-full text-center">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 5. LIBRARY & PURCHASES */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Library & Purchases</h2>
          </div>
          
          {wishlistItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {wishlistItems.slice(0, 4).map((p) => (
                <Link key={p.id} href="/merchandise" className="flex flex-col group">
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden mb-2 border border-white/5 bg-[#1c1c1e]">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute top-2 right-2 bg-yellow-500 text-black p-1 rounded-full shadow-md">
                      <Star size={12} fill="currentColor" />
                    </div>
                  </div>
                  <p className="text-[#1DB954] font-black text-sm tracking-tight leading-none mb-1">${(p.price_cents / 100).toFixed(2)}</p>
                  <h3 className="text-[11px] md:text-sm font-semibold text-white/90 line-clamp-2 leading-tight">{p.name}</h3>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-8 text-center text-white/30 text-sm">
              <Heart size={24} className="mx-auto mb-2 opacity-50" />
              Your wishlist is empty. Items you save from the marketplace will appear here.
            </div>
          )}
        </section>

      </div>

      {playing && (
        <AppleVideoPlayer
          src={playing.videoUrl ?? playing.bitchuteUrl ?? ""}
          title={playing.title}
          poster={playing.posterUrl}
          textOverlays={playing.textOverlays}
          chapters={playing.chapters || []}
          onClose={() => setPlaying(null)}
        />
      )}

      {!embedded && <MobileBottomNav />}
    </main>
  );
}
