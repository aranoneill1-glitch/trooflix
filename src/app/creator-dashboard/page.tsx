"use client";
import { ChevronRight , Tag, MoreVertical , Download, Wallet , MessageCircle } from "lucide-react";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Video, CheckCircle2, MessageSquare, Eye, Star, Pencil, 
  ShoppingBag, LayoutDashboard, LayoutGrid, List, Package, Palette, Camera, Trash2, X, Radio, Inbox, Plus, Play, Lock, Shield, CreditCard, Mic, Film, Music, Image as ImageIcon, Loader2, Repeat2
} from "lucide-react";

import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser, clearUserCache, getCachedVideos, getCachedProducts, invalidateVideosCache } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import MyTrooFlixContent from "@/components/MyTrooFlixContent";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";
import CreatorStudioNav from "@/components/CreatorStudioNav";
import ShortPreviewFrame from "@/components/ShortPreviewFrame";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";
import VideoFramePicker from "@/components/VideoFramePicker";


const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

function CreatorDashboardContent() {
  const searchParams = useSearchParams();
  const isPublicView = searchParams.get('view') === 'public';
  const studioTab = searchParams.get("studioTab");
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profileFeatureInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const creatorToolsUnlocked = !!profile?.creator_tools_unlocked;
  // Legacy tier kept for compatibility during transition; all users get base features.
  const userTier: "free" | "plus" | "creator" = creatorToolsUnlocked ? "creator" : "plus";
  const isFreeTier = false;
  const [loading, setLoading] = useState(true);
  const [isDashboardView, setIsDashboardView] = useState(false);
  const [showMyTrooFlix, setShowMyTrooFlix] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAddContentMenu, setShowAddContentMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileFeature, setProfileFeature] = useState<any>(null);
  const [uploadingProfileFeature, setUploadingProfileFeature] = useState(false);

  useEffect(() => {
    if (isPublicView || studioTab === "profile") {
      setIsDashboardView(false);
      setShowMyTrooFlix(false);
    } else if (studioTab === "dashboard") {
      setIsDashboardView(true);
      setShowMyTrooFlix(false);
    } else if (studioTab === "mytrooflix") {
      setIsDashboardView(false);
      setShowMyTrooFlix(true);
    }
  }, [isPublicView, studioTab]);
  
  const [contentView, setContentView] = useState<"grid" | "list">("grid");
  const [activeContentTab, setActiveContentTab] = useState<"Videos" | "Reshares" | "Premium" | "Shop">("Videos");

  const [creatorVideos, setCreatorVideos] = useState<any[]>([]);
  const [resharedVideos, setResharedVideos] = useState<any[]>([]);
  const [merch, setMerch] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const videoPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressFired = useRef(false);
  const [selectedVideoAction, setSelectedVideoAction] = useState<any>(null);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [framePickerVideo, setFramePickerVideo] = useState<any>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedMerchItem, setSelectedMerchItem] = useState<any>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (u) {
        setUser(u);
        fetch(`/api/profile-feature?user_id=${encodeURIComponent(u.id)}`)
          .then((r) => r.json())
          .then((data) => setProfileFeature(data.feature || null))
          .catch(() => {});
        
        // Fast parallel fetch for primary data
        const [profResult, crResult, allVideos, allProducts, profileApi, repostData] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", u.id).single(),
          fetch(`/api/me/creator?user_id=${u.id}`).then(r => r.json()).catch(() => ({})),
          getCachedVideos().catch(() => []),
          getCachedProducts().catch(() => []),
          fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => null),
          fetch(`/api/reposts?user_id=${u.id}`, { cache: "no-store" }).then(r => r.json()).catch(() => ({ ids: [] })),
        ]);

        const prof = profResult.data;
        if (prof) setProfile({ ...prof, creator_tools_unlocked: !!profileApi?.profile?.creator_tools_unlocked || prof.verification_tick === "plus_red" || prof.verification_tick === "creator_gold" || prof.is_verified === true });

        const myVideos = Array.isArray(allVideos) ? allVideos.filter((v: any) => 
          String(v.uploaderUserId) === String(u.id)
        ) : [];
        setCreatorVideos(myVideos);
        const repostIds = new Set((repostData?.ids || []).map((id: any) => Number(id)));
        const reshared = Array.isArray(allVideos) ? allVideos.filter((v: any) => repostIds.has(Number(v.id)) && String(v.type || "").toLowerCase() !== "tweet") : [];
        setResharedVideos(reshared);
        setVideosLoading(false);

        const cid = crResult.creator?.id;
        if (Array.isArray(allProducts)) {
          setMerch(allProducts.filter((p: any) => String(p.creator_id) === String(cid) || String(p.creator_id) === String(u.id)));
        }

        // Resolve numeric creator ID for follower & subscriber counts
        let targetCreatorId: number | null = crResult?.creator?.id ?? prof?.creator_id ?? null;
        if (targetCreatorId != null) targetCreatorId = Number(targetCreatorId);
        if (!targetCreatorId || isNaN(targetCreatorId)) {
          try {
            const creatorsRes = await fetch("/api/creators");
            const creatorsList = await creatorsRes.json();
            const creatorMatch = Array.isArray(creatorsList)
              ? creatorsList.find((c: any) => String(c.user_id) === String(u.id) || String(c.ownerUserId) === String(u.id))
              : null;
            if (creatorMatch?.id != null) targetCreatorId = Number(creatorMatch.id);
          } catch {}
        }

        if (targetCreatorId && !isNaN(targetCreatorId)) {
          try {
            const followRes = await fetch(`/api/follows?creator_id=${targetCreatorId}`);
            const followData = await followRes.json();
            setFollowerCount(followData.count || 0);
            setSubscriberCount(followData.subscriberCount || 0);
          } catch {
            setFollowerCount(0);
            setSubscriberCount(0);
          }
        } else {
          setFollowerCount(0);
          setSubscriberCount(0);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
  }, [supabase]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);

    try {
      let processedBlob: Blob;

      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        const MAX = 512;
        let w = bitmap.width;
        let h = bitmap.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * MAX; h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");
        ctx.drawImage(bitmap, 0, 0, w, h);
        
        processedBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed to export canvas")), "image/jpeg", 0.85);
        });
      } catch (decodeErr) {
        processedBlob = file;
      }

      if (processedBlob.size === 0) {
        throw new Error("Image is 0 bytes. Open Photos, wait for it to download from iCloud, then retry.");
      }

      const r2Res = await fetch("/api/r2-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "avatar.jpg", contentType: "image/jpeg" }),
      });
      const r2Data = await r2Res.json();
      if (!r2Res.ok) throw new Error("Failed to get R2 upload URL");

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", r2Data.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", "image/jpeg");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(true);
          else reject(new Error("Upload failed: " + xhr.status));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(processedBlob);
      });

      const { error } = await supabase.from("profiles").update({
        avatar_url: r2Data.publicUrl
      }).eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: r2Data.publicUrl });
      setShowAvatarMenu(false);
      clearUserCache();

    } catch (err: any) {
      alert(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileFeatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    const mediaType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
    const maxBytes = mediaType === "image" ? 20 * 1024 * 1024 : 250 * 1024 * 1024;
    if (!mediaType || file.size > maxBytes) {
      alert(mediaType ? "Images must be 20 MB or smaller; videos must be 250 MB or smaller." : "Choose an image or video file.");
      return;
    }

    setUploadingProfileFeature(true);
    try {
      const signed = await fetch("/api/profile-feature/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not prepare upload");
        return data;
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Network error while uploading"));
        xhr.send(file);
      });

      const saved = await fetch("/api/profile-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", mediaType, mediaUrl: signed.publicUrl }),
      }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not save profile feature");
        return data;
      });
      setProfileFeature(saved.feature);
    } catch (error: any) {
      alert(error.message || "Could not upload profile feature.");
    } finally {
      setUploadingProfileFeature(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const { error } = await supabase.from("profiles").update({
        avatar_url: null
      }).eq("user_id", user.id);

      if (error) throw error;
      
      setProfile({ ...profile, avatar_url: null });
      setShowAvatarMenu(false);
      clearUserCache();
    } catch (err) {
      alert("Failed to remove avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;
  if (!user) return <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center px-4"><h1 className="text-2xl font-bold mb-4">Log in to view your profile</h1><Link href="/login" className="bg-[#E53945] text-white font-bold px-8 py-3 rounded-full">Log In</Link></main>;

  const displayName = profile?.display_name || "Creator Name";
  const username = profile?.username || "creator";

  const profileFeatureVideo = profileFeature?.mode === "video"
    ? creatorVideos.find((video) => String(video.id) === String(profileFeature.videoId))
    : null;

  const filteredVideos = activeContentTab === "Reshares"
    ? resharedVideos
    : creatorVideos.filter(v => {
    const type = (v.type || "").toLowerCase();
    const isAudio = ["audio", "music", "audiobook", "song", "track", "podcast-audio"].includes(type);
    const isPremium = v.visibility === "premium";

    if (activeContentTab === "Videos") {
      if (type === "tweet" || isPremium || isAudio) return false;
      return true;
    }
    if (activeContentTab === "Premium") {
      return isPremium && type !== "tweet";
    }
    return true;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const bgStyle = profile?.backdrop_url
    ? profile.backdrop_url.startsWith("http")
      ? { backgroundImage: `url(${profile.backdrop_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: profile.backdrop_url }
    : { background: "#09090B" };

  const heroMedia =
    profileFeature?.mode === "custom" && profileFeature.mediaType === "video"
      ? { type: "video" as const, src: profileFeature.mediaUrl }
      : profileFeature?.mode === "custom" && profileFeature.mediaType === "image"
      ? { type: "image" as const, src: profileFeature.mediaUrl }
      : profileFeature?.mode === "video" && profileFeatureVideo
      ? {
          type: "video" as const,
          src: profileFeatureVideo.videoUrl || profileFeatureVideo.bitchuteUrl,
          poster: profileFeatureVideo.posterUrl || profileFeatureVideo.backdropUrl,
        }
      : profile?.backdrop_url && profile.backdrop_url.startsWith("http")
      ? { type: "image" as const, src: profile.backdrop_url }
      : null;



  
  const startPress = (item: any) => {
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

  const startVideoPress = (video: any) => {
    longPressFired.current = false;
    videoPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelectedVideoAction(video);
    }, 500);
  };

  const cancelVideoPress = () => {
    if (videoPressTimer.current) {
      clearTimeout(videoPressTimer.current);
      videoPressTimer.current = null;
    }
  };

  const handleVideoCardClick = (e: React.MouseEvent, video?: any) => {
    if (longPressFired.current) {
      e.preventDefault();
      longPressFired.current = false;
      return;
    }
    if (video?.videoUrl || video?.bitchuteUrl) setPlayingVideo(video);
  };

  const deleteVideo = async (video: any) => {
    if (!confirm(`Delete "${video.title || "this video"}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/user/posts?id=${video.id}&userId=${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete this video.");
      setCreatorVideos((prev) => prev.filter((v) => v.id !== video.id));
      setSelectedVideoAction(null);
    } catch (e: any) {
      alert(e.message || "Could not delete this video.");
    }
  };

  const startPreviewChange = (video: any) => {
    setPreviewError("");
    setSelectedVideoAction(null);
    setFramePickerVideo(video);
  };

  const uploadPreviewBlob = async (videoId: number, blob: Blob, filename: string, contentType: string) => {
    setUploadingPreview(true);
    setPreviewError("");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please sign in again to change the preview.");

      const signRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ filename, contentType, folder: "thumbnails" }),
      });
      if (!signRes.ok) throw new Error("Could not start preview upload.");
      const { signedUrl, publicUrl } = await signRes.json();

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: blob,
      });
      if (!putRes.ok) throw new Error("Could not upload preview image.");

      const updRes = await fetch("/api/videos/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: videoId, posterUrl: publicUrl, backdropUrl: publicUrl }),
      });
      if (!updRes.ok) throw new Error("Could not save preview.");

      invalidateVideosCache();
      setCreatorVideos((prev) =>
        prev.map((v) => v.id === videoId ? { ...v, posterUrl: publicUrl, backdropUrl: publicUrl } : v)
      );
    } catch (e: any) {
      setPreviewError(e?.message || "Could not change preview.");
      alert(e?.message || "Could not change preview.");
    } finally {
      setUploadingPreview(false);
    }
  };

  const handleFramePick = async (blob: Blob) => {
    if (!framePickerVideo) return;
    const id = framePickerVideo.id;
    setFramePickerVideo(null);
    await uploadPreviewBlob(id, blob, `preview-${id}.jpg`, blob.type || "image/jpeg");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", id);
    setMerch(prev => prev.filter(p => p.id !== id));
    setSelectedMerchItem(null);
  };

  const saveOrder = async () => {
    setIsReordering(false);
    const supabase = createClient();
    const updates = merch.map((item, index) => ({
      id: item.id,
      sort_order: index,
      name: item.name,
      price_cents: item.price_cents,
      image_url: item.image_url,
      creator_id: item.creator_id
    }));
    await supabase.from("products").upsert(updates);
    alert("Order saved successfully!");
  };

  // iOS anti-callout guard
  const iosGuardStyle = {
    WebkitTouchCallout: "none" as const,
    WebkitUserSelect: "none" as const,
    userSelect: "none" as const,
    WebkitTapHighlightColor: "transparent" as const,
  };

  return (
    <main className={`min-h-screen text-white pb-32 font-sans selection:bg-[#E53945]/30 relative overflow-hidden bg-[#09090B]`}>
      
      {/* Mobile/tablet backdrop */}
      {profile?.backdrop_url && (
        <div className="fixed inset-0 z-0 lg:hidden" style={bgStyle}>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      <div className="fixed inset-0 z-0 hidden lg:block bg-[#09090B]" />

      <div className="relative z-10">
        <TopBar />

        {/* Desktop wall-to-wall featured hero behind profile info */}
        {!isDashboardView && !showMyTrooFlix && (
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
            ) : profile?.backdrop_url && !profile.backdrop_url.startsWith("http") ? (
              <div className="absolute inset-0" style={{ background: profile.backdrop_url }} />
            ) : (
              <div className="absolute inset-0 bg-[#09090B]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#09090B] to-transparent" />
          </div>
        )}

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-[calc(env(safe-area-inset-top)+76px)] pb-6 lg:max-w-none lg:px-10 xl:px-16">
          
          {(isDashboardView || showMyTrooFlix) && (
            <CreatorStudioNav
              active={showMyTrooFlix ? "mytrooflix" : "dashboard"}
              dashboardLocked={false}
              onViewChange={(section) => {
                setIsDashboardView(section === "dashboard");
                setShowMyTrooFlix(section === "mytrooflix");
              }}
            />
          )}

          {showMyTrooFlix && <MyTrooFlixContent embedded />}

          {!isDashboardView && !showMyTrooFlix && (
            <div className="animate-in fade-in duration-300">
              <div className="hidden lg:block">
                <CreatorStudioNav
                  active="profile"
                  className="mb-6"
                  dashboardLocked={false}
                  onViewChange={(section) => {
                    setIsDashboardView(section === "dashboard");
                    setShowMyTrooFlix(section === "mytrooflix");
                  }}
                />
              </div>
              <div className="hidden lg:grid lg:grid-cols-3 lg:gap-10 lg:items-start mb-8 w-full">
                <div className="flex items-start justify-start">
                  <div onClick={() => setShowAvatarMenu(true)} className="w-44 h-44 xl:w-56 xl:h-56 rounded-full p-[4px] bg-gradient-to-tr from-[#E53945] to-orange-500 shrink-0 cursor-pointer group relative">
                    <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e] relative">
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl font-bold">{displayName.charAt(0)}</div>}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={28} className="text-white" /></div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <h1 className="text-3xl xl:text-4xl font-black flex min-w-0 items-center gap-2 text-white"><Link href={`/profile/${username}`} className="hover:text-[#F06A72] transition-colors">{displayName}</Link> {profile?.verification_tick && profile.verification_tick !== "none" && <VerifiedBadge size={22} variant={profile.verification_tick as any} />}</h1>
                  <p className="text-base text-white/50 mt-1 mb-3"><Link href={`/profile/${username}`} className="hover:text-white transition-colors">@{username}</Link></p>
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><InstagramIcon size={14} /><span className="text-xs font-semibold">{profile?.instagram_handle || "@instagram"}</span></a>
                    <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><XIcon size={14} /><span className="text-xs font-semibold">{profile?.x_handle || "@x"}</span></a>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed mb-5">{profile?.bio || "No bio yet."}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {creatorToolsUnlocked ? (
                      <Link href="/creator-dashboard/live" className="inline-flex items-center gap-2 rounded-full border border-[#E53945]/70 px-4 py-2 text-sm font-bold text-[#F06A72] transition hover:bg-[#E53945]/10"><Radio size={15} /> Go Live</Link>
                    ) : (
                      <Link href="/wallet?topup=true&unlock=creator-tools" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white/55 transition hover:bg-white/5"><Radio size={15} /> Go Live <Lock size={11} /></Link>
                    )}
                    <button onClick={() => profileFeatureInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10">
                      <Pencil size={14} /> {uploadingProfileFeature ? "Uploading..." : "Change featured"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:pl-4">
                  <div className="text-left"><span className="font-black text-white block text-3xl xl:text-4xl">{formatNumber(followerCount)}</span> <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">Followers</span></div>
                  <div className="text-left"><span className="font-black text-white block text-3xl xl:text-4xl">{formatNumber(subscriberCount)}</span> <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">Subscribers</span></div>
                  <div className="text-left"><span className="font-black text-white block text-3xl xl:text-4xl">{creatorVideos.length}</span> <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">Posts</span></div>
                </div>
              </div>
              <div className="flex flex-col mb-6 w-full lg:hidden">
                <div className="flex items-center gap-4 w-full mb-4">
                  
                  {/* CLICKABLE AVATAR */}
                  <div 
                    onClick={() => setShowAvatarMenu(true)}
                    className="w-24 h-24 md:w-28 md:h-28 rounded-full p-[3px] bg-gradient-to-tr from-[#E53945] to-orange-500 shrink-0 cursor-pointer group relative"
                  >
                    <div className="w-full h-full rounded-full border-4 border-[#09090B] overflow-hidden bg-[#1c1c1e] relative">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-bold">{displayName.charAt(0)}</div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex justify-around md:justify-start md:gap-8 px-2">
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(followerCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Followers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{formatNumber(subscriberCount)}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Subscribers</span></div>
                    <div className="text-center md:text-left"><span className="font-bold text-white block text-xl">{creatorVideos.length}</span> <span className="text-white/50 text-[11px] uppercase tracking-wider">Posts</span></div>
                  </div>
                </div>

                <div className="px-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h1 className="text-2xl md:text-3xl font-black flex min-w-0 items-center gap-2 text-white"><Link href={`/profile/${username}`} className="hover:text-[#F06A72] transition-colors">{displayName}</Link> {profile?.verification_tick && profile.verification_tick !== "none" && <VerifiedBadge size={20} variant={profile.verification_tick as any} />}</h1>
                    {creatorToolsUnlocked ? (
                      <Link href="/creator-dashboard/live" className="mr-2 inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E53945]/70 px-3.5 py-2 text-xs font-bold text-[#F06A72] transition hover:bg-[#E53945]/10 sm:px-4 sm:text-sm"><Radio size={15} /> Go Live</Link>
                    ) : (
                      <Link href="/wallet?topup=true&unlock=creator-tools" className="mr-2 inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 text-xs font-bold text-white/55 transition hover:bg-white/5 sm:px-4 sm:text-sm"><Radio size={15} /> Go Live <Lock size={11} /></Link>
                    )}
                  </div>
                  <p className="text-sm md:text-base text-white/50 mb-3"><Link href={`/profile/${username}`} className="hover:text-white transition-colors">@{username}</Link></p>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><InstagramIcon size={14} /><span className="text-xs font-semibold">{profile?.instagram_handle || "@instagram"}</span></a>
                    <a href="#" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"><XIcon size={14} /><span className="text-xs font-semibold">{profile?.x_handle || "@x"}</span></a>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{profile?.bio || "No bio yet."}</p>
                </div>
              </div>

              <div className="lg:hidden">
                <CreatorStudioNav
                  active="profile"
                  className="mb-8"
                  dashboardLocked={false}
                  onViewChange={(section) => {
                    setIsDashboardView(section === "dashboard");
                    setShowMyTrooFlix(section === "mytrooflix");
                  }}
                />
              </div>

              <div className="flex items-center justify-between border-b border-white/10 mb-4">
                <div className="flex items-center gap-6 sm:gap-8">
                  {(["Videos", "Reshares", "Premium", "Shop"] as const).map((tab) => {
                    const active = activeContentTab === tab;
                    return (
                      <button key={tab} onClick={() => setActiveContentTab(tab)} className={`pb-3 text-sm font-bold transition-colors border-b-2 ${active ? "text-white border-[#E53945]" : "text-white/50 hover:text-white border-transparent"}`}>
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



              {activeContentTab === "Reshares" && (
                <div className="w-full">
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No reshares yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="no-image-callout -mx-4 sm:-mx-4 lg:mx-0 grid grid-cols-3 gap-[2px] pb-20 sm:gap-1 lg:grid-cols-6 lg:gap-3">
                      {filteredVideos.map((video) => (
                        <div key={video.id} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => e.preventDefault()} className="relative aspect-[3/4] overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 lg:shadow-lg cursor-pointer select-none">
                          {video.posterUrl || video.backdropUrl ? <img src={video.posterUrl || video.backdropUrl} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center bg-black/40"><Repeat2 size={24} className="text-white/30" /></div>}
                          <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white shadow-md" title="Reshared">
                            <Repeat2 size={13} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 pb-20">
                      {filteredVideos.map((video) => (
                        <div key={video.id} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => e.preventDefault()} className="flex items-center gap-3 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-white/[0.08] transition shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] select-none">
                          <div className="relative w-14 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                            {video.posterUrl || video.backdropUrl ? <img src={video.posterUrl || video.backdropUrl} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" /> : <div className="w-full h-full flex items-center justify-center"><Repeat2 size={16} className="text-white/40" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate">{video.title}</div>
                            <div className="text-[11px] text-white/45">Reshared</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Premium" && (
                <div className="w-full">
                  {filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No premium content yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="no-image-callout -mx-4 sm:-mx-4 lg:mx-0 grid grid-cols-3 gap-[2px] pb-20 sm:gap-1 lg:grid-cols-6 lg:gap-3">
                      {filteredVideos.map((video) => (
                        <div key={video.id} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => { e.preventDefault(); setSelectedVideoAction(video); }} onPointerDown={() => startVideoPress(video)} onPointerUp={cancelVideoPress} onPointerLeave={cancelVideoPress} onPointerCancel={cancelVideoPress} className="relative aspect-[3/4] overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 lg:shadow-lg cursor-pointer">
                          <img src={video.posterUrl || video.backdropUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-[#D4AF37] shadow-md" title="Premium">
                            <Lock size={13} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-image-callout flex flex-col gap-2.5 pb-20">
                      {filteredVideos.map((video) => (
                        <div key={video.id} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => { e.preventDefault(); setSelectedVideoAction(video); }} onPointerDown={() => startVideoPress(video)} onPointerUp={cancelVideoPress} onPointerLeave={cancelVideoPress} onPointerCancel={cancelVideoPress} className="flex items-center gap-3 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-white/[0.08] transition shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                          <div className="relative w-14 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                            <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-sm font-bold text-white truncate flex-1 min-w-0">{video.title}</span>
                          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/12 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                            <Lock size={14} className="text-[#D4AF37]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Shop" && (
                <div className="w-full">
                  {merch.length === 0 ? (
                    <div className="text-center py-12 bg-white/[0.08] backdrop-saturate-150 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] rounded-2xl"><ShoppingBag size={32} className="mx-auto text-white/20 mb-3" /><p className="text-white/50 text-sm">No products available yet.</p></div>
                  ) : (
                    <div className="-mx-4 sm:-mx-4 lg:mx-0 grid grid-cols-3 gap-[2px] pb-20 sm:gap-1 lg:grid-cols-6 lg:gap-3">
                      {merch.map((item) => (
                        <div
                          key={item.id}
                          onPointerDown={() => startPress(item)}
                          onPointerUp={cancelPress}
                          onPointerLeave={cancelPress}
                          onContextMenu={(e) => { e.preventDefault(); setSelectedMerchItem(item); }}
                          className="group relative aspect-square overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 cursor-pointer"
                          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                        >
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover pointer-events-none" loading="lazy" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-2 pt-8 pointer-events-none">
                            <h3 className="text-[10px] sm:text-xs font-bold text-white truncate">{item.name}</h3>
                            <p className="text-[10px] font-bold text-emerald-400">${(item.price_cents / 100).toFixed(2)}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedMerchItem(item); }} className="absolute top-1.5 right-1.5 p-1.5 bg-black/45 hover:bg-black/65 backdrop-blur-sm border border-white/10 rounded-full text-white z-20">
                            <MoreVertical size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeContentTab === "Videos" && (
                <div className="w-full">
                  {videosLoading ? (
                    <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
                  ) : filteredVideos.length === 0 ? (
                    <div className="text-center py-20 text-white/50">No videos found yet.</div>
                  ) : contentView === "grid" ? (
                    <div className="no-image-callout -mx-4 sm:-mx-4 lg:mx-0 grid grid-cols-3 gap-[2px] pb-20 sm:gap-1 lg:grid-cols-6 lg:gap-3">
                      {filteredVideos.map((video) => {
                        const type = String(video.type || "").toLowerCase();
                        const isShort = type === "short" || type === "reel";
                        const isPodcast = type === "podcast";
                        if (isShort) {
                          return (
                            <Link key={video.id} href={`/feed?creator_user_id=${encodeURIComponent(user.id)}${video.creatorId ? `&creator_id=${video.creatorId}` : ""}&reel=${video.id}`} aria-label={`Watch ${video.title}`} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => { e.preventDefault(); setSelectedVideoAction(video); }} onPointerDown={() => startVideoPress(video)} onPointerUp={cancelVideoPress} onPointerLeave={cancelVideoPress} onPointerCancel={cancelVideoPress} className="group relative aspect-[3/4] overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 lg:shadow-lg">
                              <ShortPreviewFrame src={video.videoUrl || video.bitchuteUrl} poster={video.posterUrl || video.backdropUrl} alt="" />
                            </Link>
                          );
                        }
                        return (
                          <div key={video.id} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => { e.preventDefault(); setSelectedVideoAction(video); }} onPointerDown={() => startVideoPress(video)} onPointerUp={cancelVideoPress} onPointerLeave={cancelVideoPress} onPointerCancel={cancelVideoPress} className="relative aspect-[3/4] overflow-hidden bg-[#111114] lg:rounded-xl lg:border lg:border-white/10 lg:shadow-lg cursor-pointer">
                            <img src={video.posterUrl || video.backdropUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white shadow-md" title={isPodcast ? "Podcast" : "Long video"}>
                              {isPodcast ? <Mic size={13} /> : <Film size={13} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="no-image-callout flex flex-col gap-2.5 pb-20">
                      {filteredVideos.map((video) => {
                        const type = String(video.type || "").toLowerCase();
                        const isShort = type === "short" || type === "reel";
                        const isPodcast = type === "podcast";
                        if (isShort) {
                          return (
                            <Link key={video.id} href={`/feed?creator_user_id=${encodeURIComponent(user.id)}${video.creatorId ? `&creator_id=${video.creatorId}` : ""}&reel=${video.id}`} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => { e.preventDefault(); setSelectedVideoAction(video); }} onPointerDown={() => startVideoPress(video)} onPointerUp={cancelVideoPress} onPointerLeave={cancelVideoPress} onPointerCancel={cancelVideoPress} className="flex items-center gap-3 bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:bg-white/[0.08] rounded-2xl p-3 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                              <div className="relative w-14 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                                <ShortPreviewFrame src={video.videoUrl || video.bitchuteUrl} poster={video.posterUrl || video.backdropUrl} alt="" />
                              </div>
                              <span className="text-sm font-bold text-white truncate">{video.title}</span>
                            </Link>
                          );
                        }
                        return (
                          <div key={video.id} onClick={(e) => handleVideoCardClick(e, video)} onContextMenu={(e) => { e.preventDefault(); setSelectedVideoAction(video); }} onPointerDown={() => startVideoPress(video)} onPointerUp={cancelVideoPress} onPointerLeave={cancelVideoPress} onPointerCancel={cancelVideoPress} className="flex items-center gap-3 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-3 cursor-pointer hover:bg-white/[0.08] transition shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <div className="relative w-14 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                              <img src={video.posterUrl || video.backdropUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-sm font-bold text-white truncate flex-1 min-w-0">{video.title}</span>
                            <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-white/60">
                              {isPodcast ? <Mic size={14} /> : <Film size={14} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isDashboardView && !showMyTrooFlix && !isFreeTier && (
      <>
        {/* DESKTOP BENTO BOX */}
        <div className="hidden lg:block animate-in fade-in duration-300 max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            
            {/* 1. Add */}
            <button onClick={() => setShowAddContentMenu(true)} className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-green-500/50 transition-all duration-300 text-left relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
                <Plus className="text-green-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Add</h3>
              <p className="text-sm text-white/50">Upload a new video, short, or tweet.</p>
            </button>

            {/* 2. Manage */}
            <Link href="/creator-dashboard/manage-content" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-[#E53945]/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Video className="text-white" size={24} />
                  </div>
                  <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">{creatorVideos.length} Posts</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Manage</h3>
                <p className="text-sm text-white/50">Edit, delete, or reorder your videos and long-videos.</p>
              </div>
              <div className="flex items-center text-sm font-bold text-white group-hover:text-[#E53945] transition-colors mt-6">Open Dashboard <ChevronRight size={16} className="ml-1" /></div>
            </Link>

            {/* 3. Import */}
            <Link href="/creator-dashboard/import" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-[#E53945]/50 transition-all duration-300 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#E53945]/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[#E53945]/20 transition-colors" />
              <div className="w-12 h-12 rounded-2xl bg-[#E53945]/20 flex items-center justify-center mb-6">
                <Download className="text-[#E53945]" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Import</h3>
              <p className="text-sm text-white/50 mb-6">Bring your entire back-catalog to Trooflix seamlessly.</p>
              <div className="flex items-center text-sm font-bold text-[#E53945]">Open Tool <ChevronRight size={16} className="ml-1" /></div>
            </Link>

            <Link href="/creator-dashboard/settings" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-blue-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Pencil className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Edit Profile</h3>
              <p className="text-sm text-white/50">Update your bio, links, and profile picture.</p>
            </Link>

            <Link href="/creator-dashboard/theme" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-purple-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6">
                <Palette className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Profile Theme</h3>
              <p className="text-sm text-white/50">Customize your page with colors and gradients.</p>
            </Link>

            <Link href="/creator-dashboard/shop" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-yellow-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-6">
                <ShoppingBag className="text-yellow-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Shop</h3>
              <p className="text-sm text-white/50">Add merch, books, and manage your inventory.</p>
            </Link>

            <Link href="/creator-dashboard/orders" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-blue-500/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Package className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Manage Orders</h3>
              <p className="text-sm text-white/50">Track shipments and update tracking numbers.</p>
            </Link>

            <Link href="/creator-dashboard/subscriptions" className="bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-[#D4AF37]/50 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 flex items-center justify-center mb-6">
                <Star className="text-[#D4AF37]" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Subscriptions</h3>
              <p className="text-sm text-white/50">Manage your premium tiers and pricing.</p>
            </Link>

            <Link href="/creator-dashboard/security-billing" className="col-span-full bg-white/[0.03] border border-white/10 rounded-3xl hover:bg-white/[0.08] p-6 group hover:border-white/30 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                  <Shield className="text-white/70" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Security & Billing</h3>
                  <p className="text-sm text-white/50">Update password, manage subscription and payouts.</p>
                </div>
              </div>
              <ChevronRight className="text-white/30 group-hover:text-white transition-colors shrink-0 hidden md:block" />
            </Link>
          </div>
        </div>

        {/* MOBILE OLD LIST */}
        <div className="lg:hidden animate-in fade-in duration-300 space-y-8 max-w-4xl mx-auto">
          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Profile</h2>
            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
              <Link
                href="/creator-dashboard/settings"
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Pencil className="text-blue-400" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Edit Profile</span>
              </Link>

              <Link
                href="/creator-dashboard/theme"
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Palette className="text-purple-400" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Profile Theme</span>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Content</h2>
            <div className="grid grid-cols-3 gap-3 w-full max-w-2xl">
              <button 
                type="button"
                onClick={() => setShowAddContentMenu(true)} 
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-[#E53945]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="text-[#E53945]" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Add</span>
              </button>

              <Link 
                href="/creator-dashboard/manage-content" 
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-[#E53945]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Video className="text-[#E53945]" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Manage</span>
              </Link>

              <Link 
                href="/creator-dashboard/import" 
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-[#E53945]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="text-[#E53945]" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Import</span>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Marketplace</h2>
            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
              <Link
                href="/creator-dashboard/shop"
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingBag className="text-yellow-400" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Manage Shop</span>
              </Link>

              <Link
                href="/creator-dashboard/orders"
                className="bg-white/5 border border-white/20 hover:bg-white/10 active:scale-95 p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="text-blue-400" size={22} />
                </div>
                <span className="text-sm font-bold text-white group-hover:text-white/90">Manage Orders</span>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Subscriptions</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/subscriptions" className="bg-white/5 border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Star className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Manage Subscription</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3 uppercase">Security & Billing</h2>
            <div className="flex flex-col gap-2 w-full max-w-2xl">
              <Link href="/creator-dashboard/security-billing" className="bg-white/5 border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><Shield className="text-[#E53945]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Change Password</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
              <Link href="/creator-dashboard/security-billing" className="bg-white/5 border border-white/20 hover:bg-white/10 p-4 rounded-xl flex items-center justify-between transition-all group shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-4"><CreditCard className="text-[#D4AF37]" size={20} /><span className="text-sm font-bold text-white group-hover:text-white/90">Billing</span></div>
                <ChevronRight size={18} className="text-white/30 group-hover:text-white/60 transition-colors" />
              </Link>
            </div>
          </section>
        </div>
      </>
    )}

        </div>

        {/* ADD CONTENT BOTTOM SHEET */}
        <AnimatePresence>
          {showAddContentMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddContentMenu(false)}
                className="fixed inset-0 z-[300] bg-black/75"
              />
              <motion.div
                initial={{ y: "100%", opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] backdrop-blur-2xl rounded-t-[32px] border-t border-white/15 p-6 pb-28 lg:max-w-md lg:mx-auto lg:rounded-[32px] lg:bottom-10 shadow-[0_-20px_60px_rgba(0,0,0,0.75)] max-h-[85vh] overflow-y-auto"
              >
                <div className="w-12 h-1.5 bg-white/25 rounded-full mx-auto mb-6 lg:hidden" />
                
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-white tracking-tight">Add Content</h3>
                  <button onClick={() => setShowAddContentMenu(false)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/15 transition text-white border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Link
                    href="/creator-dashboard/upload"
                    onClick={async () => { const u = await getCachedUser(); if (!u) { window.location.href = "/login"; return; } setShowAddContentMenu(false); }}
                    className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-white/25 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#E53945]/0 via-[#E53945]/0 to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                      <Video className="text-[#E53945]" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base">Upload Video</h4>
                      <p className="text-xs text-white/50">Publish a video, podcast, film or documentary</p>
                    </div>
                  </Link>

                  <Link
                    href="/creator-dashboard/upload?kind=audio"
                    onClick={async () => { const u = await getCachedUser(); if (!u) { window.location.href = "/login"; return; } setShowAddContentMenu(false); }}
                    className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-white/25 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#E53945]/0 via-[#E53945]/0 to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                      <Music className="text-[#E53945]" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base">Upload Audio</h4>
                      <p className="text-xs text-white/50">Song, audio podcast, audiobook</p>
                    </div>
                  </Link>

                  <Link 
                    href={creatorToolsUnlocked ? "/creator-dashboard/live" : "/wallet?topup=true&unlock=creator-tools"}
                    onClick={() => setShowAddContentMenu(false)}
                    className={`group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-[#E53945]/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${!creatorToolsUnlocked ? "opacity-60" : ""}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#E53945]/0 via-[#E53945]/0 to-[#E53945]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-[#E53945]/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(229,57,69,0.2)]">
                      <Radio className="text-[#E53945]" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5">Go Live {!creatorToolsUnlocked && <Lock size={12} className="text-yellow-400" />}</h4>
                      <p className="text-xs text-white/50">{creatorToolsUnlocked ? "Start a live stream with your fans" : "Buy any coins to unlock — your coins go to creators, not us"}</p>
                    </div>
                  </Link>

                  <Link 
                    href={creatorToolsUnlocked ? "/creator-dashboard/shop" : "/wallet?topup=true&unlock=creator-tools"}
                    onClick={() => setShowAddContentMenu(false)}
                    className={`group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-purple-400/30 p-4 rounded-2xl transition-all duration-300 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${!creatorToolsUnlocked ? "opacity-60" : ""}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <Tag className="text-purple-400" size={24} />
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5">Upload Merch {!creatorToolsUnlocked && <Lock size={12} className="text-yellow-400" />}</h4>
                      <p className="text-xs text-white/50">{creatorToolsUnlocked ? "Add an item to your store" : "Buy any coins to unlock — your coins go to creators, not us"}</p>
                    </div>
                  </Link>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAvatarMenu && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                onClick={() => setShowAvatarMenu(false)}
                className="fixed inset-0 z-[300] bg-black/75"
              />
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] backdrop-blur-2xl rounded-t-3xl border-t border-white/15 p-6 pb-32 shadow-[0_-20px_60px_rgba(0,0,0,0.75)] max-h-[85vh] overflow-y-auto md:max-w-md md:mx-auto md:rounded-3xl md:bottom-10"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Profile Photo</h3>
                  <button onClick={() => setShowAvatarMenu(false)} className="p-2 bg-white/10 hover:bg-white/15 rounded-full transition border border-white/10">
                    <X size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Link
                    href="/creator-dashboard/settings"
                    onClick={() => setShowAvatarMenu(false)}
                    className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-white/10">
                      <Pencil size={20} className="text-blue-300" />
                    </div>
                    <div>
                      <h4 className="font-bold">Edit Profile</h4>
                      <p className="text-xs text-white/50">Update your name, bio, and links</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-white/40" />
                  </Link>

                  <button 
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                      <Camera size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold">Change Image</h4>
                      <p className="text-xs text-white/50">Upload a new profile photo</p>
                    </div>
                  </button>

                  <Link
                    href="/creator-dashboard/theme"
                    onClick={() => setShowAvatarMenu(false)}
                    className="group relative flex items-center gap-4 bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 p-4 rounded-2xl transition-all duration-300 overflow-hidden text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-white/10">
                      <Palette size={20} className="text-purple-300" />
                    </div>
                    <div>
                      <h4 className="font-bold">Change Theme</h4>
                      <p className="text-xs text-white/50">Customize your profile look</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-white/40" />
                  </Link>

                  {profile?.avatar_url && (
                    <button 
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-4 bg-red-500/10 hover:bg-red-500/15 border border-red-400/20 p-4 rounded-2xl transition text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center border border-red-400/20">
                        <Trash2 size={20} className="text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-400">Remove Photo</h4>
                        <p className="text-xs text-red-300/60">Revert to default avatar</p>
                      </div>
                    </button>
                  )}
                </div>
                
                {uploadingAvatar && (
                  <p className="text-center text-sm text-[#E53945] font-bold mt-4 animate-pulse">Uploading...</p>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <input 
          type="file" 
          ref={avatarInputRef} 
          onChange={handleAvatarUpload} 
          accept="image/*" 
          className="hidden" 
        />
        <input
          type="file"
          ref={profileFeatureInputRef}
          onChange={handleProfileFeatureUpload}
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
          className="hidden"
        />


      {/* LONG PRESS OPTIONS MENU */}
      <AnimatePresence>
        {selectedMerchItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedMerchItem(null)}
              className="fixed inset-0 z-[300] bg-black/60"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12 max-w-md mx-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex flex-col gap-2">
                <button onClick={() => { setSelectedMerchItem(null); window.location.href = "/creator-dashboard/shop"; }} className="w-full py-4 text-center font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition">Edit Product</button>
                <button onClick={() => { setSelectedMerchItem(null); setIsReordering(true); }} className="w-full py-4 text-center font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition">Reorder Grid</button>
                <button onClick={() => handleDelete(selectedMerchItem.id)} className="w-full py-4 text-center font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition border border-red-500/20 mt-2">Delete Product</button>
                <button onClick={() => setSelectedMerchItem(null)} className="w-full py-3 mt-2 text-sm text-white/50 hover:text-white transition">Cancel</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* VIDEO LONG-PRESS ACTIONS */}
      <AnimatePresence>
        {selectedVideoAction && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedVideoAction(null)}
              className="fixed inset-0 z-[300] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-[#1c1c1e] rounded-t-3xl border-t border-white/10 p-6 pb-12 max-w-md mx-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <p className="text-center text-sm font-bold text-white truncate mb-5 px-4">{selectedVideoAction.title || "Video"}</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { const v = selectedVideoAction; setSelectedVideoAction(null); window.location.href = `/creator-dashboard/manage-content?edit=${v.id}`; }}
                  className="w-full py-4 text-center font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => startPreviewChange(selectedVideoAction)}
                  className="w-full py-4 text-center font-bold text-white bg-white/5 hover:bg-white/10 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ImageIcon size={16} /> Adjust preview
                </button>
                <button
                  onClick={() => deleteVideo(selectedVideoAction)}
                  className="w-full py-4 text-center font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition border border-red-500/20 mt-2"
                >
                  Delete
                </button>
                <button onClick={() => setSelectedVideoAction(null)} className="w-full py-3 mt-2 text-sm text-white/50 hover:text-white transition">Cancel</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

        {framePickerVideo && (
          <VideoFramePicker
            src={framePickerVideo.videoUrl || framePickerVideo.bitchuteUrl || ""}
            title={framePickerVideo.title}
            onClose={() => setFramePickerVideo(null)}
            onPick={handleFramePick}
          />
        )}

        {uploadingPreview && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70">
            <div className="flex items-center gap-3 rounded-2xl bg-[#1c1c1e] border border-white/10 px-6 py-4 text-sm font-bold text-white">
              <Loader2 size={18} className="animate-spin text-[#E53945]" /> Saving preview…
            </div>
          </div>
        )}

        {playingVideo && (
          <AppleVideoPlayer
            src={playingVideo.videoUrl ?? playingVideo.bitchuteUrl ?? ""}
            title={playingVideo.title}
            poster={playingVideo.posterUrl || playingVideo.backdropUrl}
            onClose={() => setPlayingVideo(null)}
            creatorId={playingVideo.creatorId}
            isPremium={playingVideo.visibility === "premium"}
          />
        )}

        <MobileBottomNav />
      </div>
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
