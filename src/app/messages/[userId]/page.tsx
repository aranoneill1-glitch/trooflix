"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Send } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

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

function timeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 md:px-6">
          <button
            onClick={() => router.push("/messages")}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition"
            aria-label="Back"
          >
            <ChevronLeft size={24} />
          </button>

          <Link href={`/u/${otherId}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <p className="text-xs text-white/50 truncate">{handle}</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-28 px-3 md:px-6 max-w-3xl w-full mx-auto">
        {loading && <p className="text-white/40 text-center py-12">Loading…</p>}

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

        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          const showAvatar =
            !mine &&
            (i === 0 || messages[i - 1].sender_id !== m.sender_id);
          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 mb-1 ${mine ? "justify-end" : "justify-start"}`}
            >
              {!mine && (
                <div className="w-7 h-7 flex-shrink-0">
                  {showAvatar && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden">
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-[10px] font-bold">
                          {(name[0] || "?").toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`max-w-[75%] md:max-w-[65%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  mine
                    ? "bg-red-600 text-white rounded-br-sm"
                    : "bg-white/10 text-white rounded-bl-sm"
                }`}
              >
                {m.body}
                <span className="block text-[10px] opacity-60 mt-1 text-right">
                  {timeShort(m.created_at)}
                </span>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-white/10">
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-3 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-white/30 resize-none max-h-32"
            style={{ minHeight: "40px" }}
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 rounded-full p-2.5 transition flex-shrink-0"
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
