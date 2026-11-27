"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, Share2, Loader2, Heart, MessageCircle, X, ArrowLeft, Video, Radio } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [joinStatus, setJoinStatus] = useState<"idle" | "pending" | "approved" | "denied">("idle");
  const [joining, setJoining] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [guestInfo, setGuestInfo] = useState<{ userId: string; name: string; avatar: string | null } | null>(null);
  const [isFollowingGuest, setIsFollowingGuest] = useState(false);
  const lastLikeSentRef = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const guestLocalVideoRef = useRef<HTMLVideoElement>(null);
  const searchParams = useSearchParams();
  const invitedToJoin = searchParams.get("invite") === "1";

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [floatingComments, showChat]);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) return;
      setUser(u);
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("display_name, avatar_url, username").eq("user_id", u.id).single();
      if (data) setProfile(data);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsConnecting(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/profile?user_id=${encodeURIComponent(creatorId)}`, { cache: "no-store" });
        const data = await res.json();
        const p = data?.profile;
        if (!cancelled && p) {
          if (p.is_live === false || p.live_input_id === null || p.live_input_id === "") {
            setStreamEnded(true);
          }
        }
      } catch {}
    };
    check();
    const t = setInterval(check, 8000);
    return () => { cancelled = true; clearInterval(t); };
  }, [creatorId]);

  useEffect(() => {
    if (!liveInputId) return;
    const supabase = createClient();
    let cancelled = false;
    const checkGuest = async () => {
      try {
        const { data } = await supabase
          .from("stream_join_requests")
          .select("viewer_user_id, viewer_name, viewer_avatar, status")
          .eq("live_input_id", liveInputId)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1);
        const row = data?.[0];
        if (cancelled) return;
        if (row?.viewer_user_id) {
          setGuestInfo({ userId: row.viewer_user_id, name: row.viewer_name || "Guest", avatar: row.viewer_avatar || null });
        } else {
          setGuestInfo(null);
        }
      } catch {}
    };
    checkGuest();
    const t = setInterval(checkGuest, 8000);
    const channel = supabase
      .channel(`guest_overlay_${liveInputId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stream_join_requests", filter: `live_input_id=eq.${liveInputId}` }, () => { checkGuest(); })
      .subscribe();
    return () => { cancelled = true; clearInterval(t); supabase.removeChannel(channel); };
  }, [liveInputId]);

  useEffect(() => {
    if (!guestInfo?.userId || !user?.id) { setIsFollowingGuest(false); return; }
    fetch(`/api/user-follows?user_id=${encodeURIComponent(user.id)}&target_id=${encodeURIComponent(guestInfo.userId)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setIsFollowingGuest(!!d?.following))
      .catch(() => setIsFollowingGuest(false));
  }, [guestInfo?.userId, user?.id]);

  const toggleFollowGuest = async () => {
    if (!user?.id || !guestInfo?.userId) return;
    const next = !isFollowingGuest;
    setIsFollowingGuest(next);
    try {
      await fetch("/api/user-follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: user.id, followingId: guestInfo.userId }),
      });
    } catch {
      setIsFollowingGuest(!next);
    }
  };

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
          setFloatingComments((prev) => [...prev.slice(-99), item]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveInputId]);

  useEffect(() => {
    if (!liveInputId || !user?.id) return;
    const supabase = createClient();
    let channel: any;

    const checkExisting = async () => {
      const { data } = await supabase
        .from("stream_join_requests")
        .select("id,status")
        .eq("live_input_id", liveInputId)
        .eq("viewer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const row = data?.[0];
      if (row?.status === "pending" || row?.status === "approved" || row?.status === "denied") {
        setJoinStatus(row.status);
      }
    };
    checkExisting();
    const poll = setInterval(checkExisting, 3000);

    channel = supabase
      .channel(`my_join_req_${liveInputId}_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stream_join_requests", filter: `live_input_id=eq.${liveInputId}` },
        (payload) => {
          const row: any = payload.new;
          if (!row || row.viewer_user_id !== user.id) return;
          if (row.status === "pending" || row.status === "approved" || row.status === "denied") {
            setJoinStatus(row.status);
          }
        }
      )
      .subscribe();

    return () => { clearInterval(poll); if (channel) supabase.removeChannel(channel); };
  }, [liveInputId, user?.id]);

  const requestJoin = async () => {
    if (!user?.id || !liveInputId || joining || joinStatus === "pending" || joinStatus === "approved") return;
    setJoining(true);
    try {
      const supabase = createClient();
      const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "User";
      const avatarUrl = profile?.avatar_url || null;
      const { data: existing } = await supabase
        .from("stream_join_requests")
        .select("id")
        .eq("live_input_id", liveInputId)
        .eq("viewer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from("stream_join_requests").update({ status: "pending", viewer_name: displayName, viewer_avatar: avatarUrl }).eq("id", existing.id);
      } else {
        await supabase.from("stream_join_requests").insert({
          live_input_id: liveInputId,
          viewer_user_id: user.id,
          viewer_name: displayName,
          viewer_avatar: avatarUrl,
          status: "pending",
        });
      }
      setJoinStatus("pending");
    } catch (e) {
      console.error("Join request failed", e);
      alert("Could not request to join. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 50 - 25;
    const scale = Math.random() * 0.45 + 0.95;
    const duration = Math.random() * 0.5 + 1.8;
    setReactions((prev) => [...prev, { id, emoji, x, scale, duration }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
  };

  const handleLike = async () => {
    setLiked(true);
    spawnReaction("❤️");
    setTimeout(() => setLiked(false), 350);

    if (!user) return;
    const now = Date.now();
    if (now - lastLikeSentRef.current < 8000) return;
    lastLikeSentRef.current = now;
    const supabase = createClient();
    const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "User";
    await supabase.from("live_chat_messages").insert({
      live_input_id: liveInputId,
      user_id: user.id,
      display_name: displayName,
      avatar_url: profile?.avatar_url || null,
      message: "liked the stream",
      type: "like",
    });
  };

  const openTip = () => {
    window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: creatorId || null, videoId: null } }));
  };

  const name = creatorName || username || "Creator";
  const avatar = creatorAvatar || null;

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden text-white">
      {joinStatus === "approved" ? (
        <div className="absolute inset-0 flex flex-col bg-black">
          <div className="relative flex-1 min-h-0 bg-black [&_iframe]:!w-full [&_iframe]:!h-full [&_video]:!w-full [&_video]:!h-full [&_.stream-player]:!h-full [&_.stream-player]:!w-full">
            <Stream src={liveInputId} controls autoplay muted />
            <div className="absolute top-3 left-3 z-10 bg-black/45 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[11px] font-bold text-white">Host</div>
          </div>
          <div className="relative flex-1 min-h-0 bg-[#111] border-t border-white/10">
            <video ref={guestLocalVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute top-3 left-3 z-10 bg-black/45 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[11px] font-bold text-white">You</div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-black [&_iframe]:!w-full [&_iframe]:!h-full [&_video]:!w-full [&_video]:!h-full [&_.stream-player]:!h-full [&_.stream-player]:!w-full">
          <Stream src={liveInputId} controls autoplay muted />
        </div>
      )}

      {joinStatus === "approved" && <GuestCoStream roomId={liveInputId} localVideoRef={guestLocalVideoRef} />}

      {isConnecting && !streamEnded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 pointer-events-none">
          <Loader2 className="animate-spin text-[#E53945] mb-3" size={40} />
          <p className="text-white font-bold text-lg">Connecting...</p>
        </div>
      )}

      {streamEnded && (
        <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center mb-4">
            <Radio size={28} className="text-white/70" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">This live stream has now ended</h2>
          <p className="text-white/55 mb-6 max-w-sm">Thanks for watching. You can head back to explore more live streams and creators.</p>
          <Link href="/" className="px-5 py-3 rounded-full bg-[#E53945] text-white font-bold hover:bg-[#d12e39] transition">Back to Home</Link>
        </div>
      )}

      {guestInfo && !streamEnded && (
        <div className="absolute left-4 top-[52%] z-20 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-black/45 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-2 py-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
              {guestInfo.avatar ? (
                <img src={guestInfo.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{(guestInfo.name || "G").charAt(0).toUpperCase()}</div>
              )}
            </div>
            <span className="text-xs font-bold text-white max-w-[110px] truncate">{guestInfo.name || "Guest"}</span>
            {guestInfo.userId && guestInfo.userId !== user?.id && (
              <button
                onClick={toggleFollowGuest}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${isFollowingGuest ? "bg-white/15 text-white border border-white/15" : "bg-[#E53945] text-white"}`}
              >
                {isFollowingGuest ? "Following" : "Follow"}
              </button>
            )}
          </div>
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

      <div ref={chatScrollRef} className="absolute bottom-[calc(env(safe-area-inset-bottom)+96px)] left-0 w-[78%] max-w-[360px] h-[40%] px-4 overflow-y-auto pointer-events-auto z-20 space-y-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {floatingComments.map((c) => (
          <div key={c.id} className="max-w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                  {c.type === "tip" && c.metadata?.amount ? `Sent a $${c.metadata.amount} tip!` : c.type === "like" ? "❤️ liked the stream" : c.message}
                </p>
              </div>
            </div>
          </div>
        ))}
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

        {(invitedToJoin || joinStatus !== "idle") && creatorId !== user?.id && (
          <button
            onClick={requestJoin}
            disabled={joining || joinStatus === "pending" || joinStatus === "approved"}
            className="flex flex-col items-center gap-1"
            aria-label="Join live"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-xl transition ${joinStatus === "approved" ? "bg-green-500/30 border-green-500/50 text-green-300" : joinStatus === "pending" ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300" : "bg-[#E53945]/25 border-[#E53945]/40 text-white"}`}>
              <Video size={22} />
            </div>
            <span className="text-[11px] font-semibold text-white/85">
              {joinStatus === "approved" ? "Live" : joinStatus === "pending" ? "Waiting" : joinStatus === "denied" ? "Retry" : "Join"}
            </span>
          </button>
        )}

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
