"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Trash2, Camera, Loader2 } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";

type Profile = {
  user_id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  tier?: "user" | "podcaster";
  is_verified?: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const d = await res.json();
      setUsers(Array.isArray(d.users) ? d.users : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setTier = async (userId: string, tier: "user" | "podcaster") => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Could not update");
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, tier, is_verified: tier !== "user" }
            : u
        )
      );
      setToast(`✅ Set ${tier}`);
      setTimeout(() => setToast(""), 2000);
    } catch (err: any) {
      setToast(`❌ ${err.message}`);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setUpdating(null);
    }
  };

  const deleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${displayName}? This will remove their account, videos, and all data. This cannot be undone.`)) return;
    
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Could not delete");
      }
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      setToast(`✅ Deleted ${displayName}`);
      setTimeout(() => setToast(""), 2000);
    } catch (err: any) {
      setToast(`❌ ${err.message}`);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setUpdating(null);
    }
  };

  const triggerAvatarUpload = (userId: string) => {
    setEditingUserId(userId);
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUserId) return;

    setUploadingAvatar(editingUserId);
    const userId = editingUserId;

    try {
      // 1. Upload to R2
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "avatars",
        }),
      });
      
      if (!presign.ok) throw new Error("Failed to get upload URL");
      const { signedUrl, publicUrl } = await presign.json();

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      
      if (!putRes.ok) throw new Error("Failed to upload to R2");

      // 2. Save to Database via Admin API
      const dbRes = await fetch("/api/admin/update-user-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, avatarUrl: publicUrl }),
      });

      if (!dbRes.ok) throw new Error("Failed to update database");

      // 3. Update UI
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, avatar_url: publicUrl } : u));
      setToast("✅ Avatar updated");
      setTimeout(() => setToast(""), 2000);

    } catch (err: any) {
      setToast(`❌ ${err.message}`);
      setTimeout(() => setToast(""), 3000);
    } finally {
      setUploadingAvatar(null);
      setEditingUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-white/50 mt-1">
            Manage account tiers, badges, and avatars
          </p>
        </div>
        <div className="text-sm text-white/60">{users.length} total</div>
      </div>

      {toast && (
        <div className="mb-4 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm">
          {toast}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />

      <input
        type="text"
        placeholder="Search by name, @handle, or user ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-red-600"
      />

      {loading ? (
        <p className="text-white/50 py-12 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/50 py-12 text-center">No users found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center gap-3 bg-[#141418] rounded-lg p-3"
            >
              {/* CLICKABLE AVATAR FOR UPLOAD */}
              <div 
                onClick={() => triggerAvatarUpload(u.user_id)}
                className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 group cursor-pointer border border-white/10"
                title="Upload new avatar"
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold">
                    {(u.display_name || u.username || "?")[0]?.toUpperCase()}
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar === u.user_id ? (
                    <Loader2 size={14} className="text-white animate-spin" />
                  ) : (
                    <Camera size={14} className="text-white" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold inline-flex items-center gap-1.5 truncate">
                  {u.username ? (
                    <Link
                      href={`/u/${u.username}`}
                      className="hover:underline truncate"
                    >
                      {u.display_name || u.username}
                    </Link>
                  ) : (
                    <span className="truncate">{u.display_name || "No name"}</span>
                  )}
                  {u.is_verified && (
                    <VerifiedBadge
                      size={14}
                      variant={u.tier === "podcaster" ? "gold" : "red"}
                    />
                  )}
                </p>
                <p className="text-xs text-white/40 truncate">
                  {u.username ? `@${u.username}` : u.user_id.slice(0, 8) + "..."}
                </p>
              </div>
              <select
                value={u.tier || "user"}
                onChange={(e) =>
                  setTier(u.user_id, e.target.value as "user" | "podcaster")
                }
                disabled={updating === u.user_id}
                className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-red-600 disabled:opacity-50"
              >
                <option value="user">TrooPass</option>
                <option value="podcaster">Creator</option>
              </select>

              <button
                onClick={() => deleteUser(u.user_id, u.display_name || u.username || "this user")}
                disabled={updating === u.user_id}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition disabled:opacity-50"
                title="Delete User"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
