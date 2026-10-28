"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Wallet, TrendingUp, Users, Settings, Video, BarChart3, 
  ArrowRight, CheckCircle2, DollarSign, MessageSquare, Eye, 
  UserPlus, Star, Music, Pencil, Play, Plus, Clock3, 
  ShoppingBag, Upload, LayoutDashboard, ChevronRight
} from "lucide-react";

import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

const MOCK_REVENUE = 1250.00;
const MOCK_SUBSCRIBERS = 142;
const MOCK_TOTAL_VIEWS = 45200;

const DEMO_UPLOADS = [
  { id: 1, title: "The Last Days Of The Big Lie", image: "https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80", status: "Published", views: "1.2K", date: "2 days ago" },
  { id: 2, title: "The Truth About Big Tech", image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&q=80", status: "Published", views: "840", date: "4 days ago" },
];

export default function CreatorDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDashboardView, setIsDashboardView] = useState(false);

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
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">Log in to view your profile</h1>
        <Link href="/login" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Log In</Link>
      </main>
    );
  }

  const displayName = profile?.display_name || "Creator Name";
  const username = profile?.username || "creator";

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/creator-dashboard/settings" className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <ArrowRight className="rotate-180" size={20} />
          </Link>
          
          <div className="flex bg-[#1c1c1e] p-1 rounded-full border border-white/10 shadow-lg">
            <button
              onClick={() => setIsDashboardView(false)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                !isDashboardView ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"
              }`}
            >
              <UserPlus size={16} /> Profile
            </button>
            <button
              onClick={() => setIsDashboardView(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                isDashboardView ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"
              }`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
          </div>

          <Link href="/creator-dashboard/settings" className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <Settings size={20} />
          </Link>
        </div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 mb-4">
            <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold">{displayName.charAt(0)}</div>
              )}
            </div>
          </div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            {displayName} {profile?.is_verified && <VerifiedBadge size={18} variant="gold" />}
          </h1>
          <p className="text-sm text-white/50 mb-4">@{username}</p>
          
          <div className="flex gap-6 text-sm mb-6">
            <div className="text-center"><span className="font-bold text-white">1.2K</span> <span className="text-white/50">Followers</span></div>
            <div className="text-center"><span className="font-bold text-white">{MOCK_SUBSCRIBERS}</span> <span className="text-white/50">Subscribers</span></div>
            <div className="text-center"><span className="font-bold text-white">45</span> <span className="text-white/50">Posts</span></div>
          </div>
        </div>

        {!isDashboardView && (
          <div className="animate-in fade-in duration-300">
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

            <div className="flex items-center justify-center gap-8 border-b border-white/10 mb-6">
              <button className="pb-3 text-sm font-bold text-white border-b-2 border-[#E53945]">All</button>
              <button className="pb-3 text-sm font-bold text-white/50 hover:text-white">Podcasts</button>
              <button className="pb-3 text-sm font-bold text-white/50 hover:text-white">Videos</button>
              <button className="pb-3 text-sm font-bold text-white/50 hover:text-white">Store</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                <div className="relative aspect-square">
                  <img src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=500&q=80" alt="Podcast" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">PODCAST</div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-bold leading-tight line-clamp-1">The Truth About Big Tech</h3>
                  <p className="text-xs text-white/50 mt-1">Ep. 42 • 45 min</p>
                </div>
              </div>
              <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                <div className="relative aspect-square">
                  <img src="https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80" alt="Video" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2 bg-[#E53945] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">VIDEO</div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-bold leading-tight line-clamp-1">The Last Days Of The Big Lie</h3>
                  <p className="text-xs text-white/50 mt-1">1:35:01 • 12K views</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {isDashboardView && (
          <div className="animate-in fade-in duration-300 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/creator-dashboard/upload" className="bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <Video className="text-[#E53945]" size={24} />
                <span className="text-xs font-bold">Upload Content</span>
              </Link>
              <Link href="/creator-shop" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <ShoppingBag className="text-white" size={24} />
                <span className="text-xs font-bold">Manage Shop</span>
              </Link>
              <Link href="/creator-dashboard/inbox" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <MessageSquare className="text-white" size={24} />
                <span className="text-xs font-bold">Inbox</span>
              </Link>
              <Link href="/creator-dashboard/analytics" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <BarChart3 className="text-white" size={24} />
                <span className="text-xs font-bold">Analytics</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[#E53945]/20 to-[#1c1c1e] border border-[#E53945]/30 p-5 rounded-2xl">
                <Wallet className="text-[#E53945]/50 mb-2" size={24} />
                <p className="text-xs text-white/60 font-semibold mb-1">Gross Revenue</p>
                <h3 className="text-3xl font-black text-white">${MOCK_REVENUE.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
                <p className="text-[10px] text-[#1ed760] font-bold mt-1">↑ 12% this month</p>
              </div>
              <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl">
                <Users className="text-white/20 mb-2" size={24} />
                <p className="text-xs text-white/60 font-semibold mb-1">Subscribers</p>
                <h3 className="text-3xl font-black text-white">{MOCK_SUBSCRIBERS}</h3>
                <p className="text-[10px] text-white/40 font-medium mt-1">Premium members</p>
              </div>
              <div className="bg-[#1c1c1e] border border-white/10 p-5 rounded-2xl">
                <Eye className="text-white/20 mb-2" size={24} />
                <p className="text-xs text-white/60 font-semibold mb-1">Total Views</p>
                <h3 className="text-3xl font-black text-white">{(MOCK_TOTAL_VIEWS / 1000).toFixed(1)}K</h3>
                <p className="text-[10px] text-white/40 font-medium mt-1">All time</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Latest Uploads</h2>
                <Link href="/creator-dashboard/content" className="text-xs font-semibold text-[#E53945] hover:text-white transition">View All</Link>
              </div>
              <div className="space-y-3">
                {DEMO_UPLOADS.map((upload) => (
                  <div key={upload.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 p-3 rounded-2xl">
                    <img src={upload.image} alt="" className="w-20 h-12 object-cover rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{upload.title}</p>
                      <p className="text-xs text-white/50">{upload.views} views • {upload.date}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#1ed760] bg-[#1ed760]/10 px-2 py-1 rounded-md hidden md:block">PUBLISHED</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
