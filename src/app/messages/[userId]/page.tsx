"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Send,
  Check,
  CheckCheck,
  Camera,
  Pencil,
  Trash2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRealtimeDMs } from "@/hooks/useRealtimeDMs";
import GifPicker from "@/components/GifPicker";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getCachedUser } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";

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
  const [actionSheetFor, setActionSheetFor] = useState<Message | null>(null);
  const [editFor, setEditFor] = useState<Message | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [reelCache, setReelCache] = useState<Record<number, any>>({});
  const longPressRef = useRef<{ timer: any; fired: boolean } | null>(null);
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

  const name = other?.display_name || other?.username || "User";

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


  // ---- Reel detection + fetch ----
  const REEL_PREFIX = "__REEL__:";
  const isReelMessage = (body: string) => body.startsWith(REEL_PREFIX);
  const reelIdOf = (body: string) => Number(body.slice(REEL_PREFIX.length));

  useEffect(() => {
    if (!messages.length) return;
    const missing: number[] = [];
    for (const m of messages) {
      if (isReelMessage(m.body)) {
        const id = reelIdOf(m.body);
        if (id && !reelCache[id]) missing.push(id);
      }
    }
    if (missing.length === 0) return;
    fetch("/api/videos")
      .then((r) => r.json())
      .then((all: any[]) => {
        const arr = Array.isArray(all) ? all : [];
        const found: Record<number, any> = {};
        for (const id of missing) {
          const v = arr.find((x: any) => Number(x.id) === id);
          if (v) found[id] = v;
        }
        if (Object.keys(found).length > 0) {
          setReelCache((prev) => ({ ...prev, ...found }));
        }
      })
      .catch(() => {});
  }, [messages, reelCache]);

  // ---- Long-press / right-click on a message bubble ----
  const startLongPress = (m: Message) => {
    if (m.id < 0) return; // optimistic, not yet saved
    longPressRef.current = {
      timer: setTimeout(() => {
        if (longPressRef.current) longPressRef.current.fired = true;
        setActionSheetFor(m);
      }, 500),
      fired: false,
    };
  };

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    }
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    if (longPressRef.current?.fired) {
      e.preventDefault();
      e.stopPropagation();
      longPressRef.current = null;
    }
  };

  const deleteMessage = async (m: Message) => {
    if (!me) return;
    if (!confirm("Delete this message?")) return;
    setActionSheetFor(null);
    const res = await fetch(`/api/dm?id=${m.id}&userId=${me}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } else {
      alert("Could not delete.");
    }
  };

  const openEdit = (m: Message) => {
    setEditFor(m);
    setEditBody(m.body);
    setActionSheetFor(null);
  };

  const saveEdit = async () => {
    if (!editFor || !me) return;
    const trimmed = editBody.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    const res = await fetch("/api/dm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editFor.id, senderId: me, body: trimmed }),
    });
    setSavingEdit(false);
    if (res.ok) {
      const d = await res.json();
      setMessages((prev) =>
        prev.map((x) => (x.id === editFor.id ? { ...x, body: d.message?.body || trimmed } : x))
      );
      setEditFor(null);
      setEditBody("");
    } else {
      const d = await res.json();
      alert(d.error || "Could not save");
    }
  };

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
                {other?.username ? other.username : ""}
              </p>
            </div>
          </Link>

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
                {(() => {
                  const isMedia = isMediaUrl(m.body);
                  const isReel = isReelMessage(m.body);
                  const isChrome = isMedia || isReel;

                  return (
                    <div
                      className={`relative break-words ${
                        isChrome
                          ? "max-w-[78%] md:max-w-[65%]"
                          : `max-w-[78%] md:max-w-[65%] px-3 py-2 text-[15px] leading-[1.35] ${
                              mine ? "bg-[#dc2626]" : "bg-white/10"
                            } text-white rounded-3xl ${tailCorner}`
                      }`}
                      onPointerDown={() => startLongPress(m)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      onClick={handleMessageClick}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (m.id > 0) setActionSheetFor(m);
                      }}
                      style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
                    >
                      {isReel ? (() => {
                        const rid = reelIdOf(m.body);
                        const reel = reelCache[rid];
                        return (
                          <a
                            href={`/feed?reel=${rid}`}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="block w-64 max-w-full"
                          >
                            <div className="rounded-2xl overflow-hidden">
                              {reel?.posterUrl || reel?.backdropUrl ? (
                                <img
                                  src={reel.posterUrl || reel.backdropUrl}
                                  alt={reel?.title || "Reel"}
                                  className="w-full aspect-[4/5] object-cover"
                                />
                              ) : (
                                <div className="w-full aspect-[4/5] bg-black/60 flex items-center justify-center text-white/40 text-sm">
                                  Loading…
                                </div>
                              )}
                              <div className="px-3 py-2 bg-black/60">
                                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-0.5">
                                  Reel
                                </p>
                                <p className="text-sm font-semibold text-white truncate">
                                  {reel?.title || "Tap to view"}
                                </p>
                              </div>
                            </div>
                          </a>
                        );
                      })() : isMedia ? (
                        <>
                          <img
                            src={m.body}
                            alt=""
                            className="rounded-2xl max-w-full max-h-72 object-cover block"
                            loading="lazy"
                          />
                          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] text-white bg-black/55 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                            {timeShort(m.created_at)}
                            {showTicks &&
                              (read ? (
                                <CheckCheck size={12} className="text-sky-300" />
                              ) : (
                                <Check size={12} className="text-white/90" />
                              ))}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="whitespace-pre-wrap">{m.body}</span>
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
                        </>
                      )}
                    </div>
                  );
                })()}
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
            {/* GIF badge */}
            <button
              type="button"
              onClick={() => setGifOpen(true)}
              className="flex-shrink-0 border border-white/40 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white/80 hover:text-white hover:border-white transition"
              aria-label="Send a GIF"
            >
              GIF
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
          ) : null}
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
      {/* ---- Message action sheet ---- */}
      <AnimatePresence>
        {actionSheetFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActionSheetFor(null)}
              className="fixed inset-0 z-[400] bg-black/70"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed left-0 right-0 bottom-0 z-[401] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4"
            >
              <div className="flex justify-center pt-2.5">
                <div className="w-10 h-1 rounded-full bg-white/25" />
              </div>
              <div className="p-2">
                {!isMediaUrl(actionSheetFor.body) && actionSheetFor.sender_id === me && (
                  <button
                    onClick={() => openEdit(actionSheetFor)}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-white/5 transition text-left"
                  >
                    <Pencil size={20} className="text-white/80" />
                    <span className="font-medium">Edit</span>
                  </button>
                )}
                <button
                  onClick={() => deleteMessage(actionSheetFor)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-red-500/10 transition text-left text-red-400"
                >
                  <Trash2 size={20} />
                  <span className="font-medium">Delete</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ---- Edit message modal ---- */}
      <AnimatePresence>
        {editFor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !savingEdit && setEditFor(null)}
              className="fixed inset-0 z-[500] bg-black/80"
            />
            <div className="fixed inset-0 z-[501] flex items-center justify-center px-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0f0f12] rounded-2xl p-4 w-full max-w-sm border border-white/10 pointer-events-auto"
              >
              <h3 className="font-bold mb-3">Edit message</h3>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                autoFocus
                className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 outline-none focus:border-red-600 resize-none text-sm"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => !savingEdit && setEditFor(null)}
                  className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit || !editBody.trim()}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold transition"
                >
                  {savingEdit ? "Saving…" : "Save"}
                </button>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
