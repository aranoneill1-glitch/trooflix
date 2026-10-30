"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Wallet, TrendingUp, Users, Settings, Video, BarChart3, 
  ArrowRight, CheckCircle2, DollarSign, MessageSquare, Eye, 
  UserPlus, Star, Music, Pencil, Play, Plus, Clock3, 
  ShoppingBag, Upload, LayoutDashboard, ChevronRight, LayoutGrid, List, Package, Palette
} from "lucide-react";

import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

const MOCK_REVENUE = 1250.00;
const MOCK_SUBSCRIBERS = 142;
const MOCK_TOTAL_VIEWS = 45200;

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function CreatorDashboardContent() {
  const searchParams = useSearchParams();
  const isPublicView = searchParams.get('view') === 'public';

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDashboardView, setIsDashboardView] = useState(false);

  // Force profile view if in public mode
  useEffect(() => {
    if (isPublicView) setIsDashboardView(false);
  }, [isPublicView]);
  const [contentView, setContentView] = useState<"grid" | "list">("grid");
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Podcasts" | "Videos" | "Store">("All");
  const [creatorVideos, setCreatorVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

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

        fetch("/api/videos")
          .then(r => r.json())
          .then(data => {
            const myVideos = Array.isArray(data) ? data.filter((v: any) => 
              String(v.uploaderUserId) === String(u.id)
            ) : [];
            setCreatorVideos(myVideos);
            setVideosLoading(false);
          })
          .catch(() => setVideosLoading(false));
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

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
        
        {/* TOP TOGGLE ROW */}
        {!isPublicView && (
        <div className="flex items-center justify-center mb-6">
          <div className="flex bg-[#1c1c1e] p-1 rounded-full border border-white/10 shadow-lg">
            <button
              onClick={() => setIsDashboardView(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                isDashboardView ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"
              }`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button
              onClick={() => setIsDashboardView(false)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                !isDashboardView ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"
              }`}
            >
              <Eye size={16} /> Profile
            </button>
          </div>
        </div>
        )}

        {/* =========================================
            VIEW 1: THE PUBLIC PROFILE (Fan View)
        ========================================= */}
        {!isDashboardView && (
          <div className="animate-in fade-in duration-300">
            
            {/* PROFILE HEADER */}
            <div className="flex flex-col mb-6 w-full">
              
              {/* TOP ROW: Avatar & Stats */}
              <div className="flex items-center gap-4 w-full mb-4">
                {/* Avatar */}
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 shrink-0">
                  <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold">{displayName.charAt(0)}</div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex-1 flex justify-around md:justify-start md:gap-8 px-2">
                  <div className="text-center md:text-left">
                    <span className="font-bold text-white block text-xl">1.2K</span> 
                    <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="font-bold text-white block text-xl">{MOCK_SUBSCRIBERS}</span> 
                    <span className="text-white/50 text-[11px] uppercase tracking-wider">Subscribers</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="font-bold text-white block text-xl">{creatorVideos.length}</span> 
                    <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Name, Follow Button, Username, Handles */}
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">
                    {displayName} {profile?.is_verified && <VerifiedBadge size={20} variant="gold" />}
                  </h1>
                  {/* FOLLOW BUTTON */}
                  <button className="shrink-0 bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 transition shadow-lg text-sm">
                    Follow
                  </button>
                </div>
                <p className="text-sm md:text-base text-white/50 mb-3">@{username}</p>
                
                {/* Social Handles */}
                <div className="flex items-center gap-4 mb-4">
                  <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                    <InstagramIcon size={14} />
                    <span className="text-xs font-semibold">{profile?.instagram_handle || "@instagram"}</span>
                  </a>
                  <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                    <XIcon size={14} />
                    <span className="text-xs font-semibold">{profile?.x_handle || "@x"}</span>
                  </a>
                </div>

                {/* Bio */}
                <p className="text-sm text-white/60 leading-relaxed">
                  {profile?.bio || "Independent filmmaker and podcast host. Uncovering the truth the mainstream won't touch. Subscribe for exclusive documentaries and unfiltered conversations."}
                </p>
              </div>
            </div>

            {/* SUBSCRIBE & MESSAGE (Pills) */}
            <div className="flex gap-3 mb-8 w-full">
              <button className="flex-1 flex items-center justify-center gap-2 bg-[#E53945] text-white font-bold py-3 rounded-full hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20">
                <Star size={18} fill="currentColor" /> Subscribe
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-full transition border border-white/10">
                <MessageSquare size={18} /> Message
              </button>
            </div>

            {/* TABS & VIEW TOGGLE */}
            <div className="flex items-center justify-between border-b border-white/10 mb-6">
              <div className="flex items-center gap-8">
                {(["All", "Podcasts", "Videos", "Store"] as const).map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveContentTab(tab)}
                    className={`pb-3 text-sm font-bold transition-colors ${
                      activeContentTab === tab 
                        ? "text-white border-b-2 border-[#E53945]" 
                        : "text-white/50 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
                <button
                  onClick={() => setContentView("grid")}
                  className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setContentView("list")}
                  className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* CONTENT AREA */}
            {videosLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
              </div>
            ) : creatorVideos.length === 0 ? (
              <div className="text-center py-20 text-white/50">
                No content found yet.
              </div>
            ) : contentView === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {creatorVideos.map((video) => (
                  <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                    <div className="relative aspect-square">
                      <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>
                        {video.type || "VIDEO"}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold leading-tight line-clamp-1">{video.title}</h3>
                      <p className="text-xs text-white/50 mt-1">{video.duration || "Recently added"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {creatorVideos.map((video) => (
                  <div key={video.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-[#242426] transition-colors">
                    <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative">
                      <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" />
                      <div className={`absolute top-1 left-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>
                        {video.type || "VIDEO"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{video.title}</h3>
                      <p className="text-xs text-white/50 mt-1">{video.duration || "Recently added"}</p>
                    </div>
                    <ChevronRight size={18} className="text-white/30 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================
            VIEW 2: THE CREATOR DASHBOARD (Business View)
        ========================================= */}
        {isDashboardView && (
          <div className="animate-in fade-in duration-300 space-y-8">
            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Link href="/creator-dashboard/manage-content" className="bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <Video className="text-[#E53945]" size={24} />
                <span className="text-xs font-bold text-center">Manage Content</span>
              </Link>
              <Link href="/studio/shop" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <ShoppingBag className="text-white" size={24} />
                <span className="text-xs font-bold text-center">Manage Shop</span>
              </Link>
              <Link href="/studio/shop/customize" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <Palette className="text-white" size={24} />
                <span className="text-xs font-bold text-center">Customize Store</span>
              </Link>
              <Link href="/creator-dashboard/settings" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <Pencil className="text-white" size={24} />
                <span className="text-xs font-bold text-center">Manage Profile</span>
              </Link>
              <Link href="/creator-dashboard/orders" className="bg-[#1c1c1e] border border-white/10 hover:border-white/30 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <Package className="text-white" size={24} />
                <span className="text-xs font-bold text-center">Manage Orders</span>
              </Link>
              
              {/* MANAGE SUBSCRIPTION BOX */}
              <Link href="/studio/premium" className="bg-[#1c1c1e] border border-white/10 hover:border-[#E53945] p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                <Star className="text-[#E53945]" size={24} />
                <span className="text-xs font-bold text-center">Manage Subscription</span>
              </Link>
            </div>
          </div>
        )}

      </div>

      <MobileBottomNav />
    </main>
  );
}

export default function CreatorDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <CreatorDashboardContent />
    </Suspense>
  );
}
