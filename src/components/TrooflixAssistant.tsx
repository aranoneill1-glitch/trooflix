"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, Sparkles, X, ChevronRight, Wallet, ShoppingBag, Play, Upload, Search, User, MessageSquare, LayoutDashboard } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Action = {
  type?: string;
  path?: string;
  label?: string;
  query?: string;
  tab?: "bought" | "sold";
  mediaType?: "video" | "short" | "podcast" | "documentary" | "tweet";
};

type ChatMsg = { role: "user" | "assistant"; text: string; actions?: Action[] };

const QUICK_ACTIONS = [
  { label: "Add credits", prompt: "Add credits to my wallet", icon: Wallet },
  { label: "My orders", prompt: "Show me my orders", icon: ShoppingBag },
  { label: "Reels", prompt: "Take me to reels", icon: Play },
  { label: "Upload video", prompt: "Upload a video", icon: Upload },
  { label: "Search", prompt: "Open search", icon: Search },
  { label: "Profile", prompt: "Take me to my profile", icon: User },
];

function normalizeAction(a: Action): Action | null {
  if (!a || typeof a !== "object") return null;
  if (a.type === "navigate" && typeof a.path === "string" && a.path.startsWith("/")) return a;
  if (a.type === "open_topup") return { type: "navigate", path: "/wallet?topup=true", label: "Add credits" };
  if (a.type === "open_orders") return { type: "navigate", path: `/orders${a.tab === "sold" ? "?tab=sold" : ""}`, label: a.tab === "sold" ? "Sold orders" : "My orders" };
  if (a.type === "open_profile") return { type: "navigate", path: "/creator-dashboard?studioTab=profile", label: "My profile" };
  if (a.type === "open_search") return { type: "navigate", path: a.query ? `/search?q=${encodeURIComponent(a.query)}` : "/search", label: a.query ? `Search: ${a.query}` : "Search" };
  if (a.type === "open_upload") {
    const mt = a.mediaType;
    const qs = !mt || mt === "video" ? "" : `?type=${encodeURIComponent(mt)}`;
    return { type: "navigate", path: `/creator-dashboard/upload${qs}`, label: `Upload ${mt || "video"}` };
  }
  if (typeof a.path === "string" && a.path.startsWith("/")) return { ...a, type: "navigate" };
  return null;
}

export default function TrooflixAssistant() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", text: "Hey! I’m your Trooflix assistant. Tell me what you’re in the mood to do — add credits, jump into Reels, check orders, upload something, or find a creator — and I’ll take you there." }
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id || null)).catch(() => {});
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    document.addEventListener("open-trooflix-assistant", onOpen);
    document.addEventListener("close-trooflix-assistant", onClose);
    return () => {
      document.removeEventListener("open-trooflix-assistant", onOpen);
      document.removeEventListener("close-trooflix-assistant", onClose);
    };
  }, []);

  const canShow = useMemo(() => {
    // Hide on immersive/fullscreen-like player pages if needed later; keep global for now.
    return true;
  }, [pathname]);

  const runAction = async (action: Action) => {
    const a = normalizeAction(action);
    if (!a) return;
    if (a.type === "navigate" && a.path) {
      // If not logged in, some destinations will require auth; let app handle redirect.
      if (!userId && ["/wallet", "/orders", "/messages", "/creator-dashboard"].some(p => a.path!.startsWith(p))) {
        router.push(`/login?next=${encodeURIComponent(a.path)}`);
      } else {
        router.push(a.path);
      }
      setOpen(false);
    }
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, path: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        typeof data?.reply === "string" && data.reply
          ? data.reply
          : (typeof data?.error === "string" && data.error ? data.error : "I couldn't process that right now.");
      const actions = Array.isArray(data?.actions) ? data.actions : [];
      setMessages((prev) => [...prev, { role: "assistant", text: reply, actions }]);

      // Auto-run a single clear navigation action for common commands
      const normalized = actions.map(normalizeAction).filter(Boolean) as Action[];
      if (normalized.length === 1 && normalized[0].type === "navigate" && normalized[0].path) {
        // small delay so user sees confirmation
        setTimeout(() => { runAction(normalized[0]); }, 250);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Something went wrong. Try again." }]);
    } finally {
      setSending(false);
    }
  };

  if (!canShow) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/55" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed z-[401] right-3 left-3 bottom-[calc(env(safe-area-inset-bottom)+8px)] lg:left-auto lg:right-6 lg:bottom-6 lg:w-[420px] h-[70vh] max-h-[720px] bg-[#0b0b0f] border border-white/10 rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#E53945]/20 border border-[#E53945]/30 flex items-center justify-center text-[#ff8a93]"><Bot size={16} /></div>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">Trooflix Assistant</p>
                    <p className="text-[11px] text-white/45 mt-0.5">Ask me to do things in the app</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80"><X size={16} /></button>
              </div>

              <div className="px-3 pt-3 pb-2 border-b border-white/5">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {QUICK_ACTIONS.map((q) => {
                    const Icon = q.icon;
                    return (
                      <button key={q.label} onClick={() => send(q.prompt)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-white/85">
                        <Icon size={13} className="text-[#ff8a93]" /> {q.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] ${m.role === "user" ? "bg-[#E53945] text-white" : "bg-white/[0.06] border border-white/10 text-white/90"} rounded-2xl px-3.5 py-2.5`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                      {m.role === "assistant" && Array.isArray(m.actions) && m.actions.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          {m.actions.map(normalizeAction).filter(Boolean).slice(0, 4).map((a, idx) => (
                            <button key={idx} onClick={() => runAction(a as Action)} className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 text-xs text-white/90">
                              <span className="truncate">{(a as Action).label || (a as Action).path || "Open"}</span>
                              <ChevronRight size={14} className="text-white/50 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start"><div className="bg-white/[0.06] border border-white/10 text-white/70 rounded-2xl px-3.5 py-2.5 text-sm">Thinking...</div></div>
                )}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-3 border-t border-white/10 bg-[#0b0b0f]">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask to do something... (e.g. add credits, show my orders)"
                    className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#E53945]/50"
                  />
                  <button type="submit" disabled={sending || !input.trim()} className="w-10 h-10 rounded-xl bg-[#E53945] disabled:opacity-40 text-white flex items-center justify-center">
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
