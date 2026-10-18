"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";

type Profile = {
  user_id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  tier?: "user" | "pro" | "podcaster";
  is_verified?: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState("");

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

  const setTier = async (userId: string, tier: "user" | "pro" | "podcaster") => {
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
      // Optimistic update
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
            Manage account tiers and badges
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
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {(u.display_name || u.username || "?")[0]?.toUpperCase()}
                </div>
              )}
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
                  setTier(u.user_id, e.target.value as "user" | "pro" | "podcaster")
                }
                disabled={updating === u.user_id}
                className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-red-600 disabled:opacity-50"
              >
                <option value="user">User</option>
                <option value="pro">Pro</option>
                <option value="podcaster">Podcaster</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
