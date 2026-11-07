"use client";
import { PhoneMissed, ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, CheckCheck } from "lucide-react";
import { Phone as PhoneIcon } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";
import { useRealtimeDMs } from "@/hooks/useRealtimeDMs";
import { getCachedUser } from "@/lib/cache";

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
  const [filter, setFilter] = useState<"all" | "unread" | "requests">("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [callFilter, setCallFilter] = useState<"all" | "missed">("all");
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      loadInbox(user.id);
    });
  }, [router]);

  // --- Realtime: refresh inbox on every new incoming message ---
  useRealtimeDMs({
    userId,
    onMessage: () => {
      if (userId) loadInbox(userId, true);
    },
  });

  // --- Fallback poll every 30s (insurance if Realtime drops) ---
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.hidden) return;
      loadInbox(userId, true);
    };
    const iv = setInterval(tick, 30_000);
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
      : filter === "requests"
      ? conversations.filter((c) => !c.last_from_me && c.unread_count > 0)
      : conversations;

  const requestsCount = conversations.filter((c) => !c.last_from_me && c.unread_count > 0).length;

    const [activeTab, setActiveTab] = useState<"messages" | "calls">("messages");

  useEffect(() => {
    if (activeTab === "calls" && userId) {
      setCallsLoading(true);
      fetch(`/api/calls/history?userId=${userId}`)
        .then(r => r.json())
        .then(d => setCallHistory(d.calls || []))
        .catch(() => {})
        .finally(() => setCallsLoading(false));
    }
  }, [activeTab, userId]);


  const [userTier, setUserTier] = useState<"free" | "plus" | "creator">("free");

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) return;
      try {
        const r = await fetch(`/api/profile?user_id=${u.id}`);
        const d = await r.json();
        const raw = String(d.profile?.tier || "free").toLowerCase();
        let norm: "free" | "plus" | "creator" = "free";
        if (raw === "creator" || raw === "podcaster" || raw === "pro") norm = "creator";
        else if (raw === "plus" || raw === "pass") norm = "plus";
        if (norm !== "free" && d.profile?.plus_expires_at) {
          if (new Date(d.profile.plus_expires_at) < new Date()) norm = "free";
        }
        setUserTier(norm);
      } catch {}
    });
  }, []);

  const startCallFromList = (userId: string, name: string, avatar: string | null) => {
    window.dispatchEvent(new CustomEvent("start-call", {
      detail: { recipientId: userId, recipientName: name, recipientAvatar: avatar }
    }));
  };

  const totalUnread = conversations.reduce((n, c) => n + c.unread_count, 0);

  return (
    <main className="flex flex-col text-white overflow-hidden" style={{ background: "#000000", height: "100dvh" }}>
      <TopBar />

      {/* Instagram-style header */}
      <div
        className="pt-16 md:pt-20 flex-shrink-0 border-b border-white/5"
        style={{ background: "#000000" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-end px-4 md:px-6 py-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition"
            aria-label="New message"
          >
            <Plus size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Glass Pill Tabs (matching Plus page) */}
      <div className="flex-shrink-0 pt-4 pb-2" style={{ background: "#000000" }}>
        <div className="max-w-3xl mx-auto flex justify-center px-4 md:px-6">
          <div className="flex bg-white/10 backdrop-blur-xl p-1 rounded-full border border-white/20 shadow-2xl">
            <button
              onClick={() => setActiveTab("messages")}
              className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "messages" ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"}`}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab("calls")}
              className={`px-8 py-2 rounded-full text-sm font-bold transition-all ${activeTab === "calls" ? "bg-white text-black shadow-md" : "text-white/50 hover:text-white"}`}
            >
              Calls
            </button>
          </div>
        </div>
      </div>

      {/* All / Unread / Requests sub-tabs */}
      <div className={`border-b border-white/5 flex-shrink-0 ${activeTab === "messages" ? "" : "hidden"}`} style={{ background: "#000000" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2 px-4 md:px-6 py-2.5">
          <button
            onClick={() => setFilter("all")}
            className={`w-full flex items-center justify-center py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${filter === "all" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`w-full flex items-center justify-center py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${filter === "unread" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
          >
            Unread
            {totalUnread > 0 && (
              <span className="bg-[#E53945] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("requests")}
            className={`w-full flex items-center justify-center py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${filter === "requests" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
          >
            Requests
            {requestsCount > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {requestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Scrollable list - GREY BACKGROUND APPLIED HERE */}
      <div className={`flex-1 overflow-y-auto pb-24 lg:pb-4 bg-black ${activeTab === "calls" ? "hidden" : ""}`}>
        <div className="max-w-3xl mx-auto">
        {loading && (
          <p className="text-white/50 py-12 text-center px-6">Loading…</p>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-white/50 py-16 text-center px-6">
            <p className="mb-2">
              {filter === "unread" ? "No unread messages." : filter === "requests" ? "No message requests." : "No messages yet."}
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
              const name = p?.display_name || p?.username || "User";
              const unread = c.unread_count > 0;

              return (
                <Link
                  key={c.other_user_id}
                  href={`/messages/${c.other_user_id}`}
                  className="flex items-center gap-4 px-4 md:px-6 py-3.5 hover:bg-white/[0.06] active:bg-white/[0.08] transition border-b border-white/5"
                >
                  {/* Bigger avatar — 64px */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-2xl">
                        {(name[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Middle */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[16px] leading-tight truncate ${
                        unread ? "font-bold text-white" : "font-medium text-white"
                      }`}
                    >
                      {name}
                    </p>
                    <div className="flex items-center gap-1 text-[14px] text-white/55 truncate mt-0.5">
                      {c.last_from_me && (
                        <CheckCheck size={15} className="text-sky-400 flex-shrink-0" />
                      )}
                      <span className={`truncate ${unread ? "text-white/80" : ""}`}>
                        {c.last_message}
                      </span>
                      <span className="text-white/40 flex-shrink-0">
                        · {timeLabel(c.last_at)}
                      </span>
                    </div>
                  </div>

                  {/* Blue unread dot (Instagram-style) */}
                  {unread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3797f0] flex-shrink-0" />
                  )}
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
            className="border border-white/10 rounded-2xl w-full max-w-lg mt-16 md:mt-0 overflow-hidden shadow-2xl"
            style={{ background: "#1c1c1e" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition border-b border-white/5"
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
                        {u.display_name || u.username}
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
    
      {/* ========== CALLS TAB CONTENT ========== */}
      {activeTab === "calls" && (
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-4 bg-black">
          <div className="max-w-3xl mx-auto">
            
            {/* Calls Sub-tabs */}
            <div className="grid grid-cols-2 gap-2 px-4 md:px-6 py-2.5 border-b border-white/5">
              <button
                onClick={() => setCallFilter("all")}
                className={`w-full py-2 rounded-full text-xs font-bold transition text-center ${callFilter === "all" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                All
              </button>
              <button
                onClick={() => setCallFilter("missed")}
                className={`w-full py-2 rounded-full text-xs font-bold transition text-center ${callFilter === "missed" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}
              >
                Missed
              </button>
            </div>

            {userTier === "free" ? (
              <div className="text-center py-16 px-6">...</div>
            ) : callsLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>
            ) : callHistory.length === 0 ? (
              <div className="text-center py-16 px-6">
                <p className="text-white/50 mb-2">No calls yet.</p>
              </div>
            ) : (
              <div>
                {callHistory.filter(c => callFilter === "all" || c.status === "missed" || c.status === "declined" || c.status === "unanswered").map((c) => {
                  const isUnanswered = c.status === "missed" || c.status === "declined" || c.status === "unanswered";
                  const isIncoming = !c.isCaller;
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-4 md:px-6 py-3.5 border-b border-white/5">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {c.otherAvatar ? <img src={c.otherAvatar} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-xl">{(c.otherName[0] || "?").toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[16px] font-medium truncate ${isUnanswered ? "text-red-400" : "text-white"}`}>{c.otherName}</p>
                        <div className="flex items-center gap-1 text-[13px] text-white/50">
                          {isUnanswered ? <PhoneMissed size={12} className="text-red-400" /> : isIncoming ? <ArrowDownLeft size={12} className="text-green-500" /> : <ArrowUpRight size={12} className="text-green-500" />}
                          <span>{isUnanswered ? "Unanswered" : isIncoming ? "Incoming" : "Outgoing"}</span>
                          <span className="mx-1">·</span>
                          <span>{timeLabel(c.created_at)}</span>
                          {c.duration_seconds > 0 && (
                            <>
                              <span className="mx-1">·</span>
                              <span>{Math.floor(c.duration_seconds / 60)}m {c.duration_seconds % 60}s</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startCallFromList(c.otherUserId, c.otherName, c.otherAvatar)}
                        className="w-11 h-11 rounded-full bg-[#E53945] hover:bg-[#d12e39] flex items-center justify-center transition shadow-lg"
                      >
                        <PhoneIcon size={20} className="text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
