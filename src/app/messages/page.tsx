"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";

type Conversation = {
  other_user_id: string;
  last_message: string;
  last_at: string;
  unread_count: number;
  last_from_me: boolean;
};

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / 604800)}w`;
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

  const loadInbox = async (uid: string) => {
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
      setLoading(false);
    }
  };

  // Debounced search for "start new chat"
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
          setResults(
            (d.users || []).filter((u: Profile) => u.user_id !== userId)
          );
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query, userId]);

  const visible =
    filter === "unread"
      ? conversations.filter((c) => c.unread_count > 0)
      : conversations;

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-black">Messages</h1>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm font-semibold transition"
          >
            <Plus size={16} /> New
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                filter === f
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "All" : "Unread"}
              {f === "unread" && conversations.some((c) => c.unread_count > 0) && (
                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && <p className="text-white/50 py-12 text-center">Loading…</p>}

        {!loading && visible.length === 0 && (
          <div className="text-white/50 py-16 text-center">
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
          <div className="bg-[#141418] border border-white/5 rounded-lg divide-y divide-white/5 overflow-hidden">
            {visible.map((c) => {
              const p = profiles[c.other_user_id];
              const handle = p?.username ? `@${p.username}` : "user";
              const name = p?.display_name || handle;
              return (
                <Link
                  key={c.other_user_id}
                  href={`/messages/${c.other_user_id}`}
                  className="flex items-center gap-3 p-3 md:p-4 hover:bg-white/5 transition"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {(name[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold truncate">{name}</span>
                      <span className="text-xs text-white/40 shrink-0">
                        {timeAgo(c.last_at)}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 truncate">
                      {c.last_from_me && <span className="text-white/40">You: </span>}
                      {c.last_message}
                    </p>
                  </div>

                  {c.unread_count > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* New message search modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-start md:items-center justify-center p-4"
          onClick={() => {
            setSearchOpen(false);
            setQuery("");
            setResults([]);
          }}
        >
          <div
            className="bg-[#141418] border border-white/10 rounded-lg w-full max-w-lg mt-16 md:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <Search size={18} className="text-white/50" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by @handle or name…"
                className="flex-1 bg-transparent outline-none text-sm text-white"
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
                      <p className="font-semibold truncate">{u.display_name || `@${u.username}`}</p>
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
