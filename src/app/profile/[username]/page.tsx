"use client";
import { getCachedUser } from "@/lib/cache";

import { useEffect, useState , useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreditCard, Wallet, UserPlus, MessageSquare, CheckCircle2, LayoutGrid, List, ShoppingBag, Star, Lock, GripVertical, X, Film, Mic, Video, Music } from "lucide-react";
import CommentSheet from "@/components/CommentSheet";
import Comments from "@/components/Comments";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";
import VerifiedBadge from "@/components/VerifiedBadge";
import ShortPreviewFrame from "@/components/ShortPreviewFrame";
import { motion, AnimatePresence, Reorder } from "framer-motion";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);


function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [profile, setProfile] = useState<any>(null);
  const [profileFeature, setProfileFeature] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeContentTab, setActiveContentTab] = useState<"Videos" | "Audio" | "Premium" | "Shop">("Videos");

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [resolvedCreatorId, setResolvedCreatorId] = useState<number | null>(null);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getCachedUser().then(setCurrentUser);
    async function loadProfileAndVideos() {
      const supabase = createClient();
      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("username", username).single();
      
      if (error || !profileData) { setLoading(false); return; }
      setProfile(profileData);
      fetch(`/api/profile-feature?user_id=${encodeURIComponent(profileData.user_id)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setProfileFeature(data.feature || null))
        .catch(() => {});

      let targetCreatorId = profileData.creator_id;
      if (!targetCreatorId || isNaN(Number(targetCreatorId))) {
        try {
          const creatorsRes = await fetch('/api/creators');
          const creatorsList = await creatorsRes.json();
          const creatorMatch = creatorsList.find((c: any) => String(c.user_id) === String(profileData.user_id));
          if (creatorMatch) targetCreatorId = creatorMatch.id;
          else targetCreatorId = null;
        } catch (e) { targetCreatorId = null; }
      }
      if (targetCreatorId) targetCreatorId = Number(targetCreatorId);
      console.log("DEBUG: Resolved Creator ID =", targetCreatorId);
      setResolvedCreatorId(targetCreatorId);
      const { data: { user } } = await supabase.auth.getUser();
      const followRes = await fetch(`/api/follows?creator_id=${targetCreatorId}${user ? `&user_id=${user.id}` : ""}`);
      const followData = await followRes.json();
      setFollowerCount(followData.count || 0);
      setSubscriberCount(followData.subscriberCount || 0);
      setIsFollowing(followData.isFollowing || false);

        fetch("/api/premium/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id || null, creatorId: targetCreatorId }),
        }).then(r => r.json()).then(d => setIsSubscribed(d.allowed)).catch(() => {});

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
          const isAudioType = (v: any) => ["audio", "music", "audiobook", "song", "track", "podcast-audio"].includes(String(v.type || "").toLowerCase());
          const isShortType = (v: any) => ["short", "reel"].includes(String(v.type || "").toLowerCase());
          const isPremiumType = (v: any) => v.visibility === "premium" && String(v.type || "").toLowerCase() !== "tweet";
          const hasAudio = creatorVideos.some((v: any) => isAudioType(v) && !isPremiumType(v));
          const hasLongVideos = creatorVideos.some((v: any) => !isAudioType(v) && !isShortType(v) && !isPremiumType(v) && String(v.type || "").toLowerCase() !== "tweet");
          const hasShorts = creatorVideos.some((v: any) => isShortType(v) && !isPremiumType(v));
          const hasPremium = creatorVideos.some((v: any) => isPremiumType(v));

          if (hasLongVideos || hasShorts) {
            setActiveContentTab("Videos");
          } else if (hasAudio) {
            setActiveContentTab("Audio");
          } else if (hasPremium) {
            setActiveContentTab("Premium");
          } else {
            setActiveContentTab("Shop");
          }
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

  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelSubscription = async () => {
    if (!currentUser) return alert("Please log in");
    if (!confirm("Cancel your subscription? You will keep access until the current billing period ends.")) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/wallet/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, creatorId: resolvedCreatorId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Subscription cancelled. You have access until " + new Date(data.access_until).toLocaleDateString());
        setIsSubscribed(false);
        if (typeof window !== "undefined") window.location.reload();
      } else {
        alert(data.error || "Could not cancel subscription.");
      }
    } catch (e) {
      alert("Network error.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSubscribeCard = async () => {
      if (currentUser === null) return router.push("/login");
      if (profile?.user_id === undefined) return alert("Could not find this creator ID.");
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, type: "creator", creatorId: profile.user_id }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else alert(data.error || "Could not start subscription.");
      } catch (err) {
        console.error(err);
        alert("Network error starting subscription.");
      }
    };

    const handleSubscribeCoins = async () => {
      if (currentUser === null) return router.push("/login");
      if (resolvedCreatorId === null) return alert("Could not find creator ID.");
      try {
        const res = await fetch("/api/wallet/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, creatorId: resolvedCreatorId }),
        });
        const data = await res.json();
        if (res.ok) {
          setIsSubscribed(true);
          setShowSubscribeModal(false);
          alert("Subscribed successfully!");
        } else {
          if (data.error && data.error.toLowerCase().includes("insufficient")) { if (confirm("You do not have enough TrooCoins. Would you like to top up your wallet?")) { router.push("/wallet?topup=true"); } } else { alert(data.error || "Could not subscribe with coins."); }
        }
      } catch (err) {
        console.error(err);
        alert("Network error.");
      }
    };

    const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile || isSubmittingFollow) return;
    setIsSubmittingFollow(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return window.location.href = "/login";

    const targetCreatorId = resolvedCreatorId;
    if (!targetCreatorId || isNaN(Number(targetCreatorId))) {
      alert("Error: Could not find this creator's numeric ID. Please refresh the page and try again.");
      return;
    }
    if (!targetCreatorId) return alert("Could not find this creator's ID.");
    const newIsFollowing = !isFollowing;
    
    setIsFollowing(newIsFollowing);
    setFollowerCount((prev: number) => prev + (newIsFollowing ? 1 : -1));

    try {
      const payload = { userId: user.id, creatorId: targetCreatorId };
      console.log("DEBUG: Sending follow payload:", payload);
      
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Follow failed");
      }
    } catch (e: any) {
      console.error("Follow error:", e);
      setIsFollowing(!newIsFollowing);
      setFollowerCount((prev: number) => prev + (newIsFollowing ? -1 : 1));
      alert("Follow failed: " + (e.message || "Unknown error"));
    } finally {
      setIsSubmittingFollow(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!profile) return <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4"><h1 className="text-2xl font-bold mb-4">User not found</h1><Link href="/" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Go Home</Link></main>;

  const displayName = profile.display_name || "User";
  const featuredVideo = profileFeature?.mode === "video"
    ? videos.find((video: any) => String(video.id) === String(profileFeature.videoId))
    : null;
  const subscriptionPrice = profile.premium_price_cents ? (profile.premium_price_cents / 100).toFixed(2) : "3.99";

  const filteredVideos = videos.filter(v => {
    const type = (v.type || "").toLowerCase();
    const isAudio = ["audio", "music", "audiobook", "song", "track", "podcast-audio"].includes(type);
    const isShort = type === "short" || type === "reel";
    const isPremium = v.visibility === "premium";

    if (activeContentTab === "Audio") {
      return isAudio && !isPremium;
    }
    if (activeContentTab === "Videos") {
      if (type === "tweet" || isPremium || isAudio) return false;
      return true;
    }
    if (activeContentTab === "Premium") {
      return isPremium && type !== "tweet";
    }
    return true;
  });

  const bgStyle = profile.backdrop_url
    ? profile.backdrop_url.startsWith("http")
      ? { backgroundImage: `url(${profile.backdrop_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: profile.backdrop_url }
    : { background: "#09090B" };

  const heroMedia =
    profileFeature?.mode === "custom" && profileFeature.mediaType === "video"
      ? { type: "video" as const, src: profileFeature.mediaUrl }
      : profileFeature?.mode === "custom" && profileFeature.mediaType === "image"
      ? { type: "image" as const, src: profileFeature.mediaUrl }
      : featuredVideo
      ? {
          type: "video" as const,
          src: featuredVideo.videoUrl || featuredVideo.bitchuteUrl,
          poster: featuredVideo.posterUrl || featuredVideo.backdropUrl,
        }
      : profile.backdrop_url && profile.backdrop_url.startsWith("http")
      ? { type: "image" as const, src: profile.backdrop_url }
      : null;


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
    <main className={`min-h-screen text-white pb-32 font-sans selection:bg-[#E53945]/30 relative overflow-hidden bg-[#09090B]`}>
      
      {/* Background */}
      <div className="fixed inset-0 z-0 lg:hidden" style={bgStyle}>
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="fixed inset-0 z-0 hidden lg:block bg-[#09090B]" />

      <div className="relative z-10">
        <TopBar />

        {/* Desktop wall-to-wall featured hero behind profile info */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-[560px] overflow-hidden lg:block xl:h-[620px]">
          {heroMedia?.type === "video" ? (
            <video
              src={heroMedia.src}
              poster={(heroMedia as any).poster}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : heroMedia?.type === "image" ? (
            <img src={heroMedia.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : profile.backdrop_url && !profile.backdrop_url.startsWith("http") ? (
            <div className="absolute inset-0" style={{ background: profile.backdrop_url }} />
          ) : (
            <div className="absolute inset-0 bg-[#09090B]" />
          )}
          {/* Fade black-to-light left to right */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#09090B] to-transparent" />
        </div>
        
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-[calc(env(safe-area-inset-top)+4rem)] pb-6 lg:max-w-none lg:px-10 xl:px-16 lg:pt-28">

          {/* CREATOR-STYLE PROFILE LAYOUT */}
          <div className="animate-in fade-in duration-300">
            {/* Desktop: 3-column profile header */}
            <div className="hidden lg:grid lg:grid-cols-3 lg:gap-10 lg:items-start mb-8 w-full">
              <div className="flex items-start justify-start">
                <div
                  onClick={() => profile.is_live && router.push(`/live/${profile.username}`)}
                  className={`w-44 h-44 xl:w-56 xl:h-56 rounded-full p-[4px] shrink-0 relative ${profile.is_live ? 'cursor-pointer bg-red-600 animate-pulse' : 'bg-gradient-to-tr from-[#E53945] to-orange-500'}`}
                >
                  <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e] relative">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-bold">{displayName.charAt(0)}</div>
                    )}
                    {profile.is_live && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-sm font-bold bg-red-600 px-3 py-1.5 rounded-sm shadow-lg whitespace-nowrap">WATCH LIVE</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1 w-full flex-wrap">
                  <h1 className="text-3xl xl:text-4xl font-black flex items-center gap-2 text-white">
                    {displayName} {(profile as any).verification_tick && (profile as any).verification_tick !== "none" && <VerifiedBadge size={22} variant={(profile as any).verification_tick as any} />}
                  </h1>
                  <button
                    onClick={handleFollow}
                    disabled={isSubmittingFollow}
                    className={`shrink-0 flex items-center justify-center gap-1.5 font-bold px-5 py-1.5 rounded-full transition shadow-lg text-sm ${isSubmittingFollow ? "opacity-50 cursor-wait" : isFollowing ? "bg-white/10 text-white border border-white/20" : "bg-white text-black hover:bg-gray-200"}`}
                  >
                    <UserPlus size={16} /> {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
                <p className="text-base text-white/50 mb-3">@{username}</p>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
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
                <p className="text-sm text-white/70 leading-relaxed mb-5">{profile.bio || "No bio yet."}</p>
                <div className="flex gap-3 w-full max-w-xl">
                  {isSubscribed ? (
                    <>
                      <button onClick={handleCancelSubscription} disabled={cancelLoading} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-red-500/20 text-red-400 font-semibold px-5 py-2 rounded-full text-sm transition border border-red-500/30 disabled:opacity-50">
                        <X size={16} /> {cancelLoading ? "Cancelling..." : "Subscribed"}
                      </button>
                      <Link href={`/messages/${profile.user_id}`} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2 rounded-full text-sm transition border border-white/10">
                        <MessageSquare size={16} /> Message
                      </Link>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setShowSubscribeModal(true)} className="inline-flex items-center justify-center gap-2 bg-[#E53945] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20">
                        <Star size={16} fill="currentColor" /> Subscribe
                      </button>
                      <button onClick={() => setShowSubscribeModal(true)} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2 rounded-full text-sm transition border border-white/10">
                        <MessageSquare size={16} /> Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6 lg:pl-4">
                <div className="text-left"><span className="font-black text-white block text-3xl xl:text-4xl">{formatNumber(followerCount)}</span> <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">Followers</span></div>
                <div className="text-left"><span className="font-black text-white block text-3xl xl:text-4xl">{formatNumber(subscriberCount)}</span> <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">Subscribers</span></div>
                <div className="text-left"><span className="font-black text-white block text-3xl xl:text-4xl">{videos.length}</span> <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">Posts</span></div>
              </div>
            </div>

            {/* Mobile/tablet: original profile header */}
            <div className="lg:hidden">
              <div className="flex flex-col mb-6 w-full">
                <div className="flex items-center gap-4 w-full mb-4">
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
                  <div className="flex-1 flex justify-around md:justify-start md:gap-8 px-2">
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(followerCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(subscriberCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Subscribers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{videos.length}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span></div>
                  </div>
                </div>
                <div className="px-1">
                  <div className="flex items-center gap-3 mb-1 w-full">
                    <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-white">
                      {displayName} {(profile as any).verification_tick && (profile as any).verification_tick !== "none" && <VerifiedBadge size={20} variant={(profile as any).verification_tick as any} />}
                    </h1>
                    <button
                      onClick={handleFollow}
                      disabled={isSubmittingFollow}
                      className={`shrink-0 flex items-center justify-center gap-1.5 font-bold px-5 py-1.5 rounded-full transition shadow-lg text-sm ${isSubmittingFollow ? "opacity-50 cursor-wait" : isFollowing ? "bg-white/10 text-white border border-white/20" : "bg-white text-black hover:bg-gray-200"}`}
                    >
                      <UserPlus size={16} /> {isFollowing ? "Following" : "Follow"}
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
              <div className="flex gap-3 mb-8">
                {isSubscribed ? (
                  <>
                    <button onClick={handleCancelSubscription} disabled={cancelLoading} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-red-500/20 text-red-400 font-semibold px-5 py-2 rounded-full text-sm transition border border-red-500/30 disabled:opacity-50">
                      <X size={16} /> {cancelLoading ? "Cancelling..." : "Subscribed"}
                    </button>
                    <Link href={`/messages/${profile.user_id}`} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2 rounded-full text-sm transition border border-white/10">
                      <MessageSquare size={16} /> Message
                    </Link>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowSubscribeModal(true)} className="inline-flex items-center justify-center gap-2 bg-[#E53945] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#d12e39] transition shadow-lg shadow-[#E53945]/20">
                      <Star size={16} fill="currentColor" /> Subscribe
                    </button>
                    <button onClick={() => setShowSubscribeModal(true)} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2 rounded-full text-sm transition border border-white/10">
                      <MessageSquare size={16} /> Message
                    </button>
                  </>
                )}
              </div>
            </div>
{/* TABS & CONTENT */}
            <div className="flex items-center justify-between border-b border-white/10 mb-4">
              <div className="flex items-center gap-6 sm:gap-8">
                {(["Videos", "Audio", "Premium", "Shop"] as const).map((tab) => {
                  const active = activeContentTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveContentTab(tab)}
                      className={`pb-3 text-sm font-bold transition-colors border-b-2 ${active ? "text-white border-[#E53945]" : "text-white/50 hover:text-white border-transparent"}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 mb-2">
                <button onClick={() => setContentView("grid")} aria-label="Grid view" className={`p-1.5 transition ${contentView === "grid" ? "text-white" : "text-white/40 hover:text-white"}`}><LayoutGrid size={18} /></button>
                <button onClick={() => setContentView("list")} aria-label="List view" className={`p-1.5 transition ${contentView === "list" ? "text-white" : "text-white/40 hover:text-white"}`}><List size={18} /></button>
              </div>
            </div>



            <div className="w-full">
              {activeContentTab === "Audio" && (
                filteredVideos.length === 0 ? (
                  <div className="py-20 text-center text-white/50">No audio yet.</div>
                ) : contentView === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-20">
                    {filteredVideos.map((video) => (
                      <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="relative aspect-square bg-black/40">
                          {video.posterUrl || video.backdropUrl ? (
                            <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Music size={28} className="text-white/30" /></div>
                          )}
                          <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 border border-white/10 text-white"><Music size={13} /></div>
                        </div>
                        <div className="p-3"><h3 className="text-sm font-bold text-white line-clamp-2">{video.title}</h3><p className="text-[11px] text-white/45 mt-1 capitalize">{String(video.type || "audio")}</p></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-20">
                    {filteredVideos.map((video) => (
                      <div key={video.id} className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 rounded-xl p-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-black/40 flex items-center justify-center">
                          {video.posterUrl || video.backdropUrl ? <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" /> : <Music size={16} className="text-white/40" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white truncate">{video.title}</div>
                          <div className="text-[11px] text-white/45 capitalize">{String(video.type || "audio")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

    {activeContentTab === "Premium" && (
                <div className="w-full">
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="grid grid-cols-3 gap-4">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="bg-[#1c1c1e] border border-white/10 rounded-2xl overflow-hidden group cursor-pointer relative">
                          <div className="relative aspect-square">
                            <img src={video.posterUrl || video.backdropUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-40" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40]">
                              <Lock size={24} className="text-[#E53945] mb-2" />
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Premium</span>
                            </div>
                          </div>
                          <div className="p-3 text-left opacity-50"><h3 className="text-sm font-bold leading-tight line-clamp-1">{video.title}</h3></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pb-20">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 rounded-xl p-2 cursor-pointer hover:bg-[#242426] transition">
                          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-black">
                            <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-bold text-white truncate flex-1 min-w-0">{video.title}</span>
                          <Lock size={14} className="text-[#E53945] shrink-0" />
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
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[2px] -mx-4 sm:mx-0 pb-20">
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
                          className="group relative bg-[#1c1c1e] overflow-hidden cursor-pointer select-none"
                          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" }}
                        >
                          <div className="aspect-square relative bg-black">
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover select-none pointer-events-none" style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", pointerEvents: "none" }} draggable={false} />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-2.5 pt-10 pointer-events-none">
                              <h3 className="text-xs font-bold text-white truncate">{item.name}</h3>
                              <p className="text-[11px] font-bold text-emerald-400 mt-0.5">${(item.price_cents / 100).toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Videos" && (
                <div className="w-full">
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No videos found yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="-mx-4 sm:-mx-4 lg:mx-0 grid grid-cols-3 gap-[2px] pb-20 sm:gap-1 lg:grid-cols-6 lg:gap-3">
                      {filteredVideos.map((video) => {
                        const type = String(video.type || "").toLowerCase();
                        const isShort = type === "short" || type === "reel";
                        const isPodcast = type === "podcast";
                        if (isShort) {
                          return (
                            <Link key={video.id} href={`/feed?creator_user_id=${encodeURIComponent(profile.user_id)}${resolvedCreatorId ? `&creator_id=${resolvedCreatorId}` : ""}&reel=${video.id}`} aria-label={`Watch ${video.title}`} className="group relative aspect-[3/4] overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 lg:shadow-lg">
                              <ShortPreviewFrame src={video.videoUrl || video.bitchuteUrl} poster={video.posterUrl || video.backdropUrl} alt="" />
                            </Link>
                          );
                        }
                        return (
                          <div key={video.id} className="relative aspect-[3/4] overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 lg:shadow-lg cursor-pointer">
                            <img src={video.posterUrl || video.backdropUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white shadow-md" title={isPodcast ? "Podcast" : "Long video"}>
                              {isPodcast ? <Mic size={13} /> : <Film size={13} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 pb-20">
                      {filteredVideos.map((video) => {
                        const type = String(video.type || "").toLowerCase();
                        const isShort = type === "short" || type === "reel";
                        const isPodcast = type === "podcast";
                        if (isShort) {
                          return (
                            <Link key={video.id} href={`/feed?creator_user_id=${encodeURIComponent(profile.user_id)}${resolvedCreatorId ? `&creator_id=${resolvedCreatorId}` : ""}&reel=${video.id}`} className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 hover:bg-[#242426] rounded-xl p-2 transition">
                              <div className="relative w-14 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-black">
                                <ShortPreviewFrame src={video.videoUrl || video.bitchuteUrl} poster={video.posterUrl || video.backdropUrl} alt="" />
                              </div>
                              <span className="text-sm font-bold text-white truncate">{video.title}</span>
                            </Link>
                          );
                        }
                        return (
                          <div key={video.id} className="flex items-center gap-3 bg-[#1c1c1e] border border-white/10 rounded-xl p-2 cursor-pointer hover:bg-[#242426] transition">
                            <div className="relative w-14 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-black">
                              <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-sm font-bold text-white truncate flex-1 min-w-0">{video.title}</span>
                            {isPodcast ? <Mic size={14} className="text-white/60 shrink-0" /> : <Film size={14} className="text-white/60 shrink-0" />}
                          </div>
                        );
                      })}
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
    
      {showSubscribeModal && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowSubscribeModal(false)}>
          <div className="bg-[#0f0f12] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-center mb-2">Subscribe to {displayName}</h2>
            <p className="text-white/50 text-sm text-center mb-6">Pay with TrooCoins</p>

            <div className="space-y-3">
              

              <button onClick={handleSubscribeCoins} className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 hover:bg-white/5 transition text-left group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white group-hover:text-[#D4AF37] transition">Pay with TrooCoins</p>
                    <p className="text-xs text-white/50">${subscriptionPrice} TC</p>
                  </div>
                </div>
              </button>
            </div>
            
            <button onClick={() => setShowSubscribeModal(false)} className="w-full mt-4 py-3 text-white/50 hover:text-white text-sm font-semibold transition">Cancel</button>
          </div>
        </div>
      )}
</main>
  );
}
