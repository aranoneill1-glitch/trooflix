"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {Camera,
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
  Pencil,
} from "lucide-react";
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
  bio: string | null;
  is_verified?: boolean;
  tier?: "user" | "pro" | "podcaster";
};

type Post = {
  id: number;
  title?: string;
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

  // Edit-modal fields (temporary home for the edit form)
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [mobileTab, setMobileTab] = useState<"uploads" | "saved" | "reposts">("uploads");
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
      ])
        .then(([prof, follows, posts, myList, allVideos, reposts]) => {
          setProfile(prof.profile || null);
          setEditName(prof.profile?.display_name || "");
          setEditBio(prof.profile?.bio || "");
          setFollowers(follows.followers || 0);
          setFollowing(follows.following || 0);
          setPosts(posts.posts || []);
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

      const res = await fetch(`/api/videos?id=${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posterUrl: publicUrl }),
      });
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

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
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
                <Link
                    href="/profile/compose"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-red-600 border-2 border-black flex items-center justify-center hover:bg-red-500 transition"
                    aria-label="Upload reel"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </Link>
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

            {/* ---- Edit + Share buttons ---- */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={() => setEditOpen(true)}
                className="bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-semibold transition"
              >
                Edit profile
              </button>
              <button
                onClick={() => setDashOpen(true)}
                className="bg-white/10 hover:bg-white/20 py-2 rounded-lg text-sm font-semibold transition"
              >
                Dashboard
              </button>
            </div>

            {/* ---- Mobile tabs: Uploads | My List ---- */}
            <div className="flex border-b border-white/10 mb-3">
              <button
                onClick={() => setMobileTab("uploads")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
                  mobileTab === "uploads"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
              >
                My Posts
              </button>
              <button
                onClick={() => setMobileTab("reposts")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
                  mobileTab === "reposts"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
              >
                Reposts
              </button>
              <button
                onClick={() => setMobileTab("saved")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition ${
                  mobileTab === "saved"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
              >
                My List
              </button>
            </div>

            {/* ---- Desktop: two columns. Mobile: tab-selected section ---- */}
            <div className="grid grid-cols-1 gap-6 -mx-4 md:-mx-6">
              {/* ==== UPLOADS (left) ==== */}
              <div className={`${mobileTab === "uploads" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between px-4 md:px-6 mb-3">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                    My Posts
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

                {visiblePosts.length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm px-4">
                    {postsKind === "creator"
                      ? "No uploads yet."
                      : "No reels yet."}
                  </div>
                ) : uploadsView === "grid" ? (
                  <div className="grid grid-cols-3 gap-0.5">
                    {visiblePosts.map((p) => (
                      <Link
                        key={p.id}
                        href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                        className="relative aspect-[4/5] bg-[#141418] overflow-hidden group"
                        onPointerDown={() => startLongPress(p)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onClick={(e) => handleTileClick(p, e)}
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
                        <img
                          src={p.posterUrl || p.backdropUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-1 right-1">
                          <Play size={14} fill="white" className="text-white drop-shadow" />
                        </div>
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow">
                          <Eye size={11} />
                          {(p.viewCount ?? 0).toLocaleString()}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-4 md:px-6">
                    {visiblePosts.map((p) => (
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
                        <img
                          src={p.posterUrl || p.backdropUrl}
                          alt=""
                          className="w-12 h-16 rounded object-cover flex-shrink-0"
                          loading="lazy"
                        />
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

              {/* ==== REPOSTS (middle on desktop, tab on mobile) ==== */}
              <div className={`${mobileTab === "reposts" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between px-4 md:px-6 mb-3">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                    Reposts
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRepostsView("grid")}
                      className={`p-1.5 rounded transition ${
                        repostsView === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid3x3 size={16} />
                    </button>
                    <button
                      onClick={() => setRepostsView("list")}
                      className={`p-1.5 rounded transition ${
                        repostsView === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="List view"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {repostedPosts.length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm px-4">
                    Nothing reposted yet. Tap the repost icon on any post.
                  </div>
                ) : repostsView === "grid" ? (
                  <div className="grid grid-cols-3 gap-0.5">
                    {repostedPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/feed?reel=${p.id}`}
                        className="relative aspect-[4/5] bg-[#141418] overflow-hidden group"
                      >
                        {p.posterUrl ? (
                          <img
                            src={p.posterUrl}
                            alt={p.title || ""}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs p-2 text-center">
                            {p.title || "Post"}
                          </div>
                        )}
                        <div className="absolute top-1 right-1">
                          <Play size={14} fill="white" className="text-white drop-shadow" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-4 md:px-6">
                    {repostedPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={`/feed?reel=${p.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-[#141418] hover:bg-white/5 transition"
                      >
                        {p.posterUrl ? (
                          <img
                            src={p.posterUrl}
                            alt=""
                            className="w-12 h-16 rounded object-cover flex-shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-12 h-16 rounded bg-white/5 flex-shrink-0 flex items-center justify-center text-white/30 text-[10px]">
                            No image
                          </div>
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

              {/* ==== SAVED (right) ==== */}
              <div className={`${mobileTab === "saved" ? "" : "hidden"}`}>
                <div className="flex items-center justify-between px-4 md:px-6 mb-3">
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                    My List
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSavedView("grid")}
                      className={`p-1.5 rounded transition ${
                        savedView === "grid" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid3x3 size={16} />
                    </button>
                    <button
                      onClick={() => setSavedView("list")}
                      className={`p-1.5 rounded transition ${
                        savedView === "list" ? "bg-white/15 text-white" : "text-white/40 hover:text-white"
                      }`}
                      aria-label="List view"
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {savedPosts.length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm px-4">
                    Nothing saved yet. Tap + on any video to save it here.
                  </div>
                ) : savedView === "grid" ? (
                  <div className="grid grid-cols-3 gap-0.5">
                    {savedPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                        className="relative aspect-[4/5] bg-[#141418] overflow-hidden group"
                      >
                        <img
                          src={p.posterUrl || p.backdropUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute top-1 right-1">
                          <Play size={14} fill="white" className="text-white drop-shadow" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 px-4 md:px-6">
                    {savedPosts.map((p) => (
                      <Link
                        key={p.id}
                        href={p.creatorId ? `/podcaster/_/${p.id}` : `/feed`}
                        className="flex items-center gap-3 p-2 rounded-lg bg-[#141418] hover:bg-white/5 transition"
                      >
                        <img
                          src={p.posterUrl || p.backdropUrl}
                          alt=""
                          className="w-12 h-16 rounded object-cover flex-shrink-0"
                          loading="lazy"
                        />
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
            </div>
          </>
        )}
      </div>

      {/* ---- Edit profile (bottom sheet, temporary) ---- */}
      <AnimatePresence>
        {editOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditOpen(false)}
              className="fixed inset-0 z-[300] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[301] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <h2 className="text-base font-bold">Edit profile</h2>
                <button
                  onClick={() => setEditOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Avatar row */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={22} className="text-white/70" />
                    )}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm font-semibold text-red-500"
                  >
                    {uploading ? "Uploading…" : "Edit picture or avatar"}
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={40}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 outline-none focus:border-red-600"
                  />
                </div>

                {/* Username (read-only for now) */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">Username</label>
                  <input
                    type="text"
                    value={profile?.username || ""}
                    disabled
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 outline-none opacity-60"
                  />
                  <p className="text-[11px] text-white/40 mt-1">
                    Change username on Account settings.
                  </p>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={300}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 outline-none focus:border-red-600 resize-none"
                  />
                  <p className="text-[11px] text-white/40 mt-1 text-right">
                    {editBio.length}/300
                  </p>
                </div>

                {statusMsg && (
                  <p className="text-sm text-white/80">{statusMsg}</p>
                )}

                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-3 rounded-lg transition"
                >
                  <Check size={16} /> {savingEdit ? "Saving…" : "Save"}
                </button>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Dashboard sheet ---- */}
      <AnimatePresence>
        {dashOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDashOpen(false)}
              className="fixed inset-0 z-[300] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[301] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4"
            >
              <div className="flex justify-center pt-2.5">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                <h2 className="text-base font-bold">Dashboard</h2>
                <button
                  onClick={() => setDashOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 space-y-1">

                <Link
                  href="/account"
                  onClick={() => setDashOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition"
                >
                  <Settings size={18} className="text-white/70" />
                  <span className="font-semibold">Account settings</span>
                </Link>
                <Link
                  href="/my-list"
                  onClick={() => setDashOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition"
                >
                  <Bookmark size={18} className="text-white/70" />
                  <span className="font-semibold">My List</span>
                </Link>
                <button
                  onClick={() => {
                    share();
                    setDashOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Share2 size={18} className="text-white/70" />
                  <span className="font-semibold">Share profile</span>
                </button>
                <Link
                  href="/upgrade"
                  onClick={() => setDashOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition text-yellow-400 text-left"
                >
                  <Sparkles size={18} />
                  <span className="font-semibold">Upgrade plan</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition text-red-400 text-left"
                >
                  <LogOut size={18} />
                  <span className="font-semibold">Log out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MobileBottomNav />
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[501] bg-[#0f0f12] rounded-2xl p-4 w-[90vw] max-w-md border border-white/10"
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

    </main>
  );
}
