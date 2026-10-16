"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Send,
  Check,
  CheckCheck,
  Phone,
  Video,
  Mic,
  Image as ImageIcon,
  Smile,
  Plus,
  Camera,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRealtimeDMs } from "@/hooks/useRealtimeDMs";
import GifPicker from "@/components/GifPicker";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";

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
  is_verified?: boolean;
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

const MEDIA_EXT = /\.(gif|png|jpe?g|webp|avif)(\?|$)/i;

function isMediaUrl(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t.startsWith("http")) return false;
  return MEDIA_EXT.test(t);
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
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setMe(user.id);
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

  useRealtimeDMs({
    userId: me,
    withUserId: otherId,
    onMessage: (incoming: any) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === incoming.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = incoming;
          return next;
        }
        const existsAsOptimistic = prev.some(
          (m) => m.id < 0 && m.body === incoming.body && m.sender_id === incoming.sender_id
        );
        if (existsAsOptimistic) {
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length]);

  const uploadAndSendImage = async (file: File) => {
    if (!me) return;
    setUploading(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "dm-images",
        }),
      });
      if (!presign.ok) throw new Error("Upload failed");
      const { signedUrl, publicUrl } = await presign.json();

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      const optimistic: Message = {
        id: -Date.now(),
        sender_id: me,
        recipient_id: otherId,
        body: publicUrl,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      setMessages((prev) => [...prev, optimistic]);
      const res = await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: me, recipientId: otherId, body: publicUrl }),
      });
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } else {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data.message : m)));
        }
      }
    } catch (e) {
      alert("Couldn't send image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

  let lastMineId: number | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === me) {
      lastMineId = messages[i].id;
      break;
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header — white bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 md:px-6">
          <button
            onClick={() => router.push("/messages")}
            className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Back"
          >
            <ChevronLeft size={22} className="text-white" />
          </button>

          <Link
            href={`/u/${otherId}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
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
              <p className="font-semibold text-sm inline-flex items-center gap-1.5 max-w-full text-white">
                <span className="truncate">{name}</span>
                {other?.is_verified && <VerifiedBadge size={13} />}
              </p>
              <p className="text-xs text-white/50 truncate">
                {other?.username ? `@${other.username}` : "last seen recently"}
              </p>
            </div>
          </Link>

          {/* Placeholder call + video icons */}
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition"
            aria-label="Voice call"
          >
            <Phone size={20} className="text-white/80" />
          </button>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 transition"
            aria-label="Video call"
          >
            <Video size={22} className="text-white/80" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pt-20 pb-24 px-4 md:px-6">
        <div className="max-w-2xl w-full mx-auto">
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
              <p className="font-semibold mb-1 inline-flex items-center gap-1.5 text-white">
                {name}
                {other?.is_verified && <VerifiedBadge size={14} />}
              </p>
              <p className="text-white/50 text-sm">
                Say hi — this is the start of your conversation.
              </p>
            </div>
          )}

          {blocks.map((b) => {
            if (b.kind === "day") {
              return (
                <div key={`d-${b.key}`} className="flex justify-center my-4">
                  <span className="text-[10px] font-semibold tracking-wider text-white/40">
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
                ? "rounded-tr-md"
                : ""
              : b.firstOfGroup
              ? "rounded-tl-md"
              : "";

            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"} ${
                  b.lastOfGroup ? "mb-2.5" : "mb-1"
                }`}
              >
                <div
                  className={`relative max-w-[78%] md:max-w-[65%] px-3 py-2 text-[15px] leading-[1.35] break-words ${
                    mine ? "bg-[#dc2626]" : "bg-white/10"
                  } text-white rounded-3xl ${tailCorner}`}
                >
                  {isMediaUrl(m.body) ? (
                    <img
                      src={m.body}
                      alt=""
                      className="rounded-2xl max-w-full max-h-72 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">{m.body}</span>
                  )}

                  <span className="inline-flex items-center gap-1 float-right ml-2 mt-1 text-[10px] text-white/50 translate-y-[2px]">
                    {timeShort(m.created_at)}
                    {showTicks &&
                      (read ? (
                        <CheckCheck size={14} className="text-sky-300" />
                      ) : (
                        <Check size={14} className="text-white/70" />
                      ))}
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
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAndSendImage(f);
            }}
          />

          {/* Camera circle */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 disabled:opacity-50"
            aria-label="Camera"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
          </button>

          {/* Input pill */}
          <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-full px-4 py-2.5 min-w-0">
            <textarea
              ref={inputRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message..."
              rows={1}
              maxLength={2000}
              className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 placeholder:text-white/40 text-white py-0.5"
              style={{ minHeight: "20px", fontSize: "16px" }}
            />
            {/* Placeholder mic */}
            <button
              type="button"
              className="flex-shrink-0 text-white/60 hover:text-white transition"
              aria-label="Voice message"
            >
              <Mic size={20} />
            </button>
            {/* Image picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 text-white/60 hover:text-white transition disabled:opacity-50"
              aria-label="Send image"
            >
              <ImageIcon size={20} />
            </button>
            {/* GIF / sticker — opens GifPicker for now */}
            <button
              type="button"
              onClick={() => setGifOpen(true)}
              className="flex-shrink-0 text-white/60 hover:text-white transition"
              aria-label="Sticker"
            >
              <Smile size={20} />
            </button>
          </div>

          {/* Send when text, + otherwise */}
          {body.trim() ? (
            <button
              onClick={send}
              disabled={sending}
              className="flex-shrink-0 text-[#dc2626] font-semibold text-sm px-1 disabled:opacity-40"
              aria-label="Send"
            >
              Send
            </button>
          ) : (
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
              aria-label="More"
            >
              <Plus size={20} className="text-white" />
            </button>
          )}
        </div>
      </div>

      <GifPicker
        open={gifOpen}
        onClose={() => setGifOpen(false)}
        onPick={async (url) => {
          setGifOpen(false);
          if (!me) return;
          const optimistic: Message = {
            id: -Date.now(),
            sender_id: me,
            recipient_id: otherId,
            body: url,
            created_at: new Date().toISOString(),
            read_at: null,
          };
          setMessages((prev) => [...prev, optimistic]);
          try {
            const res = await fetch("/api/dm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ senderId: me, recipientId: otherId, body: url }),
            });
            const data = await res.json();
            if (res.ok && data.message) {
              setMessages((prev) =>
                prev.map((m) => (m.id === optimistic.id ? data.message : m))
              );
            } else {
              setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            }
          } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          }
        }}
      />
    </main>
  );
}
