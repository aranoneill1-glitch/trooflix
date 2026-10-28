"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Wallet, TrendingUp, Users, Settings, Video, BarChart3, 
  ArrowRight, CheckCircle2, DollarSign, MessageSquare, Eye, 
  UserPlus, Star, Music, Pencil, Play, Plus, Clock3, 
  ShoppingBag, Upload, LayoutDashboard, ChevronRight, LayoutGrid, List, X, Camera
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

export default function CreatorDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDashboardView, setIsDashboardView] = useState(false);
  const [contentView, setContentView] = useState<"grid" | "list">("grid");
  const [creatorVideos, setCreatorVideos] = useState<any[]>([]);
  const [creatorMerch, setCreatorMerch] = useState<any[]>([]);
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Podcasts" | "Videos" | "Store">("All");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", bio: "", avatarUrl: "", insta: "", x: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [videosLoading, setVideosLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then((u) => {
      if (u) {
        setUser(u);
        fetch(`/api/profile?user_id=${u.id}`)
          .then((r) => r.json())
          .then((d) => {
            setProfile(d.profile);
            if (d.profile) {
              setEditForm({
                name: d.profile.display_name || "",
                bio: d.profile.bio || "",
                avatarUrl: d.profile.avatar_url || "",
                insta: d.profile.instagram_handle || "",
                x: d.profile.x_handle || ""
              });
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));

        // Fetch real videos
        // Fetch only videos for now, using strict string comparison
        fetch("/api/videos")
          .then(r => r.json())
          .then(videoData => {
            // We need the profile's creator_id to match the videos
            fetch(`/api/profile?user_id=${u.id}`)
              .then(res => res.json())
              .then(profileData => {
                const myCreatorId = profileData.profile?.creator_id;
                
                // Filter videos by the real creator_id
                const myVideos = Array.isArray(videoData) ? videoData.filter((v: any) => 
                  String(v.creatorId) === String(myCreatorId)
                ) : [];
                
                setCreatorVideos(myVideos);
                setVideosLoading(false);
              })
              .catch(() => setVideosLoading(false));
          })
          .catch((err) => {
            console.error("Video fetch error:", err);
            setVideosLoading(false);
          });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          displayName: editForm.name,
          bio: editForm.bio,
          avatarUrl: editForm.avatarUrl,
          instagramHandle: editForm.insta,
          xHandle: editForm.x
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setProfile(data.profile);
        setIsEditModalOpen(false);
      } else {
        alert("Failed to save: " + (data.error || "Unknown error. Did you add the new columns to Supabase?"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

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
  
      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold">Edit Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-white/50 hover:text-white bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4 max-h-[60vh]">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-black shrink-0 border border-white/10 relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {editForm.avatarUrl ? (
                      <img src={editForm.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="m-auto mt-5 text-white/30" size={24} />
                    )}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                      <Pencil size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <input 
                      id="avatar-upload"
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Show loading state
                        setSavingProfile(true);
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        try {
                          const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
                          const data = await res.json();
                          if (data.url) {
                            setEditForm({...editForm, avatarUrl: data.url});
                          } else {
                            alert("Upload failed: " + data.error);
                          }
                        } catch (err) {
                          alert("Error uploading image");
                        } finally {
                          setSavingProfile(false);
                        }
                      }}
                      className="hidden"
                    />
                    <button onClick={() => document.getElementById('avatar-upload')?.click()} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                      Select Photo
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none resize-none h-20"
                  placeholder="Tell your fans about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Instagram Handle</label>
                  <input 
                    type="text" 
                    value={editForm.insta}
                    onChange={(e) => setEditForm({...editForm, insta: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">X Handle</label>
                  <input 
                    type="text" 
                    value={editForm.x}
                    onChange={(e) => setEditForm({...editForm, x: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button 
                onClick={handleSaveProfile} 
                disabled={savingProfile}
                className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3 rounded-xl transition flex justify-center items-center"
              >
                {savingProfile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>

    );
  }

  const displayName = profile?.display_name || "Creator Name";
  const username = profile?.username || "creator";

  const filteredContent = activeContentTab === "All" 
    ? creatorVideos 
    : activeContentTab === "Podcasts"
      ? creatorVideos.filter(v => v.type?.toLowerCase() === 'podcast')
      : activeContentTab === "Videos"
        ? creatorVideos.filter(v => v.type?.toLowerCase() !== 'podcast' && v.type?.toLowerCase() !== 'merch')
        : []; // Store will be built later

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-6">
        
        {/* TOP TOGGLE ROW */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-10"></div>
          
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

          <button onClick={() => setIsEditModalOpen(true)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition">
            <Pencil size={20} />
          </button>
        </div>

        {/* PROFILE HEADER */}
        <div className="flex flex-col mb-6 w-full">
          
          {/* TOP ROW: Avatar & Stats */}
          <div className="flex items-center gap-4 w-full">
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
                <span className="font-bold text-white block text-xl">45</span> 
                <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Name, Username & Handles */}
          <div className="mt-4 px-1">
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">
              {displayName} {profile?.is_verified && <VerifiedBadge size={20} variant="gold" />}
            </h1>
            <p className="text-sm md:text-base text-white/50 mb-2">@{username}</p>
            
            {/* Social Handles */}
            <div className="flex items-center gap-4">
              <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                <InstagramIcon size={14} />
                <span className="text-xs font-semibold">{profile?.instagram_handle || "@instagram"}</span>
              </a>
              <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                <XIcon size={14} />
                <span className="text-xs font-semibold">{profile?.x_handle || "@x"}</span>
              </a>
            </div>
          </div>

        </div>

        {/* BIO */}
        <p className="text-sm text-white/60 mb-8 leading-relaxed">
          Independent filmmaker and podcast host. Uncovering the truth the mainstream won't touch. Subscribe for exclusive documentaries and unfiltered conversations.
        </p>

        {/* PROFILE VIEW */}
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

              {/* VIEW TOGGLE */}
              <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
                <button
                  onClick={() => setContentView("grid")}
                  className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setContentView("list")}
                  className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}
                  aria-label="List view"
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
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-20 text-white/50">
                No {activeContentTab === "All" ? "content" : activeContentTab.toLowerCase()} found yet.
              </div>
            ) : contentView === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredContent.map((item) => (
                  <div key={item.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                    <div className="relative aspect-square">
                      <img 
                        src={item.posterUrl || item.imageUrl || item.backdropUrl || "https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80"} 
                        alt={item.title || item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                        item.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 
                        item.price ? 'bg-[#E53945]' : 'bg-[#E53945]'
                      }`}>
                        {item.price ? 'MERCH' : item.type || "VIDEO"}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold leading-tight line-clamp-1">{item.title || item.name}</h3>
                      <p className="text-xs text-white/50 mt-1">
                        {item.price ? `$${item.price.toFixed(2)}` : item.duration || "Recently added"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredContent.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-[#242426] transition-colors">
                    <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative">
                      <img 
                        src={item.posterUrl || item.imageUrl || item.backdropUrl || "https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80"} 
                        alt={item.title || item.name} 
                        className="w-full h-full object-cover" 
                      />
                      <div className={`absolute top-1 left-1 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${
                        item.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 
                        item.price ? 'bg-[#E53945]' : 'bg-[#E53945]'
                      }`}>
                        {item.price ? 'MERCH' : item.type || "VIDEO"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{item.title || item.name}</h3>
                      <p className="text-xs text-white/50 mt-1">
                        {item.price ? `$${item.price.toFixed(2)}` : item.duration || "Recently added"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-white/30 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD VIEW */}
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

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold">Edit Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-white/50 hover:text-white bg-white/5 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4 max-h-[60vh]">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-black shrink-0 border border-white/10 relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                    {editForm.avatarUrl ? (
                      <img src={editForm.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="m-auto mt-5 text-white/30" size={24} />
                    )}
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                      <Pencil size={16} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <input 
                      id="avatar-upload"
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Show loading state
                        setSavingProfile(true);
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        try {
                          const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
                          const data = await res.json();
                          if (data.url) {
                            setEditForm({...editForm, avatarUrl: data.url});
                          } else {
                            alert("Upload failed: " + data.error);
                          }
                        } catch (err) {
                          alert("Error uploading image");
                        } finally {
                          setSavingProfile(false);
                        }
                      }}
                      className="hidden"
                    />
                    <button onClick={() => document.getElementById('avatar-upload')?.click()} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-4 rounded-lg transition">
                      Select Photo
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Bio</label>
                <textarea 
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none resize-none h-20"
                  placeholder="Tell your fans about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">Instagram Handle</label>
                  <input 
                    type="text" 
                    value={editForm.insta}
                    onChange={(e) => setEditForm({...editForm, insta: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none"
                    placeholder="@username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-1">X Handle</label>
                  <input 
                    type="text" 
                    value={editForm.x}
                    onChange={(e) => setEditForm({...editForm, x: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#E53945] outline-none"
                    placeholder="@username"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10">
              <button 
                onClick={handleSaveProfile} 
                disabled={savingProfile}
                className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3 rounded-xl transition flex justify-center items-center"
              >
                {savingProfile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>

  );
}
