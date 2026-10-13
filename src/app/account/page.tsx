"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, LogOut, Check, Trash2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [followedCreators, setFollowedCreators] = useState<any[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setLoading(false);
        return;
      }
      const u = { id: data.user.id, email: data.user.email || "" };
      setUser(u);

      fetch(`/api/profile?user_id=${u.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) {
            setAvatarUrl(d.profile.avatar_url || "");
            setDisplayName(d.profile.display_name || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));

      // Load followed podcasters
      fetch(`/api/follows?user_id=${u.id}`)
        .then((r) => r.json())
        .then((d) => {
          const ids = Array.isArray(d.ids) ? d.ids : [];
          if (ids.length === 0) return;
          return fetch("/api/creators")
            .then((r) => r.json())
            .then((creators: any[]) => {
              setFollowedCreators(
                creators.filter((c) => ids.includes(c.id))
              );
            });
        })
        .catch(() => {});
    });
  }, []);

  const uploadAvatar = (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setStatus("");

    fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "image/jpeg",
        folder: "avatars",
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to get upload URL");
        return r.json();
      })
      .then(({ signedUrl, publicUrl }) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "image/jpeg");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setAvatarUrl(publicUrl);
            await fetch("/api/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user!.id, avatarUrl: publicUrl }),
            });
            setStatus("✅ Avatar saved");
            setTimeout(() => setStatus(""), 2500);
          } else {
            setStatus("❌ Upload failed: " + xhr.status);
          }
          setUploading(false);
          setUploadProgress(0);
        };
        xhr.onerror = () => {
          setStatus("❌ Upload network error");
          setUploading(false);
          setUploadProgress(0);
        };
        xhr.send(file);
      })
      .catch((e) => {
        setStatus("❌ " + e.message);
        setUploading(false);
        setUploadProgress(0);
      });
  };

  const removeAvatar = async () => {
    if (!user) return;
    if (!confirm("Remove your profile picture?")) return;

    try {
      // 1. Save empty avatar_url to the profile
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, avatarUrl: "" }),
      });

      // 2. Clear local state
      setAvatarUrl("");
      setStatus("✅ Picture removed");
      setTimeout(() => setStatus(""), 2500);
    } catch (e) {
      setStatus("❌ Failed to remove");
    }
  };

  const saveDisplayName = async () => {
    if (!user) return;
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, displayName: displayName.trim() }),
    });
    setStatus("✅ Name saved");
    setTimeout(() => setStatus(""), 2500);
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white">
        <TopBar />
        <div className="pt-32 px-4 text-center">
          <p className="text-white/70 mb-4">You're not signed in.</p>
          <Link
            href="/login"
            className="bg-red-600 hover:bg-red-500 font-semibold px-6 py-3 rounded transition inline-block"
          >
            Sign In
          </Link>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  const initial = user.email[0]?.toUpperCase() || "?";

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20 lg:pb-0">
      <TopBar />

      <div className="pt-24 md:pt-28 max-w-2xl mx-auto px-4 md:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">My Account</h1>
        <p className="text-white/50 text-sm mb-8">Manage your profile and avatar</p>

        <div className="bg-[#141418] border border-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Profile Picture</h2>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">{initial}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold transition"
                >
                  <Upload size={16} />
                  {uploading ? `${uploadProgress}%` : avatarUrl ? "Change picture" : "Upload picture"}
                </button>
                {avatarUrl && !uploading && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 px-4 py-2 rounded text-sm font-semibold transition"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-white/40 mt-2">Square image works best. JPG or PNG.</p>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatar(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#141418] border border-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Display Name</h2>
          <p className="text-xs text-white/50 mb-3">
            Shown on your comments. Leave blank to use your email prefix.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`@${user.email.split("@")[0]}`}
              maxLength={40}
              className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 focus:border-red-600 outline-none"
            />
            <button
              onClick={saveDisplayName}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 font-semibold px-4 py-2 rounded transition"
            >
              <Check size={16} /> Save
            </button>
          </div>
        </div>

        <div className="bg-[#141418] border border-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-2">Email</h2>
          <p className="text-white/70 text-sm">{user.email}</p>
        </div>

        {/* Following */}
        <div className="bg-[#141418] border border-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">
            Following ({followedCreators.length})
          </h2>
          {followedCreators.length === 0 ? (
            <p className="text-white/50 text-sm">
              You're not following any podcasters yet.
            </p>
          ) : (
            <div className="space-y-3">
              {followedCreators.map((c) => (
                <Link
                  key={c.id}
                  href={`/podcaster/${c.slug}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition"
                >
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white font-bold">
                      {c.name[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-white/50 truncate">{c.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-white/40">View →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-semibold px-4 py-2 rounded transition"
        >
          <LogOut size={16} /> Log Out
        </button>

        {status && <p className="mt-4 text-sm">{status}</p>}
      </div>

      <MobileBottomNav />
    </main>
  );
}
