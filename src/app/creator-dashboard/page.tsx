"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Wallet, TrendingUp, Users, Settings, Video, Radio, 
  ShoppingBag, BarChart3, ExternalLink, ArrowRight, CheckCircle2, 
  DollarSign, MessageSquare, Eye, UserPlus, Star, Music, Play
} from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

export default function CreatorDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsUser, setViewAsUser] = useState(false);
  const [userViewTab, setUserViewTab] = useState<"all" | "podcasts" | "videos">("all");

  // Mock Data
  const MOCK_REVENUE = 1250.00;
  const MOCK_SUBSCRIBERS = 142;
  const MOCK_TOTAL_VIEWS = 45200;

  useEffect(() => {
    getCachedUser().then((u) => {
      if (u) {
        setUser(u);
        fetch(`/api/profile?user_id=${u.id}`)
          .then((r) => r.json())
          .then((d) => {
            setProfile(d.profile);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">Please log in to access Creator Studio</h1>
        <Link href="/login" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Log In</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      {/* IDENTITY HEADER (Banner & Avatar) */}
      <div className="relative w-full h-40 md:h-56 bg-[#1c1c1e]">
        {profile?.backdrop_url ? (
          <img src={profile.backdrop_url} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-red-900/40 to-[#0a0a0a]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 relative -mt-16 md:-mt-20">
        
        {/* Profile Info Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-[#0a0a0a] overflow-hidden bg-[#1c1c1e] shadow-2xl shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                  {profile?.display_name?.[0] || "C"}
                </div>
              )}
            </div>
            <div className="pb-2">
              <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
                {profile?.display_name || "Creator Name"}
                {profile?.is_verified && <VerifiedBadge size={20} variant="gold" />}
              </h1>
              <p className="text-sm text-white/50">@{profile?.username || "creator"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-2">
            {!viewAsUser && (
              <Link 
                href="/creator-dashboard/inbox" 
                className="flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-4 py-2 rounded-xl transition text-sm shadow-lg shadow-[#E53945]/20"
              >
                <MessageSquare size={16} /> Inbox
              </Link>
            )}
            
            <button 
              onClick={() => setViewAsUser(!viewAsUser)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition text-sm font-bold ${
                viewAsUser 
                  ? 'bg-[#E53945] text-white shadow-lg shadow-[#E53945]/20' 
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Eye size={16} /> {viewAsUser ? 'Exit Preview' : 'View as User'}
            </button>

            {!viewAsUser && (
              <Link 
                href="/creator-dashboard/settings" 
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              >
                <Settings size={20} />
              </Link>
            )}
          </div>
        </div>

        {/* =========================================
            VIEWER MODE (View as User)
        ========================================= */}
        {viewAsUser && (
          <div className="animate-in fade-in duration-300">
            {/* Public Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <button className="flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition shadow-lg">
                <UserPlus size={18} /> Follow
              </button>
              <button className="flex items-center justify-center gap-2 bg-[#E53945] text-white font-bold py-3 rounded-xl hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20">
                <Star size={18} fill="currentColor" /> Subscribe
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10">
                <ShoppingBag size={18} /> Shop
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition border border-white/10">
                <MessageSquare size={18} /> Message
              </button>
            </div>

            {/* Content Tabs */}
            <div className="flex items-center gap-6 border-b border-white/10 mb-6">
              <button 
                onClick={() => setUserViewTab("all")}
                className={`pb-3 text-sm font-bold transition-colors ${userViewTab === "all" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}
              >
                All
              </button>
              <button 
                onClick={() => setUserViewTab("podcasts")}
                className={`pb-3 text-sm font-bold transition-colors ${userViewTab === "podcasts" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}
              >
                Podcasts
              </button>
              <button 
                onClick={() => setUserViewTab("videos")}
                className={`pb-3 text-sm font-bold transition-colors ${userViewTab === "videos" ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}
              >
                Videos
              </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {/* Mock Podcast */}
              {(userViewTab === "all" || userViewTab === "podcasts") && (
                <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                  <div className="relative aspect-square">
                    <img src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&q=80" alt="Podcast" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <Music size={10} /> PODCAST
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-1">The Truth About Big Tech</h3>
                    <p className="text-xs text-white/50">Ep. 42 • 45 min</p>
                  </div>
                </div>
              )}

              {/* Mock Video */}
              {(userViewTab === "all" || userViewTab === "videos") && (
                <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                  <div className="relative aspect-square">
                    <img src="https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80" alt="Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 bg-[#E53945] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <Video size={10} /> VIDEO
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-1">The Last Days Of The Big Lie</h3>
                    <p className="text-xs text-white/50">1:35:01 • 12K views</p>
                  </div>
                </div>
              )}

              {/* Mock Merch */}
              {userViewTab === "all" && (
                <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                  <div className="relative aspect-square">
                    <img src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80" alt="Merch" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <ShoppingBag size={10} /> MERCH
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-bold leading-tight mb-1 line-clamp-1">Classic Logo Tee</h3>
                    <p className="text-xs text-[#E53945] font-bold">$25.00</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================
            CREATOR MODE (The Studio)
        ========================================= */}
        {!viewAsUser && (
          <div className="animate-in fade-in duration-300">
            {/* FINANCIAL STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-[#E53945]/20 to-[#1c1c1e] border border-[#E53945]/30 p-4 rounded-2xl relative overflow-hidden">
                <Wallet className="absolute top-4 right-4 text-[#E53945]/40" size={32} />
                <p className="text-xs text-white/60 font-semibold mb-1">Gross Revenue</p>
                <h3 className="text-2xl md:text-3xl font-black text-white">
                  ${MOCK_REVENUE.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-[#1ed760] font-bold mt-1">↑ 12% this month</p>
              </div>
              <div className="bg-[#1c1c1e] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                <Users className="absolute top-4 right-4 text-white/10" size={32} />
                <p className="text-xs text-white/60 font-semibold mb-1">Subscribers</p>
                <h3 className="text-2xl md:text-3xl font-black text-white">{MOCK_SUBSCRIBERS}</h3>
                <p className="text-[10px] text-white/40 font-medium mt-1">Premium members</p>
              </div>
              <div className="bg-[#1c1c1e] border border-white/10 p-4 rounded-2xl relative overflow-hidden">
                <TrendingUp className="absolute top-4 right-4 text-white/10" size={32} />
                <p className="text-xs text-white/60 font-semibold mb-1">Total Views</p>
                <h3 className="text-2xl md:text-3xl font-black text-white">{(MOCK_TOTAL_VIEWS / 1000).toFixed(1)}K</h3>
                <p className="text-[10px] text-white/40 font-medium mt-1">All time</p>
              </div>
              <div className="bg-[#1c1c1e] border border-white/10 p-4 rounded-2xl col-span-2 md:col-span-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-white/60 font-semibold">Setup Fee</p>
                  <span className="text-xs font-bold text-[#1ed760]">Paid</span>
                </div>
                <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1ed760]" style={{ width: '100%' }} />
                </div>
                <p className="text-[10px] text-white/40 mt-2 font-medium">You keep 90% of all revenue</p>
              </div>
            </div>

            {/* QUICK ACTIONS GRID */}
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <Link href="/creator-dashboard/upload" className="group bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#E53945]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Video className="text-[#E53945]" size={24} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-[#E53945] transition-colors">Upload Content</span>
              </Link>
              <button className="group bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 opacity-60 cursor-not-allowed">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Radio className="text-blue-400" size={24} />
                </div>
                <span className="text-sm font-bold text-white">Go Live</span>
                <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Coming Soon</span>
              </button>
              <Link href="/creator-dashboard/shop" className="group bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="text-white" size={24} />
                </div>
                <span className="text-sm font-bold text-white">Manage Shop</span>
              </Link>
              <Link href="/creator-dashboard/analytics" className="group bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <span className="text-sm font-bold text-white">View Analytics</span>
              </Link>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Recent Activity</h2>
                </div>
                <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1ed760]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <DollarSign size={16} className="text-[#1ed760]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium"><span className="font-bold">User_482</span> subscribed to your Premium tier.</p>
                      <p className="text-xs text-white/40">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Your video <span className="font-bold">"The Big Lie"</span> hit 10,000 views.</p>
                      <p className="text-xs text-white/40">5 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Latest Uploads</h2>
                  <Link href="/creator-dashboard/content" className="text-xs font-semibold text-[#E53945] hover:text-white transition">View All</Link>
                </div>
                <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 bg-black/20 p-2 rounded-xl">
                      <img src="https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=200&q=80" alt="Thumb" className="w-16 h-10 object-cover rounded-md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">The Last Days Of The Big Lie</p>
                        <p className="text-xs text-white/50">1.2K views • 2 days ago</p>
                      </div>
                      <button className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition">
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <MobileBottomNav />
    </main>
  );
}
