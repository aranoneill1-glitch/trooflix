"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";

type User = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean;
};

export default function ShareReelSheet({
  open,
  onClose,
  videoId,
  videoTitle,
}: {
  open: boolean;
  onClose: () => void;
  videoId: number;
  videoTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSentTo(new Set());
      setStatusMsg("");
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setResults(Array.isArray(d.users) ? d.users : []);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  const sendTo = async (u: User) => {
    const me = await getCachedUser();
    if (!me) {
      setStatusMsg("Not signed in");
      return;
    }
    setSending(u.user_id);
    try {
      const res = await fetch("/api/dm/send-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: me.id,
          toUserId: u.user_id,
          videoId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setStatusMsg(d.error || "Could not send");
        return;
      }
      setSentTo((prev) => new Set(prev).add(u.user_id));
      setStatusMsg("Sent ✓");
      setTimeout(() => setStatusMsg(""), 1500);
    } catch {
      setStatusMsg("Network error");
    } finally {
      setSending(null);
    }
  };

  const label = (u: User) => u.display_name || u.username || "User";
  const handle = (u: User) => (u.username ? `@${u.username}` : "");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[600] bg-black/70"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[601] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4 max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-center pt-2.5">
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <h2 className="text-base font-bold">
                Send to{videoTitle ? `: ${videoTitle.slice(0, 30)}${videoTitle.length > 30 ? "…" : ""}` : ""}
              </h2>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by @handle or name"
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-red-600 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto px-2 pb-4">
              {loading && (
                <p className="text-center text-white/40 text-sm py-6">Searching…</p>
              )}

              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-center text-white/40 text-sm py-6">No users found</p>
              )}

              {!loading && query.trim().length < 2 && (
                <p className="text-center text-white/40 text-sm py-6">
                  Start typing to find someone
                </p>
              )}

              {results.map((u) => {
                const already = sentTo.has(u.user_id);
                return (
                  <button
                    key={u.user_id}
                    onClick={() => !already && sendTo(u)}
                    disabled={sending === u.user_id || already}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition text-left disabled:opacity-60"
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center font-bold flex-shrink-0">
                        {label(u)[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold inline-flex items-center gap-1 truncate">
                        {label(u)}
                        {u.is_verified && <VerifiedBadge size={12} />}
                      </p>
                      {handle(u) && (
                        <p className="text-xs text-white/50 truncate">{handle(u)}</p>
                      )}
                    </div>
                    {already ? (
                      <span className="text-xs text-green-400 font-semibold">Sent</span>
                    ) : sending === u.user_id ? (
                      <span className="text-xs text-white/50">Sending…</span>
                    ) : (
                      <span className="text-xs text-red-500 font-semibold">Send</span>
                    )}
                  </button>
                );
              })}
            </div>

            {statusMsg && (
              <div className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/70">
                {statusMsg}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
