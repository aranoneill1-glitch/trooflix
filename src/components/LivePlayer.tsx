"use client";

import { useState, useEffect } from "react";
import { Eye, Share2, UserPlus, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Stream } from "@cloudflare/stream-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import GuestCoStream from "./GuestCoStream";

type FloatingReaction = { id: number; emoji: string; x: number; scale: number; duration: number };

export default function LivePlayer({ whepUrl, liveInputId }: { whepUrl?: string, liveInputId: string }) {
  const [viewers] = useState(Math.floor(Math.random() * 500) + 42);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  
  const [requestedToJoin, setRequestedToJoin] = useState(false);
  const [isApprovedGuest, setIsApprovedGuest] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!liveInputId) return;
    const supabase = createClient();
    let channel: any;

    getCachedUser().then(user => {
      if (!user) return;
      channel = supabase.channel("approval_watch")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "stream_join_requests", filter: `viewer_user_id=eq.${user.id}` }, (payload) => {
          if (payload.new.live_input_id === liveInputId) {
            if (payload.new.status === "approved" && !isApprovedGuest) {
              setIsApprovedGuest(true);
              setIsCameraOn(true);
              setRequestId(payload.new.id);
            }
          }
        }).subscribe();
    });

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [liveInputId, isApprovedGuest]);

  const requestToJoin = async () => {
    if (!liveInputId) return;
    const user = await getCachedUser();
    if (!user) return alert("You must be logged in to request to join.");
    
    setRequestedToJoin(true);
    const supabase = createClient();
    
    const { data, error } = await supabase.from("stream_join_requests").insert({
      live_input_id: liveInputId,
      viewer_user_id: user.id,
      viewer_name: user.email?.split("@")[0] || "Viewer",
      status: "pending"
    }).select().single();
    
    if (error) {
      console.error(error);
      alert("Failed to send request.");
      setRequestedToJoin(false);
    } else if (data) {
      setRequestId(data.id);
    }
  };

  const leaveCamera = async () => {
    setIsCameraOn(false);
    setIsApprovedGuest(false);
    setRequestedToJoin(false); // Allow them to request again
    if (requestId) {
      const supabase = createClient();
      await supabase.from("stream_join_requests").update({ status: "left" }).eq("id", requestId);
    }
  };

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 60 - 30;
    const scale = Math.random() * 0.5 + 1;
    const duration = Math.random() * 0.5 + 1.5;
    setReactions((prev) => [...prev, { id, emoji, x, scale, duration }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2500);
  };

  return (
    <div className="flex flex-col w-full gap-3">
      
      {/* Video Player Area */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
        {isCameraOn && isApprovedGuest && <GuestCoStream roomId={liveInputId} />}
        
        <Stream src={liveInputId} controls autoplay />
        
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start z-10">
          <div className="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-md flex items-center gap-2 shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Eye size={14} /> {viewers}
          </div>
        </div>

        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div 
              key={r.id} 
              initial={{ opacity: 1, y: 0, scale: 0, x: 0, rotate: 0 }} 
              animate={{ opacity: 0, y: -250, scale: r.scale, x: r.x, rotate: Math.random() * 40 - 20 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: r.duration, ease: "easeOut" }} 
              className="absolute bottom-4 right-4 text-4xl pointer-events-none z-30 drop-shadow-lg"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Controls Bar (Below Video) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1c1c1e] border border-white/10 p-3 rounded-2xl">
        
        {/* Left Side: Join / Leave / Share */}
        <div className="flex items-center gap-2">
          {isCameraOn && isApprovedGuest ? (
            <button onClick={leaveCamera} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-500 font-bold border border-red-500/20 hover:bg-red-500/30 transition">
              <LogOut size={16} /> Leave Camera
            </button>
          ) : (
            <button onClick={requestToJoin} disabled={requestedToJoin || isApprovedGuest} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition ${requestedToJoin || isApprovedGuest ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : "bg-white/5 hover:bg-white/10 border-white/10 text-white font-bold"}`}>
              <UserPlus size={16} />
              <span className="text-sm">{isApprovedGuest ? "Connected" : requestedToJoin ? "Request Sent" : "Join Stream"}</span>
            </button>
          )}
          
          <button onClick={() => navigator.share?.({ url: window.location.href })} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition">
            <Share2 size={20} />
          </button>
        </div>

        {/* Right Side: Reactions */}
        <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/10">
          {["❤️", "😂", "🔥", "👍", "😮", "🎉"].map((emoji) => (
            <button key={emoji} onClick={() => spawnReaction(emoji)} className="w-9 h-9 flex items-center justify-center text-lg hover:scale-125 hover:bg-white/10 rounded-lg transition-all active:scale-90">
              {emoji}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
