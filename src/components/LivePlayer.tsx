"use client";

import { useState, useEffect } from "react";
import { Eye, Share2, Loader2, Heart, MessageCircle, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Stream } from "@cloudflare/stream-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import GuestCoStream from "./GuestCoStream";
import LiveChat from "./LiveChat";
import Link from "next/link";

type FloatingReaction = { id: number; emoji: string; x: number; scale: number; duration: number };
type FloatingComment = { id: string; display_name: string; avatar_url: string | null; message: string; type?: string; metadata?: any; createdAt: number };

type Props = {
  liveInputId: string;
  creatorId?: string | null;
  creatorName?: string;
  creatorAvatar?: string | null;
  username?: string;
};

export default function LivePlayer({ liveInputId, creatorId, creatorName, creatorAvatar, username }: Props) {
  const [viewers] = useState(Math.floor(Math.random() * 500) + 42);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [floatingComments, setFloatingComments] = useState<FloatingComment[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsConnecting(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!liveInputId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`live_floating_${liveInputId}_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_input_id=eq.${liveInputId}` },
        (payload) => {
          const msg = payload.new as any;
          const item: FloatingComment = {
            id: String(msg.id || Date.now()),
            display_name: msg.display_name || "User",
            avatar_url: msg.avatar_url || null,
            message: msg.message || "",
            type: msg.type,
            metadata: msg.metadata,
            createdAt: Date.now(),
          };
          setFloatingComments((prev) => [...prev.slice(-12), item]);
          setTimeout(() => {
            setFloatingComments((prev) => prev.filter((m) => m.id !== item.id));
          }, 4200);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveInputId]);

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 50 - 25;
    const scale = Math.random() * 0.45 + 0.95;
    const duration = Math.random() * 0.5 + 1.8;
    setReactions((prev) => [...prev, { id, emoji, x, scale, duration }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
  };

  const handleLike = () => {
    setLiked(true);
    spawnReaction("❤️");
    setTimeout(() => setLiked(false), 350);
  };

  const openTip = () => {
    window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: creatorId || null, videoId: null } }));
  };

  const name = creatorName || username || "Creator";
  const avatar = creatorAvatar || null;

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden text-white">
      <div className="absolute inset-0 bg-black [&_iframe]:!w-full [&_iframe]:!h-full [&_video]:!w-full [&_video]:!h-full [&_.stream-player]:!h-full [&_.stream-player]:!w-full">
        <Stream src={liveInputId} controls autoplay muted />
      </div>

      {isConnecting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 pointer-events-none">
          <Loader2 className="animate-spin text-[#E53945] mb-3" size={40} />
          <p className="text-white font-bold text-lg">Connecting...</p>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 z-30 pt-[calc(env(safe-area-inset-top)+12px)] px-4 pb-16 bg-gradient-to-b from-black/70 via-black/20 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {username ? (
              <Link href={`/profile/${username}`} className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                <ArrowLeft size={18} />
              </Link>
            ) : null}
            <div className="flex items-center gap-2.5 min-w-0 bg-black/25 border border-white/10 rounded-full pl-1 pr-3 py-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#E53945] shrink-0 flex items-center justify-center text-xs font-bold">
                {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold truncate leading-tight">{name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </span>
                  <span className="text-[11px] text-white/65">{viewers.toLocaleString()} watching</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => navigator.share?.({ url: window.location.href })} className="w-10 h-10 rounded-full bg-black/35 border border-white/10 flex items-center justify-center shrink-0" aria-label="Share">
            <Share2 size={18} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+96px)] left-0 w-[78%] max-w-[360px] h-[40%] px-4 flex flex-col justify-end gap-2 overflow-hidden pointer-events-none z-20">
        <AnimatePresence initial={false}>
          {floatingComments.slice(-5).map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.98 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="max-w-full"
            >
              <div className="inline-flex max-w-full items-start gap-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/10 px-3 py-2 shadow-lg">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-white/15" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#E53945] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white">
                    {c.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white/80 leading-tight truncate">{c.display_name}</p>
                  <p className="text-[13px] text-white leading-snug break-words [overflow-wrap:anywhere]">
                    {c.type === "tip" && c.metadata?.amount ? `Sent a $${c.metadata.amount} tip!` : c.message}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+110px)] z-30 flex flex-col items-center gap-3">
        <button onClick={handleLike} className="flex flex-col items-center gap-1" aria-label="Like">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-xl transition ${liked ? "bg-[#E53945]/30 border-[#E53945]/50 text-[#E53945]" : "bg-black/30 border-white/10 text-white"}`}>
            <Heart size={22} fill={liked ? "currentColor" : "none"} />
          </div>
          <span className="text-[11px] font-semibold text-white/85">Like</span>
        </button>

        <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-1" aria-label="Comments">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/30 border border-white/10 text-white backdrop-blur-xl">
            <MessageCircle size={22} />
          </div>
          <span className="text-[11px] font-semibold text-white/85">Chat</span>
        </button>

        <button onClick={openTip} className="flex flex-col items-center gap-1" aria-label="Tip">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/30 border border-white/10 text-white backdrop-blur-xl">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white">
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.9" />
              <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
              <path d="M10.1 5.4L9.2 3.3M13.9 5.4L14.8 3.3M10.1 18.6L9.2 20.7M13.9 18.6L14.8 20.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
              <text x="12" y="15.2" textAnchor="middle" fontSize="7.6" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">TC</text>
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-white/85">Tip</span>
        </button>
      </div>

      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, scale: 0.5, x: 0, rotate: 0 }}
            animate={{ opacity: 0, y: -280, scale: r.scale, x: r.x, rotate: Math.random() * 40 - 20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: r.duration, ease: "easeOut" }}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+140px)] right-8 text-4xl pointer-events-none z-30 drop-shadow-lg"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40">
            <button className="absolute inset-0 bg-black/20" onClick={() => setShowChat(false)} aria-label="Close chat overlay" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="absolute inset-x-0 bottom-0 h-[62dvh] bg-[#111114]/96 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-bold">Live Chat</h3>
                <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X size={16} /></button>
              </div>
              <LiveChat liveInputId={liveInputId} className="flex-1 min-h-0" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
