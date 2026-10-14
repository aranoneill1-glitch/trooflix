"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Send, Smile, Check, CheckCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRealtimeDMs } from "@/hooks/useRealtimeDMs";

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};


function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);

  if (dayKey(iso) === dayKey(today.toISOString())) return "TODAY";
  if (dayKey(iso) === dayKey(yest.toISOString())) return "YESTERDAY";
  return d
    .toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const otherId = params.userId as string;

  const [me, setMe] = useState<string | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setMe(data.user.id);
    });
  }, [router]);

  // Initial load: profile + messages
  useEffect(() => {
    if (!me || !otherId) return;

    Promise.all([
      fetch(`/api/users?id=${otherId}`).then((r) => r.json()),
      fetch(`/api/dm?user_id=${me}&with=${otherId}`).then((r) => r.json()),
    ]).then(([u, d]) => {
      setOther(u.user || null);
      setMessages(Array.isArray(d.messages) ? d.messages : []);
      setLoading(false);
    });
  }, [me, otherId]);

  // --- Realtime: instant updates via Supabase WebSocket ---
  useRealtimeDMs({
    userId: me,
    withUserId: otherId,
    onMessage: (incoming: any) => {
      setMessages((prev) => {
        // If we already have this message id, replace it (read_at updates)
        const idx = prev.findIndex((m) => m.id === incoming.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = incoming;
          return next;
        }
        // Otherwise append (but skip our own optimistic dupes)
        const existsAsOptimistic = prev.some(
          (m) => m.id < 0 && m.body === incoming.body && m.sender_id === incoming.sender_id
        );
        if (existsAsOptimistic) {
          // Replace the first matching optimistic entry with the real one
          let replaced = false;
          return prev.map((m) => {
            if (
              !replaced &&
              m.id < 0 &&
              m.body === incoming.body &&
              m.sender_id === incoming.sender_id
            ) {
              replaced = true;
              return incoming;
            }
            return m;
          });
        }
        return [...prev, incoming];
      });
    },
  });

  // --- Fallback poll every 30s (insurance if Realtime connection drops) ---
  useEffect(() => {
    if (!me || !otherId) return;

    const tick = () => {
      if (document.hidden) return;
      fetch(`/api/dm?user_id=${me}&with=${otherId}`)
        .then((r) => r.json())
        .then((d) => {
          const incoming: Message[] = Array.isArray(d.messages) ? d.messages : [];
          setMessages((prev) => {
            const incomingIds = new Set(incoming.map((m) => m.id));
            const stillPending = prev.filter(
              (m) => m.id < 0 && !incomingIds.has(m.id)
            );
            return [...incoming, ...stillPending];
          });
        })
        .catch(() => {});
    };

    const interval = setInterval(tick, 30_000);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [me, otherId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length]);

  const send = async () => {
    const trimmed = body.trim();
    if (!trimmed || !me || sending) return;

    setSending(true);
    const optimistic: Message = {
      id: -Date.now(),
      sender_id: me,
      recipient_id: otherId,
      body: trimmed,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");

    try {
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: me, recipientId: otherId, body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setBody(trimmed);
      } else if (data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? data.message : m))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handle = other?.username ? `@${other.username}` : "User";
  const name = other?.display_name || handle;

  // Build render list with date separators
  const blocks: Array<
    | { kind: "day"; key: string; label: string }
    | { kind: "msg"; msg: Message; firstOfGroup: boolean; lastOfGroup: boolean }
  > = [];
  let lastDay = "";
  messages.forEach((m, i) => {
    const k = dayKey(m.created_at);
    if (k !== lastDay) {
      blocks.push({ kind: "day", key: k, label: dayLabel(m.created_at) });
      lastDay = k;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const firstOfGroup = !prev || prev.sender_id !== m.sender_id || dayKey(prev.created_at) !== k;
    const lastOfGroup = !next || next.sender_id !== m.sender_id || dayKey(next.created_at) !== k;
    blocks.push({ kind: "msg", msg: m, firstOfGroup, lastOfGroup });
  });

  // Determine last outgoing message (to render ticks only there)
  let lastMineId: number | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === me) {
      lastMineId = messages[i].id;
      break;
    }
  }

  return (
    <main className="min-h-screen text-white flex flex-col" style={{ background: "#000000" }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-black/40"
        style={{ background: "#000000" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5 md:px-6">
          <button
            onClick={() => router.push("/messages")}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>

          <Link href={`/u/${otherId}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
              {other?.avatar_url ? (
                <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">
                  {(name[0] || "?").toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{name}</p>
              <p className="text-xs text-white/50 truncate">
                {other?.username ? `@${other.username}` : "last seen recently"}
              </p>
            </div>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto pt-20 pb-24 px-3 md:px-6"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.02) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.02) 0, transparent 40%)",
        }}
      >
        <div className="max-w-3xl w-full mx-auto">
          {loading && (
            <p className="text-white/40 text-center py-12">Loading…</p>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden">
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-2xl">
                    {(name[0] || "?").toUpperCase()}
                  </span>
                )}
              </div>
              <p className="font-semibold mb-1">{name}</p>
              <p className="text-white/50 text-sm">
                Say hi — this is the start of your conversation.
              </p>
            </div>
          )}

          {blocks.map((b) => {
            if (b.kind === "day") {
              return (
                <div key={`d-${b.key}`} className="flex justify-center my-4">
                  <span className="text-[10px] font-semibold tracking-wider text-white/60 bg-white/5 px-3 py-1 rounded-full">
                    {b.label}
                  </span>
                </div>
              );
            }

            const m = b.msg;
            const mine = m.sender_id === me;
            const showTicks = mine && m.id === lastMineId;
            const read = !!m.read_at;
            const tailCorner = mine
              ? b.firstOfGroup
                ? "rounded-tr-sm"
                : ""
              : b.firstOfGroup
              ? "rounded-tl-sm"
              : "";

            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"} ${
                  b.lastOfGroup ? "mb-1.5" : "mb-0.5"
                }`}
              >
                <div
                  className={`relative max-w-[78%] md:max-w-[65%] px-2.5 py-1.5 text-[14px] leading-[1.35] break-words shadow-sm ${
                    mine
                      ? "bg-[#dc2626] text-white"
                      : "bg-white/10 text-white"
                  } rounded-md ${tailCorner}`}
                >
                  {/* Bubble tail */}
                  {b.firstOfGroup && (
                    <span
                      className={`absolute top-0 w-2 h-3 ${
                        mine
                          ? "-right-[6px] bg-[#dc2626]"
                          : "-left-[6px] bg-white/10"
                      }`}
                      style={{
                        clipPath: mine
                          ? "polygon(0 0, 100% 0, 0 100%)"
                          : "polygon(0 0, 100% 0, 100% 100%)",
                      }}
                    />
                  )}

                  <span className="whitespace-pre-wrap">{m.body}</span>

                  {/* Timestamp + ticks — inline bottom-right */}
                  <span className="inline-flex items-center gap-1 float-right ml-2 mt-1 text-[10px] text-white/70 translate-y-[2px]">
                    {timeShort(m.created_at)}
                    {showTicks && (
                      read ? (
                        <CheckCheck size={14} className="text-sky-300" />
                      ) : (
                        <CheckCheck size={14} className="text-white/70" />
                      )
                    )}
                  </span>
                  <span className="clear-both" />
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t border-black/40"
        style={{ background: "#000000" }}
      >
        <div className="max-w-3xl mx-auto px-2 md:px-4 py-2 flex items-end gap-2">
          <button
            className="p-2 text-white/70 hover:text-white transition flex-shrink-0"
            aria-label="Emoji"
          >
            <Smile size={22} />
          </button>

          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message"
            rows={1}
            maxLength={2000}
            className="flex-1 bg-[#2a3942] border-none rounded-2xl px-3.5 py-2.5 outline-none resize-none max-h-32 placeholder:text-white/40"
            style={{ minHeight: "40px", fontSize: "16px" }}
          />

          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="w-11 h-11 flex items-center justify-center bg-[#dc2626] hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-[#dc2626] rounded-full transition flex-shrink-0"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
