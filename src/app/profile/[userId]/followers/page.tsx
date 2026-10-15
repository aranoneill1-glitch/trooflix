"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import VerifiedBadge from "@/components/VerifiedBadge";

type User = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified?: boolean;
};

export default function FollowersPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user-follows?user_id=${userId}&list=followers`)
      .then((r) => r.json())
      .then(async (d) => {
        const ids: string[] = d.user_ids || [];
        if (ids.length === 0) {
          setLoading(false);
          return;
        }
        try {
          const ur = await fetch(`/api/users?ids=${ids.join(",")}`);
          const ud = await ur.json();
          setUsers(ud.users || []);
        } catch {}
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
          <h1 className="text-2xl font-black">Followers</h1>
        </div>

        {loading && <p className="text-white/40 text-center py-12">Loading…</p>}

        {!loading && users.length === 0 && (
          <p className="text-white/40 text-center py-12">
            No followers yet.
          </p>
        )}

        <div className="divide-y divide-white/5">
          {users.map((u) => {
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
                  <p className="font-semibold inline-flex items-center gap-1.5 max-w-full">
                    <span className="truncate">{name}</span>
                    {u.is_verified && <VerifiedBadge size={13} />}
                  </p>
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
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
