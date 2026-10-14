"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, LogOut, Bookmark, Check, X } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FollowStats from "@/components/FollowStats";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email || "");
      fetch(`/api/profile?user_id=${data.user.id}`)
        .then((r) => r.json())
        .then((d) => {
          setProfile(d.profile || null);
          setDisplayName(d.profile?.display_name || "");
          setBio(d.profile?.bio || "");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus("");
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        displayName: displayName.trim(),
        bio: bio.trim(),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus("✅ Saved");
      setEditing(false);
      setProfile((p) =>
        p
          ? { ...p, display_name: displayName.trim(), bio: bio.trim() }
          : p
      );
      setTimeout(() => setStatus(""), 2000);
    } else {
      setStatus("❌ Could not save");
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    setStatus("");

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
      if (!put.ok) throw new Error("S3 PUT failed");

      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, avatarUrl: publicUrl }),
      });

      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      setStatus("✅ Avatar updated");
      setTimeout(() => setStatus(""), 2000);
    } catch (err: any) {
      setStatus("❌ " + (err.message || "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const name = profile?.display_name || email.split("@")[0] || "User";
  const handle = profile?.username ? `@${profile.username}` : "";

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        {loading && <p className="text-white/50 py-12 text-center">Loading…</p>}

        {!loading && (
          <>
            {/* Profile card */}
            <div className="bg-[#0d0d10] border border-white/5 rounded-xl p-6 mb-4">
              <div className="flex items-start gap-5">
                {/* Avatar — clickable */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 overflow-hidden group"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold">
                      {(name[0] || "?").toUpperCase()}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Camera size={22} />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs">
                      Uploading…
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Display name"
                        maxLength={40}
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-lg font-bold outline-none focus:border-red-600"
                      />
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Say something about yourself"
                        maxLength={300}
                        rows={3}
                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600 resize-none"
                      />
                      <p className="text-[11px] text-white/40 text-right">
                        {bio.length}/300
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={saveProfile}
                          disabled={saving}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-1.5 rounded text-sm font-semibold"
                        >
                          <Check size={14} /> {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setEditing(false);
                            setDisplayName(profile?.display_name || "");
                            setBio(profile?.bio || "");
                          }}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-sm font-semibold"
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl md:text-3xl font-black truncate">
                        {name}
                      </h1>
                      {handle && (
                        <p className="text-white/50 text-sm mb-2">{handle}</p>
                      )}
                      {userId && <FollowStats userId={userId} />}
                      {profile?.bio ? (
                        <p className="text-sm text-white/80 whitespace-pre-wrap">
                          {profile.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-white/40 italic">
                          No bio yet.
                        </p>
                      )}
                      <button
                        onClick={() => setEditing(true)}
                        className="mt-3 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full text-sm font-semibold transition"
                      >
                        Edit profile
                      </button>
                    </>
                  )}
                  {status && (
                    <p className="text-xs mt-3 text-white/70">{status}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-[#0d0d10] border border-white/5 rounded-xl divide-y divide-white/5 mb-4">
              <Link
                href="/my-list"
                className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition"
              >
                <Bookmark size={18} className="text-white/70" />
                <span className="font-semibold flex-1">My List</span>
                <span className="text-white/40 text-sm">→</span>
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition"
              >
                <Camera size={18} className="text-white/70" />
                <span className="font-semibold flex-1">Account settings</span>
                <span className="text-white/40 text-sm">→</span>
              </Link>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl text-sm font-semibold text-red-400 transition"
            >
              <LogOut size={16} /> Log Out
            </button>
          </>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
