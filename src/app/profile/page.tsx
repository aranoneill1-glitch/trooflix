"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Grid3x3,
  Play,
  Eye,
  X,
  Check,
  Settings,
  LogOut,
  Bookmark,
  Share2,
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
};

type Post = {
  id: number;
  title?: string;
  posterUrl?: string;
  backdropUrl?: string;
  bitchuteUrl?: string;
  type?: string;
  viewCount?: number;
  creatorId?: number | null;
  createdAt?: string;
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
  const [editOpen, setEditOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);

  // Edit-modal fields (temporary home for the edit form)
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

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
      ])
        .then(([prof, follows, posts]) => {
          setProfile(prof.profile || null);
          setEditName(prof.profile?.display_name || "");
          setEditBio(prof.profile?.bio || "");
          setFollowers(follows.followers || 0);
          setFollowing(follows.following || 0);
          setPosts(posts.posts || []);
          setPostsKind(posts.kind || "none");
          setIsCreator(posts.kind === "creator");
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

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        {loading && <p className="text-white/50 py-12 text-center">Loading…</p>}

        {!loading && (
          <>
            {/* ---- Avatar + stats ---- */}
            <div className="flex items-center gap-6 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 overflow-hidden"
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
                {profile?.is_verified && <VerifiedBadge size={16} />}
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

            {/* ---- Tabs ---- */}
            <div className="flex border-b border-white/10 mb-1">
              <button
                onClick={() => setTab("grid")}
                className={`flex-1 flex items-center justify-center py-3 border-b-2 transition ${
                  tab === "grid"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
                aria-label="Grid"
              >
                <Grid3x3 size={20} />
              </button>
              <button
                onClick={() => setTab("reels")}
                className={`flex-1 flex items-center justify-center py-3 border-b-2 transition ${
                  tab === "reels"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
                aria-label="Reels"
              >
                <Play size={20} />
              </button>
            </div>

            {/* ---- Posts grid ---- */}
            {visiblePosts.length === 0 ? (
              <div className="py-16 text-center text-white/50 text-sm">
                {tab === "reels"
                  ? "No reels yet."
                  : postsKind === "creator"
                  ? "You haven't uploaded any videos yet."
                  : "Nothing saved to My List yet."}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 -mx-4 md:-mx-6">
                {visiblePosts.map((p) => (
                  <Link
                    key={p.id}
                    href={
                      p.creatorId
                        ? `/podcaster/_/${p.id}`
                        : `/feed`
                    }
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
                    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow">
                      <Eye size={11} />
                      {(p.viewCount ?? 0).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
                {isCreator && (
                  <Link
                    href="/creator"
                    onClick={() => setDashOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition text-green-400"
                  >
                    <Check size={18} />
                    <span className="font-semibold">Creator Dashboard</span>
                  </Link>
                )}
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
    </main>
  );
}
