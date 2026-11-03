"use client";

import { useState } from "react";
import { Eye, Share2, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";
import { motion, AnimatePresence } from "framer-motion";
import { Stream } from "@cloudflare/stream-react";

type FloatingReaction = { id: number; emoji: string; x: number; scale: number; duration: number };

export default function LivePlayer({ whepUrl, liveInputId }: { whepUrl?: string, liveInputId: string }) {
  const [viewers] = useState(Math.floor(Math.random() * 500) + 42);
  const [requestedToJoin, setRequestedToJoin] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  const requestToJoin = async () => {
    if (!liveInputId) return;
    const user = await getCachedUser();
    if (!user) return alert("You must be logged in to request to join.");
    
    setRequestedToJoin(true);
    const supabase = createClient();
    
    const { error } = await supabase.from("stream_join_requests").insert({
      live_input_id: liveInputId,
      viewer_user_id: user.id,
      viewer_name: user.email?.split("@")[0] || "Viewer"
    });
    
    if (error) {
      console.error(error);
      alert("Failed to send request.");
      setRequestedToJoin(false);
    }
  };

  const spawnReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 60 - 30; // Random drift left/right
    const scale = Math.random() * 0.5 + 1; // Random size between 1 and 1.5
    const duration = Math.random() * 0.5 + 1.5; // Random speed between 1.5s and 2s
    
    setReactions((prev) => [...prev, { id, emoji, x, scale, duration }]);
    
    // Remove after animation
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2500);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
      
      {/* THE OFFICIAL CLOUDFLARE STREAM PLAYER */}
      <div className="absolute inset-0 w-full h-full">
        <Stream 
          src={liveInputId} 
          controls 
          autoplay 
        />
      </div>
      
      {/* Top Glass UI */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start z-10">
        <div className="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-md flex items-center gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Eye size={14} /> {viewers}
        </div>
      </div>

      {/* Floating Hearts */}
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div 
            key={r.id} 
            initial={{ opacity: 1, y: 0, scale: 0, x: 0, rotate: 0 }} 
            animate={{ opacity: 0, y: -250, scale: r.scale, x: r.x, rotate: Math.random() * 40 - 20 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: r.duration, ease: "easeOut" }} 
            className="absolute bottom-24 right-12 text-4xl pointer-events-none z-30 drop-shadow-lg"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Bottom Glass UI (Hearts & Share) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end z-20 pointer-events-none">
        <div className="flex gap-2">
          <button onClick={requestToJoin} disabled={requestedToJoin} className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full backdrop-blur-md border transition ${requestedToJoin ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-500" : "bg-white/10 hover:bg-white/20 border-white/10 text-white"}`}>
            <UserPlus size={18} />
            <span className="text-sm font-bold">{requestedToJoin ? "Request Sent" : "Join Stream"}</span>
          </button>
          <button onClick={() => navigator.share?.({ url: window.location.href })} className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition">
            <Share2 size={20} />
          </button>
        </div>
        
        <div className="pointer-events-auto flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-lg">
          {["❤️", "😂", "🔥", "👍", "😮", "🎉"].map((emoji) => (
            <button 
              key={emoji}
              onClick={() => spawnReaction(emoji)} 
              className="w-10 h-10 flex items-center justify-center text-xl hover:scale-125 hover:bg-white/10 rounded-full transition-all active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
