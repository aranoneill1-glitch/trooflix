"use client";
import { getCachedUser } from "@/lib/cache";

import { useEffect, useState , useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, MessageSquare, CheckCircle2, LayoutGrid, List, ShoppingBag, Star, Lock, Play , GripVertical } from "lucide-react";
import HomeFeedCard from "@/components/HomeFeedCard";
import CommentSheet from "@/components/CommentSheet";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence, Reorder } from "framer-motion";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);


export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContentTab, setActiveContentTab] = useState<"All" | "Videos" | "Premium" | "Shop">("All");
  const [contentView, setContentView] = useState<"grid" | "list">("grid");
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [commentSheetVideoId, setCommentSheetVideoId] = useState<number | null>(null);
  const [likedVideos, setLikedVideos] = useState<Record<number, boolean>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [localMerch, setLocalMerch] = useState<any[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedMerchItem, setSelectedMerchItem] = useState<any>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getCachedUser().then(setCurrentUser);
    async function loadProfileAndVideos() {
      const supabase = createClient();
      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("username", username).single();
      
      if (error || !profileData) { setLoading(false); return; }
      setProfile(profileData);

      const targetCreatorId = profileData.creator_id || profileData.user_id;
      const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileData.user_id);
      const { count: subs } = await supabase.from("creator_subscriptions").select("*", { count: "exact", head: true }).eq("creator_id", targetCreatorId);
      setFollowerCount(followers || 0);
      setSubscriberCount(subs || 0);

      let creatorId = null;
      try {
        const creatorRes = await fetch(`/api/me/creator?user_id=${profileData.user_id}`);
        const creatorData = await creatorRes.json();
        if (creatorData.creator) creatorId = creatorData.creator.id;
      } catch (err) {}

      try {
        const videosRes = await fetch("/api/videos", { cache: "no-store" });
        const allVideos = await videosRes.json();
        if (Array.isArray(allVideos)) {
          const creatorVideos = allVideos.filter((v: any) => {
              // Ensure both values exist before comparing to prevent null === null leaks
              const matchesUploader = v.uploaderUserId && String(v.uploaderUserId) === String(profileData.user_id);
              const matchesCreator = creatorId && v.creatorId && String(v.creatorId) === String(creatorId);
              return matchesUploader || matchesCreator;
            });
          setVideos(creatorVideos);
        }
      } catch (err) {}

      try {
        const merchRes = await fetch("/api/products/global");
        const merchData = await merchRes.json();
        if (merchData.products) {
          const creatorMerch = merchData.products.filter((p: any) => 
            String(p.creatorSlug) === String(username) || String(p.creator_id) === String(creatorId)
          );
          setMerch(creatorMerch);
          setLocalMerch(creatorMerch);
        }
      } catch (err) {}

      setLoading(false);
    }
    if (username) loadProfileAndVideos();
  }, [username]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!profile) return <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4"><h1 className="text-2xl font-bold mb-4">User not found</h1><Link href="/" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Go Home</Link></main>;

  const displayName = profile.display_name || "User";
  const subscriptionPrice = profile.subscription_price_cents ? (profile.subscription_price_cents / 100).toFixed(2) : "3.99";

  const filteredVideos = videos.filter(v => {
    if (activeContentTab === "Videos") return !v.type?.toLowerCase().includes("podcast");
    return true;
  });

  const bgStyle = profile.backdrop_url
    ? profile.backdrop_url.startsWith("http")
      ? { backgroundImage: `url(${profile.backdrop_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: profile.backdrop_url }
    : { background: "#09090B" };


  // Determine if the logged-in user owns this profile
  const isOwner = currentUser && profile && currentUser.id === profile.user_id;

  const startPress = (item: any) => {
    if (!isOwner) return;
    pressTimer.current = setTimeout(() => {
      setSelectedMerchItem(item);
    }, 500);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", id);
    setLocalMerch(prev => prev.filter(p => p.id !== id));
    setMerch(prev => prev.filter(p => p.id !== id));
    setSelectedMerchItem(null);
  };

  const saveOrder = async () => {
    setIsReordering(false);
    const supabase = createClient();
    
    // Update the sort_order for each item based on its new index
    const updates = localMerch.map((item, index) => ({
      id: item.id,
      sort_order: index,
      name: item.name,
      price_cents: item.price_cents,
      image_url: item.image_url,
      creator_id: item.creator_id
    }));

    // Upsert the new order to Supabase
    const { error } = await supabase.from("products").upsert(updates);
    if (error) {
      console.error("Failed to save order", error);
      alert("Failed to save the new order.");
    } else {
      setMerch(localMerch); // Update the main state
    }
  };

  return (
    <main className={`min-h-screen text-white pb-32 font-sans selection:bg-[#E53945]/30 relative overflow-hidden bg-transparent`}>
      
      {/* Background */}
      <div className="fixed inset-0 z-0" style={bgStyle}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>

      <div className="relative z-10">
        <TopBar />
        
        <div className="max-w-5xl mx-auto px-4 pt-24 pb-6">
          
          <Link href="/search" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-6 transition text-sm font-semibold">
            <ArrowLeft size={16} /> Back
          </Link>

          {/* CREATOR-STYLE PROFILE LAYOUT */}
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col mb-6 w-full">
              
              <div className="flex items-center gap-4 w-full mb-4">
                {/* AVATAR (Clickable if live) */}
                <div 
                  onClick={() => profile.is_live && router.push(`/live/${profile.username}`)}
                  className={`w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] shrink-0 relative ${profile.is_live ? 'cursor-pointer bg-red-600 animate-pulse' : 'bg-gradient-to-tr from-[#E53945] to-orange-500'}`}
                >
                  <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e] relative">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold">{displayName.charAt(0)}</div>
                    )}
                    
                    {profile.is_live && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-red-600 px-2 py-1 rounded-sm shadow-lg whitespace-nowrap">WATCH LIVE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* STATS */}
                <div className="flex-1 flex justify-around md:justify-start md:gap-8 px-2">
                  <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(followerCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span></div>
                  <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(subscriberCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Subscribers</span></div>
                  <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{videos.length}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span></div>
                </div>
              </div>

              {/* NAME, HANDLE, SOCIALS, BIO */}
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">
                    {displayName} {profile.is_verified && <CheckCircle2 size={20} className="text-[#1ed760]" fill="currentColor" />}
                  </h1>
                  
                  {/* FOLLOW BUTTON (Top Right) */}
                  <button className="shrink-0 flex items-center justify-center gap-1.5 bg-white text-black font-bold px-5 py-1.5 rounded-full hover:bg-gray-200 transition shadow-lg text-sm">
                    <UserPlus size={16} /> Follow
                  </button>
                </div>
                
                <p className="text-sm md:text-base text-white/50 mb-3">@{username}</p>
                
                <div className="flex items-center gap-4 mb-4">
                  {profile.instagram_handle && (
                    <a href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                      <InstagramIcon size={14} />
                      <span className="text-xs font-semibold">{profile.instagram_handle}</span>
                    </a>
                  )}
                  {profile.x_handle && (
                    <a href={`https://x.com/${profile.x_handle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
                      <XIcon size={14} />
                      <span className="text-xs font-semibold">{profile.x_handle}</span>
                    </a>
                  )}
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{profile.bio || "No bio yet."}</p>
              </div>
            </div>

            {/* SUBSCRIBE & MESSAGE BUTTONS */}
            <div className="flex gap-3 mb-8 w-full">
              <button className="flex-1 flex items-center justify-center gap-2 bg-[#E53945] text-white font-bold py-3 rounded-full hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20">
                <Star size={18} fill="currentColor" /> Subscribe - ${subscriptionPrice}
              </button>
              <Link href={`/messages/${profile.user_id}`} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-full transition border border-white/10">
                <MessageSquare size={18} /> Message
              </Link>
            </div>

            {/* TABS & CONTENT */}
            <div className="flex items-center justify-between border-b border-white/10 mb-6">
              <div className="flex items-center gap-8">
                {(["All", "Videos", "Premium", "Shop"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveContentTab(tab)} className={`pb-3 text-sm font-bold transition-colors ${activeContentTab === tab ? "text-white border-b-2 border-[#E53945]" : "text-white/50 hover:text-white"}`}>{tab}</button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-[#1c1c1e] p-1 rounded-lg mb-2">
                <button onClick={() => setContentView("grid")} className={`p-1.5 rounded-md transition ${contentView === "grid" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setContentView("list")} className={`p-1.5 rounded-md transition ${contentView === "list" ? "bg-white text-black shadow-sm" : "text-white/50 hover:text-white"}`}><List size={16} /></button>
              </div>
            </div>

            <div className="w-full">
              {activeContentTab === "All" && (
                <div className="w-full">
                  {videos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No posts yet.</div>
                  ) : (
                    <div className="flex flex-col gap-6 pb-20 px-4">
                      {videos.map((v) => (
                                                <div 
                          key={v.id} 
                          ref={(el) => { if (el) { const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio > 0.6) setActiveVideoId(v.id); }, { threshold: [0.6] }); observer.observe(el); } }}
                        >
                          <HomeFeedCard 
                            video={v} 
                            creator={profile} 
                            onMore={() => {}} 
                            onPlay={() => {}} 
                            isActive={activeVideoId === v.id} 
                            onSetActive={() => setActiveVideoId(v.id)} 
                            onOpenComments={() => setCommentSheetVideoId(v.id)} 
                            isLiked={!!likedVideos[v.id]} 
                            onToggleLike={() => setLikedVideos(prev => ({ ...prev, [v.id]: !prev[v.id] }))} 
                            hideCreatorInfo={true}
                            isVertical={v.type?.toLowerCase() === "short"}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Premium" && (
                <div className="w-full">
                  {videos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {videos.map((video) => (
                        <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer relative">
                          <div className="relative aspect-square">
                            <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-40" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                              <Lock size={24} className="text-[#E53945] mb-2" />
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Premium</span>
                            </div>
                          </div>
                          <div className="p-3 text-left opacity-50"><h3 className="text-sm font-bold leading-tight line-clamp-1">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Shop" && (
                <div className="w-full">
                  {localMerch.length === 0 ? (
                    <div className="text-center py-12 bg-[#1c1c1e] border border-white/5 rounded-2xl"><ShoppingBag size={32} className="mx-auto text-white/20 mb-3" /><p className="text-white/50 text-sm">No products available yet.</p></div>
                  ) : isReordering ? (
                    // REORDER MODE
                    <div className="bg-[#1c1c1e]/50 p-4 rounded-2xl border border-[#E53945]/30">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-bold text-white">Drag to reorder</p>
                        <div className="flex gap-2">
                          <button onClick={() => { setIsReordering(false); setLocalMerch(merch); }} className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white bg-white/5 rounded-lg transition">Cancel</button>
                          <button onClick={saveOrder} className="px-4 py-2 text-xs font-bold text-white bg-[#E53945] hover:bg-[#d12e39] rounded-lg transition">Save Order</button>
                        </div>
                      </div>
                      <Reorder.Group axis="y" values={localMerch} onReorder={setLocalMerch} className="flex flex-col gap-3">
                        {localMerch.map((item) => (
                          <Reorder.Item key={item.id} value={item} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-lg">
                            <GripVertical size={20} className="text-white/30" />
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0"><img src={item.image_url} alt={item.name} className="w-full h-full object-cover select-none pointer-events-none" style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }} draggable={false} /></div>
                            <div className="flex-1 min-w-0 text-left"><h3 className="text-sm font-bold text-white truncate">{item.name}</h3></div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {localMerch.map((item) => (
                        <div 
                          key={item.id} 
                          onMouseDown={() => startPress(item)}
                          onMouseUp={cancelPress}
                          onMouseLeave={cancelPress}
                          onTouchStart={() => startPress(item)}
                          onTouchEnd={cancelPress}
                          onTouchMove={cancelPress}
                          onContextMenu={(e) => { e.preventDefault(); setSelectedMerchItem(item); }}
                          className="bg-[#1c1c1e] border border-white/10 rounded-xl overflow-hidden group cursor-pointer flex flex-col select-none relative z-10" 
                          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" }}
                        >
                          <div className="relative aspect-square pointer-events-none">
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover select-none pointer-events-none" style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }} draggable={false} />
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between text-left pointer-events-none">
                            <h3 className="text-sm font-bold leading-tight line-clamp-2 text-white">{item.name}</h3>
                            <p className="text-emerald-400 font-bold text-xs mt-2">${(item.price_cents / 100).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {localMerch.map((item) => (
                        <div 
                          key={item.id} 
                          onMouseDown={() => startPress(item)}
                          onMouseUp={cancelPress}
                          onMouseLeave={cancelPress}
                          onTouchStart={() => startPress(item)}
                          onTouchEnd={cancelPress}
                          onTouchMove={cancelPress}
                          onContextMenu={(e) => { e.preventDefault(); setSelectedMerchItem(item); }}
                          className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 select-none relative z-10" 
                          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" }}
                        >
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative pointer-events-none"><img src={item.image_url} alt={item.name} className="w-full h-full object-cover select-none pointer-events-none" style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }} draggable={false} /></div>
                          <div className="flex-1 min-w-0 text-left pointer-events-none"><h3 className="text-sm font-bold text-white truncate">{item.name}</h3><p className="text-xs text-white/50 mt-1">Merch</p></div>
                          <p className="text-emerald-400 font-bold text-sm shrink-0 pointer-events-none">${(item.price_cents / 100).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Videos" && (
                <div className="w-full">
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No {activeContentTab.toLowerCase()} found yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer">
                          <div className="relative aspect-square">
                            <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className={`absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm ${video.type?.toLowerCase() === 'podcast' ? 'bg-blue-500' : 'bg-[#E53945]'}`}>{video.type || "VIDEO"}</div>
                          </div>
                          <div className="p-3 text-left"><h3 className="text-sm font-bold leading-tight line-clamp-1">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="flex items-center gap-4 bg-[#1c1c1e] border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-[#242426] transition-colors">
                          <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative"><img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0 text-left"><h3 className="text-sm font-bold text-white truncate">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <CommentSheet
          videoId={commentSheetVideoId}
          open={commentSheetVideoId !== null}
          onClose={() => setCommentSheetVideoId(null)}
        />

        <MobileBottomNav />
      </div>
    </main>
  );
}
