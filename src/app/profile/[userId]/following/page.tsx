"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

type Podcaster = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
};

type User = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function FollowingPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [tab, setTab] = useState<"users" | "podcasters">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [podcasters, setPodcasters] = useState<Podcaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/user-follows?user_id=${userId}&list=following`)
        .then((r) => r.json())
        .catch(() => ({ user_ids: [] })),
      fetch(`/api/follows?user_id=${userId}`)
        .then((r) => r.json())
        .catch(() => ({ ids: [] })),
      fetch("/api/creators")
        .then((r) => r.json())
        .catch(() => []),
    ]).then(async ([userFollows, podcasterFollows, creators]) => {
      const userIds: string[] = userFollows.user_ids || [];
      const podcasterIds: number[] = podcasterFollows.ids || [];

      // Hydrate users
      if (userIds.length > 0) {
        try {
          const ur = await fetch(`/api/users?ids=${userIds.join(",")}`);
          const ud = await ur.json();
          setUsers(ud.users || []);
        } catch {}
      }

      // Filter creators
      const cs: Podcaster[] = Array.isArray(creators) ? creators : [];
      setPodcasters(cs.filter((c) => podcasterIds.includes(c.id)));

      setLoading(false);
    });
  }, [userId]);

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto px-4 md:px-6">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/profile"
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition"
          >
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-2xl font-black">Following</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              tab === "users" ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setTab("podcasters")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              tab === "podcasters" ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            Podcasters ({podcasters.length})
          </button>
        </div>

        {loading && <p className="text-white/40 text-center py-12">Loading…</p>}

        {!loading && tab === "users" && users.length === 0 && (
          <p className="text-white/40 text-center py-12">
            Not following any users yet.
          </p>
        )}
        {!loading && tab === "podcasters" && podcasters.length === 0 && (
          <p className="text-white/40 text-center py-12">
            Not following any podcasters yet.
          </p>
        )}

        <div className="divide-y divide-white/5">
          {tab === "users" &&
            users.map((u) => {
              const name = u.display_name || `@${u.username}`;
              return (
                <Link
                  key={u.user_id}
                  href={`/u/${u.username || u.user_id}`}
                  className="flex items-center gap-3 py-3 hover:bg-white/[0.03] transition -mx-4 px-4"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold">{(name[0] || "?").toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{name}</p>
                    {u.username && (
                      <p className="text-xs text-white/50 truncate">@{u.username}</p>
                    )}
                    {u.bio && (
                      <p className="text-xs text-white/60 truncate mt-0.5">{u.bio}</p>
                    )}
                  </div>
                </Link>
              );
            })}

          {tab === "podcasters" &&
            podcasters.map((c) => (
              <Link
                key={c.id}
                href={`/podcaster/${c.slug}`}
                className="flex items-center gap-3 py-3 hover:bg-white/[0.03] transition -mx-4 px-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold">{(c.name[0] || "?").toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-white/50 truncate">Podcaster</p>
                </div>
              </Link>
            ))}
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
