"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Camera,
  Grid3x3,
  Play,
  Eye,
  X,
  Check,
  Settings,
  LogOut,
  Bookmark,
  Share2,
  Mic,
  Plus,
  ThumbsUp,
  Image,
  Pin,
  Trash2,
  BarChart3,
  List,
  Sparkles,
  Pencil, ShoppingBag, Wallet } from "lucide-react";
import ProfileReelViewer from "@/components/ProfileReelViewer";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import { getCachedUser } from "@/lib/cache";

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  backdrop_url?: string | null;
  bio: string | null;
  is_verified?: boolean;
  tier?: "user" | "pro" | "podcaster";
  has_pass?: boolean;
  pass_expires_at?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
};

type Post = {
  id: number;
  title?: string;
  access_type?: string;
  posterUrl?: string;
  backdropUrl?: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  type?: string;
  viewCount?: number;
  creatorId?: number | null;
  createdAt?: string;
  pinned?: boolean;
  order?: number;
  description?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsKind, setPostsKind] = useState<"creator" | "user" | "none">("none");
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  const [tab, setTab] = useState<"grid" | "reels">("grid");
  const [actionSheetFor, setActionSheetFor] = useState<Post | null>(null);
  const [editFor, setEditFor] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [insightsFor, setInsightsFor] = useState<Post | null>(null);
  const [reorderFor, setReorderFor] = useState<Post | null>(null);
  const [previewFor, setPreviewFor] = useState<Post | null>(null);
  const [posterUploading, setPosterUploading] = useState(false);
  const longPressRef = useRef<{ timer: any; fired: boolean } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Edit-modal fields (temporary home for the edit form)
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const backdropInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [settingUpPass, setSettingUpPass] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [mobileTab, setMobileTab] = useState<"posts" | "reels" | "premium" | "shop">("reels");
  const [uploadsView, setUploadsView] = useState<"grid" | "list">("grid");
  const [repostsView, setRepostsView] = useState<"grid" | "list">("grid");
  const [savedView, setSavedView] = useState<"grid" | "list">("grid");

  // Load view preferences from localStorage
  useEffect(() => {
    try {
      const u = localStorage.getItem("trooflix:uploadsView");
      const sv = localStorage.getItem("trooflix:savedView");
      const rv = localStorage.getItem("trooflix:repostsView");
      if (u === "grid" || u === "list") setUploadsView(u);
      if (sv === "grid" || sv === "list") setSavedView(sv);
      if (rv === "grid" || rv === "list") setRepostsView(rv);
    } catch {}
  }, []);

  // Persist view changes
  useEffect(() => {
    try { localStorage.setItem("trooflix:uploadsView", uploadsView); } catch {}
  }, [uploadsView]);
  useEffect(() => {
    try { localStorage.setItem("trooflix:savedView", savedView); } catch {}
  }, [savedView]);
  useEffect(() => {
    try { localStorage.setItem("trooflix:repostsView", repostsView); } catch {}
  }, [repostsView]);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      const uid = user.id;
      setUserId(uid);
      setEmail(user.email || "");

      Promise.all([
        fetch(`/api/profile?user_id=${uid}`).then((r) => r.json()),
        fetch(`/api/user-follows?user_id=${uid}&counts=1`).then((r) => r.json()),
        fetch(`/api/user/posts?userId=${uid}`).then((r) => r.json()),
        fetch(`/api/my-list?user_id=${uid}`).then((r) => r.json()),
        fetch(`/api/videos`).then((r) => r.json()),
        fetch(`/api/user/posts?userId=${uid}&kind=reposts`).then((r) => r.json()),
        fetch(`/api/me/creator?user_id=${uid}`).then((r) => r.json()),
      ])
        .then(async ([prof, follows, posts, myList, allVideos, reposts, creatorData]) => {
          setProfile(prof.profile || null);
          setEditName(prof.profile?.display_name || "");
          setEditBio(prof.profile?.bio || "");
          setFollowers(follows.followers || 0);
          setFollowing(follows.following || 0);
          
          let combinedPosts = posts.posts || [];
          
          // If podcaster, fetch their creator videos (Podcasts/Docs) and merge
          if (prof.profile?.tier === "podcaster" && creatorData.creator?.id) {
            try {
              const vidsRes = await fetch(`/api/creators/videos?creatorId=${creatorData.creator.id}`).then(r => r.json());
              if (vidsRes.videos) {
                const existingIds = new Set(combinedPosts.map((p: any) => p.id));
                const newVids = vidsRes.videos.filter((v: any) => !existingIds.has(v.id));
                combinedPosts = [...combinedPosts, ...newVids];
              }
            } catch (e) {}
          }
          
          setPosts(combinedPosts);
          setPostsKind(posts.kind || "none");
          setIsCreator(posts.kind === "creator");

          // Build saved list from IDs + all videos
          const ids = new Set<number>((myList.ids || []).map((x: any) => Number(x)));
          const all = Array.isArray(allVideos) ? allVideos : [];
          setSavedPosts(all.filter((v: any) => ids.has(Number(v.id))));

          // Reposts list
          setRepostedPosts(Array.isArray(reposts.posts) ? reposts.posts : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [router]);


  useEffect(() => {
    if (!userId) return;
    fetch(`/api/me/creator?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.creator?.id) {
          return fetch(`/api/creator/products?creatorId=${d.creator.id}`).then(r => r.json());
        }
      })
      .then(pd => { if (pd) setProducts(pd.products || []); })
      .catch(() => {});
  }, [userId]);

  const saveEdit = async () => {
    if (!userId) return;
    setSavingEdit(true);
    setStatusMsg("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        displayName: editName.trim(),
        bio: editBio.trim(),
      }),
    });
    setSavingEdit(false);
    if (res.ok) {
      setProfile((p) =>
        p ? { ...p, display_name: editName.trim(), bio: editBio.trim() } : p
      );
      setStatusMsg("✅ Saved");
      setTimeout(() => {
        setStatusMsg("");
        setEditOpen(false);
      }, 1200);
    } else {
      setStatusMsg("❌ Could not save");
    }
  };

  
  const onBackdropChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingBackdrop(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "backdrops" }),
      });
      const { signedUrl, publicUrl } = await presign.json();
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, backdropUrl: publicUrl }),
      });
      
      setProfile((p) => p ? { ...p, backdrop_url: publicUrl } : p);
    } catch (err) {
      alert("Failed to upload backdrop");
    } finally {
      setUploadingBackdrop(false);
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setStatusMsg("");
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "avatars",
        }),
      });
      if (!presign.ok) throw new Error("Upload failed");
      const { signedUrl, publicUrl } = await presign.json();

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, avatarUrl: publicUrl }),
      });
      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      setStatusMsg("✅ Avatar updated");
    } catch {
      setStatusMsg("❌ Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    router.push("/");
  };

  const share = async () => {
    const url = `${window.location.origin}/u/${profile?.username || userId}`;
    if (navigator.share) navigator.share({ url }).catch(() => {});
    else navigator.clipboard.writeText(url);
  };

  const name = profile?.display_name || profile?.username || email.split("@")[0] || "User";
  const handle = profile?.username ? `@${profile.username}` : "";

  const visiblePosts =
    tab === "reels"
      ? posts.filter((p) => p.type === "Reel" || p.type === "Short")
      : posts;

  const isPodcaster = profile?.tier === "podcaster";
  const visibleFree = posts.filter((p: any) => !p.access_type || p.access_type === "free");
  const visibleReels = visibleFree.filter((p: any) => p.videoUrl || p.bitchuteUrl || p.type === "Reel" || p.type === "Podcast" || p.type === "Documentary");
  const visibleImagePosts = visibleFree.filter((p: any) => !p.videoUrl && !p.bitchuteUrl && p.type !== "Reel" && p.type !== "Podcast" && p.type !== "Documentary" && p.type !== "Troo");
  const visiblePremium = posts.filter((p: any) => p.access_type === "pass" || p.access_type === "creator");

  // ---- Long press / right click on grid tiles ----
  const startLongPress = (post: Post) => {
    longPressRef.current = {
      timer: setTimeout(() => {
        if (longPressRef.current) longPressRef.current.fired = true;
        setActionSheetFor(post);
      }, 500),
      fired: false,
    };
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  };

  const handleTileClick = (post: Post, e: React.MouseEvent) => {
    if (longPressRef.current?.fired) {
      e.preventDefault();
      longPressRef.current = null;
      return;
    }
  };

  const handleSaveEdit = async () => {
    if (!editFor || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const user = await getCachedUser();
      if (!user) {
        setSavingEdit(false);
        return;
      }
      const res = await fetch("/api/user/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          postId: editFor.id,
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });
      if (!res.ok) {
        alert("Could not save changes");
        setSavingEdit(false);
        return;
      }
      const d = await res.json();
      // Update local state
      setPosts((prev) =>
        prev.map((x) => (x.id === editFor.id ? { ...x, title: d.video.title, description: d.video.description } : x))
      );
      setEditFor(null);
    } catch {
      alert("Network error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (post: Post) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/videos?id=${post.id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((x) => x.id !== post.id));
      setActionSheetFor(null);
    } else {
      alert("Could not delete.");
    }
  };

  const handleShare = async (post: Post) => {
    const url = `${window.location.origin}/podcaster/_/${post.id}`;
    if (navigator.share) {
      navigator.share({ title: post.title, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setStatusMsg("Link copied");
      setTimeout(() => setStatusMsg(""), 2000);
    }
    setActionSheetFor(null);
  };

  const handlePin = async (post: Post) => {
    const newPinned = !post.pinned;
    const res = await fetch(`/api/videos?id=${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: newPinned }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((x) => (x.id === post.id ? { ...x, pinned: newPinned } : x))
      );
      setActionSheetFor(null);
    } else {
      alert("Could not pin.");
    }
  };

  const handleReorder = async (post: Post, delta: number) => {
    const currentOrder = post.order ?? 0;
    const newOrder = currentOrder + delta;
    const res = await fetch(`/api/videos?id=${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder }),
    });
    if (res.ok) {
      setPosts((prev) =>
        prev.map((x) => (x.id === post.id ? { ...x, order: newOrder } : x))
      );
    } else {
      alert("Could not reorder.");
    }
  };

  const handleAdjustPreview = async (post: Post, file: File) => {
    setPosterUploading(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "posters",
        }),
      });
      if (!presign.ok) throw new Error("Upload prep failed");
      const { signedUrl, publicUrl } = await presign.json();

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      let res;
      if (postsKind === "creator") {
        res = await fetch(`/api/videos?id=${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posterUrl: publicUrl }),
        });
      } else {
        res = await fetch(`/api/user/posts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, postId: post.id, posterUrl: publicUrl }),
        });
      }
      if (!res.ok) throw new Error("Save failed");

      setPosts((prev) =>
        prev.map((x) => (x.id === post.id ? { ...x, posterUrl: publicUrl } : x))
      );
      setPreviewFor(null);
    } catch (err: any) {
      alert(err.message || "Could not update preview");
    } finally {
      setPosterUploading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        alert(d.error || "Could not open billing portal");
      }
    } catch {
      alert("Network error");
    } finally {
      setPortalLoading(false);
    }
  };

  // Poll for has_pass after checkout — webhook can take 2-5s
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "pass" || !userId) return;

    setSettingUpPass(true);

    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const r = await fetch(`/api/profile?user_id=${userId}`, { cache: "no-store" });
        const d = await r.json();
        if (d.profile?.has_pass === true) {
          setProfile(d.profile);
          setSettingUpPass(false);
          clearInterval(interval);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch {}

      if (attempts >= maxAttempts) {
        setSettingUpPass(false);
        clearInterval(interval);
      }
    }, 1500);


  return () => clearInterval(interval);
  }, [userId]);

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      {/* Backdrop Section */}
      {profile?.backdrop_url && (
        <div className="w-full h-40 md:h-64 relative bg-[#1c1c1e]">
          <img src={profile.backdrop_url} alt="Backdrop" className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}
      
      <input 
        type="file" 
        ref={backdropInputRef} 
        onChange={onBackdropChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className={`relative ${profile?.backdrop_url ? '-mt-16' : 'pt-20 md:pt-24'} max-w-2xl mx-auto px-4 md:px-6`}>
        {settingUpPass && !loading && (
          <div className="bg-yellow-950/30 border border-yellow-600/40 rounded-xl p-4 mb-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-yellow-300">Setting up your Trooflix Pass…</p>
              <p className="text-xs text-white/60">This takes a few seconds. Your badge will appear shortly.</p>
            </div>
          </div>
        )}

        {loading && <p className="text-white/50 py-12 text-center">Loading…</p>}

        {!loading && (
          <>
            {/* ---- Avatar + stats ---- */}
            <div className="flex items-center gap-6 mb-4">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">
                      {(name[0] || "?").toUpperCase()}
                    </span>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs">
                      …
                    </div>
                  )}
                </button>
                
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
                className="hidden"
              />

              <div className="flex-1 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{posts.length}</p>
                  <p className="text-xs text-white/60">posts</p>
                </div>
                <Link href={`/profile/${userId}/followers`}>
                  <p className="text-lg font-bold">{followers.toLocaleString()}</p>
                  <p className="text-xs text-white/60">followers</p>
                </Link>
                <Link href={`/profile/${userId}/following`}>
                  <p className="text-lg font-bold">{following.toLocaleString()}</p>
                  <p className="text-xs text-white/60">following</p>
                </Link>
              </div>
            </div>

            {/* ---- Name + verified + bio ---- */}
            <div className="mb-4">
              <p className="font-semibold inline-flex items-center gap-1.5">
                <span>{name}</span>
                {profile?.is_verified && <VerifiedBadge size={16} variant={profile.tier === "podcaster" ? "gold" : "red"} />}
              </p>
              {profile?.bio && (
                <p className="text-sm text-white/90 whitespace-pre-wrap mt-1">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* ---- Action Buttons ---- */}
            <div className="relative z-[100] flex flex-wrap items-center gap-3 mb-8">
              {profile?.tier === "podcaster" && (
                <Link
                  href="/studio"
                  className="flex-1 md:flex-none justify-center bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 backdrop-blur-md shadow-lg shadow-yellow-500/5"
                >
                  <Mic size={16} /> My Studio
                </Link>
              )}
              <button
                type="button"
                onClick={() => setDashOpen(true)}
                className="relative z-[100] cursor-pointer flex-1 md:flex-none justify-center bg-[#1c1c1e]/80 backdrop-blur-xl text-white border border-white/10 hover:bg-[#1c1c1e]/95 px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg"
              >
                <Settings size={16} /> Dashboard
              </button>
            </div>

            {/* ---- Premium Tabs ---- */}
            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide border-b border-white/5">
              <button
                onClick={() => setMobileTab("posts")}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                  mobileTab === "posts"
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setMobileTab("reels")}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                  mobileTab === "reels"
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                }`}
              >
                Reels
              </button>
              {isPodcaster && (
                <button
                  onClick={() => setMobileTab("premium")}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                    mobileTab === "premium"
                      ? "bg-white text-black border-white shadow-lg"
                      : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                  }`}
                >
                  Premium
                </button>
              )}
              {isPodcaster && (
                <button
                  onClick={() => setMobileTab("shop")}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                    mobileTab === "shop"
                      ? "bg-white text-black border-white shadow-lg"
                      : "bg-[#1c1c1e]/50 text-white/60 border-white/10 hover:bg-[#1c1c1e] hover:text-white"
                  }`}
                >
                  Shop
                </button>
              )}
              
              
            </div>

            {/* ---- Desktop: two columns. Mobile: tab-selected section ---- */}
            <div className="grid grid-cols-1 gap-6 -mx-4 md:-mx-6">
              {/* ==== UPLOADS (left) ==== */}
              <div className={`${mobileTab === "reels" || mobileTab === "posts" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between px-4 md:px-6 mb-4 mt-2">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {mobileTab === "posts" ? "Posts" : "Reels"}
                  </h2>
                  <div className="flex items-center gap-1 bg-[#1c1c1e]/80 backdrop-blur-md p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setUploadsView("grid")}
                      className={`p-1.5 rounded transition ${
                        uploadsView === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid3x3 size={16} />
                    </button>
                    <button
                      onClick={() => setUploadsView("list")}
                      className={`p-1.5 rounded transition ${
                        uploadsView === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="List view"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {(mobileTab === "posts" ? visibleImagePosts : visibleReels).length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm px-4">
                    {postsKind === "creator"
                      ? "No uploads yet."
                      : "No reels yet."}
                  </div>
                ) : uploadsView === "grid" ? (
                  <div className="grid grid-cols-3 gap-1 md:gap-2 px-2 md:px-0">
                    {(mobileTab === "posts" ? visibleImagePosts : visibleReels).map((p: any, idx: number) => (
                      <div
                        key={p.id}
                        onClick={() => setViewerIndex(idx)}
                        className="relative aspect-[4/5] bg-[#141418] rounded-xl overflow-hidden cursor-pointer"
                        onPointerDown={() => startLongPress(p)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionSheetFor(p);
                        }}
                        style={{
                          WebkitTouchCallout: "none",
                          WebkitUserSelect: "none",
                          userSelect: "none",
                          touchAction: "manipulation",
                        }}
                        draggable={false}
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
                          <video
                            src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`}
                            className="w-full h-full object-cover pointer-events-none"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={p.posterUrl || p.backdropUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute top-1 right-1">
                          <Play size={14} fill="white" className="text-white drop-shadow" />
                        </div>
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow">
                          <Eye size={11} />
                          {(p.viewCount ?? 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-4 md:px-6">
                    {(mobileTab === "posts" ? visibleImagePosts : visibleReels).map((p, idx) => (
                      <Link
                        key={p.id}
                        href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-[#141418] hover:bg-white/5 transition"
                        onPointerDown={() => startLongPress(p)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionSheetFor(p);
                        }}
                        style={{ WebkitTouchCallout: "none" }}
                        draggable={false}
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
                          <video
                            src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`}
                            className="w-12 h-16 rounded object-cover flex-shrink-0 pointer-events-none"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={p.posterUrl || p.backdropUrl}
                            alt=""
                            className="w-12 h-16 rounded object-cover flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{p.title || "Untitled"}</p>
                          <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                            <Eye size={11} />
                            {(p.viewCount ?? 0).toLocaleString()} views
                          </p>
                        </div>
                        <Play size={14} fill="white" className="text-white/60 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              

              {/* ==== PREMIUM (middle on desktop, tab on mobile) ==== */}
              <div className={`${mobileTab === "premium" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between px-4 md:px-6 mb-3">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                    Premium Content
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUploadsView("grid")}
                      className={`p-1.5 rounded transition ${
                        uploadsView === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid3x3 size={16} />
                    </button>
                    <button
                      onClick={() => setUploadsView("list")}
                      className={`p-1.5 rounded transition ${
                        uploadsView === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="List view"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {visiblePremium.length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm px-4">
                    {postsKind === "creator"
                      ? "No uploads yet."
                      : "No reels yet."}
                  </div>
                ) : uploadsView === "grid" ? (
                  <div className="grid grid-cols-3 gap-1 md:gap-2 px-2 md:px-0">
                    {visiblePremium.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => router.push(p.creatorId ? `/podcaster/_/${p.id}` : `/feed`)}
                        className="relative aspect-[4/5] bg-[#141418] rounded-xl overflow-hidden cursor-pointer"
                        onPointerDown={() => startLongPress(p)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionSheetFor(p);
                        }}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                          WebkitTouchCallout: "none",
                          WebkitUserSelect: "none",
                          userSelect: "none",
                          touchAction: "manipulation",
                        }}
                        draggable={false}
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
                          <video
                            src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`}
                            className="w-full h-full object-cover pointer-events-none"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={p.posterUrl || p.backdropUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute top-1 right-1">
                          <Play size={14} fill="white" className="text-white drop-shadow" />
                        </div>
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow">
                          <Eye size={11} />
                          {(p.viewCount ?? 0).toLocaleString()}
                        </div>
                      
                        {p.access_type === "pass" && (
                          <div className="absolute bottom-1 right-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                            TF
                          </div>
                        )}
                        {p.access_type === "creator" && (
                          <div className="absolute bottom-1 right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow z-10">
                            SUB
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-4 md:px-6">
                    {visiblePremium.map((p, idx) => (
                      <Link
                        key={p.id}
                        href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-[#141418] hover:bg-white/5 transition"
                        onPointerDown={() => startLongPress(p)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onClick={(e) => handleTileClick(p, e)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionSheetFor(p);
                        }}
                        style={{ WebkitTouchCallout: "none" }}
                        draggable={false}
                      >
                        {(p.videoUrl || p.bitchuteUrl) ? (
                          <video
                            src={`${p.videoUrl || p.bitchuteUrl}#t=0.1`}
                            className="w-12 h-16 rounded object-cover flex-shrink-0 pointer-events-none"
                            preload="metadata"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={p.posterUrl || p.backdropUrl}
                            alt=""
                            className="w-12 h-16 rounded object-cover flex-shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{p.title || "Untitled"}</p>
                          <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                            <Eye size={11} />
                            {(p.viewCount ?? 0).toLocaleString()} views
                          </p>
                        </div>
                        <Play size={14} fill="white" className="text-white/60 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              

              
              {/* ==== SHOP ==== */}
              <div className={`${mobileTab === "shop" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between px-4 md:px-6 mb-4 mt-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Creator Shop</h2>
                </div>
                {products.length === 0 ? (
                  <div className="text-center py-16 bg-[#141418] rounded-2xl border border-white/5 mx-4 md:mx-0">
                    <ShoppingBag size={40} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/50 text-sm">No products in your shop yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4 md:px-0">
                    {products.map((p) => (
                      <div key={p.id} className="bg-[#141418] border border-white/5 rounded-2xl p-3 flex flex-col hover:border-white/10 transition">
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#1c1c1e] mb-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={32} className="text-white/20" /></div>
                          )}
                        </div>
                        <h3 className="font-bold text-sm mb-1 truncate">{p.name}</h3>
                        <p className="text-sm text-green-400 font-bold mt-auto">${(p.price_cents / 100).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
      <MobileBottomNav />
            </div>
          </>
        )}
      </div>
      {/* ---- Edit post modal ---- */}
      <AnimatePresence>
        {editFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !savingEdit && setEditFor(null)}
              className="fixed inset-0 z-[500] bg-black/80"
            />
            <div className="fixed inset-0 z-[500] flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f12] rounded-2xl p-4 w-full max-w-md border border-white/10 pointer-events-auto"
            >
              <h3 className="font-bold mb-3">Edit post</h3>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 mb-3 outline-none focus:border-red-600 text-sm"
              />
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                maxLength={800}
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 mb-4 outline-none focus:border-red-600 resize-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => !savingEdit && setEditFor(null)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editTitle.trim()}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold transition"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Long-press action sheet ---- */}
      <AnimatePresence>
        {actionSheetFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActionSheetFor(null)}
              className="fixed inset-0 z-[400] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[401] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4"
            >
              <div className="flex justify-center pt-2.5">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    setEditFor(actionSheetFor);
                    setEditTitle(actionSheetFor.title || "");
                    setEditDescription(actionSheetFor.description || "");
                    setActionSheetFor(null);
                  }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Pencil size={20} className="text-white/80" />
                  <span className="font-medium">Edit</span>
                </button>
                <button
                  onClick={() => { setInsightsFor(actionSheetFor); setActionSheetFor(null); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <BarChart3 size={20} className="text-white/80" />
                  <span className="font-medium">Insights</span>
                </button>
                <button
                  onClick={() => handleDelete(actionSheetFor)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-500/10 transition text-left text-red-400"
                >
                  <Trash2 size={20} />
                  <span className="font-medium">Delete</span>
                </button>
                <button
                  onClick={() => handlePin(actionSheetFor)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Pin size={20} className="text-white/80" />
                  <span className="font-medium">{actionSheetFor.pinned ? "Unpin" : "Pin to main grid"}</span>
                </button>
                <button
                  onClick={() => { setReorderFor(actionSheetFor); setActionSheetFor(null); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Grid3x3 size={20} className="text-white/80" />
                  <span className="font-medium">Reorder grid</span>
                </button>
                <button
                  onClick={() => { setPreviewFor(actionSheetFor); setActionSheetFor(null); }}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Image size={20} className="text-white/80" />
                  <span className="font-medium">Adjust preview</span>
                </button>
                <button
                  onClick={() => handleShare(actionSheetFor)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Share2 size={20} className="text-white/80" />
                  <span className="font-medium">Share</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Insights modal ---- */}
      <AnimatePresence>
        {insightsFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInsightsFor(null)}
              className="fixed inset-0 z-[500] bg-black/80"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[501] bg-[#0f0f12] rounded-2xl p-6 w-[90vw] max-w-sm border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Insights</h3>
                <button
                  onClick={() => setInsightsFor(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-white/60 mb-4 truncate">{insightsFor.title}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <Eye size={20} className="mx-auto mb-2 text-white/50" />
                  <p className="text-2xl font-bold">{(insightsFor.viewCount ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-white/50">views</p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <ThumbsUp size={20} className="mx-auto mb-2 text-white/50" />
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-white/50">likes</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Reorder grid sheet ---- */}
      <AnimatePresence>
        {reorderFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReorderFor(null)}
              className="fixed inset-0 z-[500] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[501] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4"
            >
              <div className="flex justify-center pt-2.5">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold">Reorder</h3>
                <button
                  onClick={() => setReorderFor(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-xs text-white/50 mb-2 truncate">{reorderFor.title}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReorder(reorderFor, -1)}
                    className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-3 font-semibold transition"
                  >
                    ← Move earlier
                  </button>
                  <button
                    onClick={() => handleReorder(reorderFor, 1)}
                    className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg py-3 font-semibold transition"
                  >
                    Move later →
                  </button>
                </div>
                <p className="text-[11px] text-white/40 text-center mt-2">
                  Current position: {reorderFor.order ?? 0}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Adjust preview sheet ---- */}
      <AnimatePresence>
        {previewFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !posterUploading && setPreviewFor(null)}
              className="fixed inset-0 z-[500] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[501] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4"
            >
              <div className="flex justify-center pt-2.5">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold">Adjust preview</h3>
                <button
                  onClick={() => !posterUploading && setPreviewFor(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="aspect-[4/5] bg-black/40 rounded-lg overflow-hidden max-w-[200px] mx-auto">
                  <img
                    src={previewFor.posterUrl || previewFor.backdropUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <label className="block w-full bg-white/10 hover:bg-white/20 rounded-lg py-3 text-center font-semibold cursor-pointer transition">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={posterUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAdjustPreview(previewFor, f);
                    }}
                  />
                  {posterUploading ? "Uploading…" : "Choose new preview"}
                </label>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    
      
    {viewerIndex !== null && (
        <ProfileReelViewer
          videos={visibleReels}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          author={{
            name: profile?.display_name || profile?.username || "User",
            avatar: profile?.avatar_url || "",
            verified: profile?.is_verified || false,
            profileHref: "/profile"
          }}
        />
      )}
      
      <AnimatePresence>
        {dashOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDashOpen(false)}
              className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 right-0 bottom-0 z-[501] bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-t-3xl md:max-w-md md:mx-auto md:rounded-3xl md:bottom-4 border-t md:border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden pb-[env(safe-area-inset-bottom)] flex flex-col max-h-[85vh]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                        {(profile?.display_name?.[0] || profile?.username?.[0] || "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white leading-tight">{profile?.display_name || profile?.username || "User"}</p>
                    <p className="text-xs text-white/50 leading-tight">@{profile?.username || "user"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDashOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-4 space-y-6 overflow-y-auto scrollbar-hide">
                
                {/* Account Section */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">Account</p>
                  <div className="space-y-1">
                    <Link href="/account" onClick={() => setDashOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition"><Settings size={16} className="text-white/70" /></div>
                      <span className="font-medium text-sm text-white/90">Account settings</span>
                    </Link>
                    <Link href="/my-list" onClick={() => setDashOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition"><Bookmark size={16} className="text-white/70" /></div>
                      <span className="font-medium text-sm text-white/90">My List</span>
                    </Link>
                    <button onClick={() => { share(); setDashOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group text-left">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition"><Share2 size={16} className="text-white/70" /></div>
                      <span className="font-medium text-sm text-white/90">Share profile</span>
                    </button>
                  </div>
                </div>

                {/* Creator Tools Section */}
                {profile?.tier === "podcaster" && (
                  <div>
                    <p className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2 px-2 flex items-center gap-1.5">
                      <Sparkles size={12} /> Creator Tools
                    </p>
                    <div className="space-y-1">
                      <Link href="/studio" onClick={() => setDashOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-yellow-500/10 transition group text-yellow-400">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition"><Mic size={16} className="text-yellow-500" /></div>
                        <span className="font-medium text-sm">Creator Studio</span>
                      </Link>
                      <Link href="/profile/wallet" onClick={() => setDashOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-yellow-500/10 transition group text-yellow-400">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition"><Wallet size={16} className="text-yellow-500" /></div>
                        <span className="font-medium text-sm">Creator Wallet</span>
                      </Link>
                      <Link href="/orders" onClick={() => setDashOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-yellow-500/10 transition group text-yellow-400">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition"><ShoppingBag size={16} className="text-yellow-500" /></div>
                        <span className="font-medium text-sm">My Orders</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Billing Section */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">Billing</p>
                  <div className="space-y-1">
                    {profile?.has_pass === true ? (
                      <button onClick={() => { setDashOpen(false); handleManageSubscription(); }} disabled={portalLoading} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group text-left disabled:opacity-50">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition"><Sparkles size={16} className="text-yellow-400" /></div>
                        <span className="font-medium text-sm text-white/90">{portalLoading ? "Opening…" : "Manage Subscription"}</span>
                      </button>
                    ) : (
                      <Link href="/upgrade" onClick={() => setDashOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition"><Sparkles size={16} className="text-yellow-400" /></div>
                        <span className="font-medium text-sm text-white/90">Upgrade plan</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Log out Button */}
              <div className="p-4 border-t border-white/5 shrink-0">
                <button onClick={async () => { const supabase = createClient(); await supabase.auth.signOut(); clearUserCache(); router.push("/"); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-sm transition">
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
