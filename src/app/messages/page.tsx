"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, CheckCheck } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

type Conversation = {
  other_user_id: string;
  last_message: string;
  last_at: string;
  unread_count: number;
  last_from_me: boolean;
  last_read_at: string | null;
};

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate()
  ) {
    return "Yesterday";
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "long" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function MessagesInbox() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      loadInbox(data.user.id);
    });
  }, [router]);

  // Poll inbox every 3s while visible
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.hidden) return;
      loadInbox(userId, true);
    };
    const iv = setInterval(tick, 3000);
    const onVis = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId]);

  const loadInbox = async (uid: string, silent = false) => {
    try {
      const r = await fetch(`/api/dm?user_id=${uid}`);
      const d = await r.json();
      const list: Conversation[] = Array.isArray(d.conversations) ? d.conversations : [];
      setConversations(list);

      const ids = list.map((c) => c.other_user_id).filter(Boolean);
      if (ids.length > 0) {
        const pr = await fetch(`/api/users?ids=${ids.join(",")}`);
        const pd = await pr.json();
        const map: Record<string, Profile> = {};
        (pd.users || []).forEach((u: Profile) => {
          map[u.user_id] = u;
        });
        setProfiles(map);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/users?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => {
          setResults((d.users || []).filter((u: Profile) => u.user_id !== userId));
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query, userId]);

  const visible =
    filter === "unread"
      ? conversations.filter((c) => c.unread_count > 0)
      : conversations;

  const totalUnread = conversations.reduce((n, c) => n + c.unread_count, 0);

  return (
    <main className="flex flex-col text-white overflow-hidden" style={{ background: "#0b141a", height: "100dvh" }}>
      <TopBar />

      {/* Pinned title + filters (below TopBar) */}
      <div className="pt-16 md:pt-20 flex-shrink-0 border-b border-white/5" style={{ background: "#0b141a" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <h1 className="text-2xl md:text-3xl font-black">Messages</h1>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 bg-[#dc2626] hover:bg-red-500 px-3 py-1.5 rounded-full text-sm font-semibold transition"
            >
              <Plus size={16} /> New
            </button>
          </div>
          <div className="flex gap-2 px-4 md:px-6 pb-3">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition ${
                  filter === f
                    ? "bg-[#dc2626]/20 text-red-300"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                {f === "all" ? "All" : `Unread${totalUnread ? ` (${totalUnread})` : ""}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pb-24 lg:pb-4">
        <div className="max-w-3xl mx-auto">
        {loading && (
          <p className="text-white/50 py-12 text-center px-6">Loading…</p>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-white/50 py-16 text-center px-6">
            <p className="mb-2">
              {filter === "unread" ? "No unread messages." : "No messages yet."}
            </p>
            <button
              onClick={() => setSearchOpen(true)}
              className="text-red-500 hover:underline text-sm"
            >
              Start a conversation →
            </button>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div>
            {visible.map((c) => {
              const p = profiles[c.other_user_id];
              const name = p?.display_name || (p?.username ? `@${p.username}` : "User");
              const unread = c.unread_count > 0;

              return (
                <Link
                  key={c.other_user_id}
                  href={`/messages/${c.other_user_id}`}
                  className="flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-white/[0.03] active:bg-white/[0.05] transition border-b border-white/5"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {(name[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Middle */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] leading-tight truncate">
                      {name}
                    </p>
                    <div className="flex items-center gap-1 text-[13px] text-white/55 truncate">
                      {c.last_from_me && (
                        <CheckCheck size={14} className="text-sky-400 flex-shrink-0" />
                      )}
                      <span className="truncate">{c.last_message}</span>
                    </div>
                  </div>

                  {/* Right: time + unread badge */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 pl-2">
                    <span
                      className={`text-xs ${
                        unread ? "text-[#22c55e] font-semibold" : "text-white/40"
                      }`}
                    >
                      {timeLabel(c.last_at)}
                    </span>
                    {unread && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#22c55e] text-black text-[11px] font-bold flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* New message modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-start md:items-center justify-center p-4"
          onClick={() => {
            setSearchOpen(false);
            setQuery("");
            setResults([]);
          }}
        >
          <div
            className="border border-white/10 rounded-2xl w-full max-w-lg mt-16 md:mt-0 overflow-hidden"
            style={{ background: "#1f2c33" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-black/30 px-4 py-3">
              <Search size={18} className="text-white/50" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by @handle or name…"
                className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40"
                style={{ fontSize: "16px" }}
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              {searching && (
                <p className="text-white/50 text-sm p-6 text-center">Searching…</p>
              )}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-white/50 text-sm p-6 text-center">No users found.</p>
              )}
              {!searching &&
                results.map((u) => (
                  <Link
                    key={u.user_id}
                    href={`/messages/${u.user_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">
                          {(u.display_name?.[0] || u.username?.[0] || "?").toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {u.display_name || `@${u.username}`}
                      </p>
                      {u.username && (
                        <p className="text-xs text-white/50 truncate">@{u.username}</p>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}
