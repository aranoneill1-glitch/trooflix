"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  status: "calling" | "ringing" | "connected" | "ended" | "rejected" | "failed";
  peerName: string;
  peerAvatar: string | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  onToggleMute: () => void;
  onEnd: () => void;
};

export default function CallModal({ status, peerName, peerAvatar, remoteStream, muted, onToggleMute, onEnd }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [needsTapToHear, setNeedsTapToHear] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    if (!remoteStream) return;
    
    console.log("[CallModal] Setting remote stream. Tracks:", remoteStream.getTracks().map(t => t.kind + ":" + t.readyState));
    
    // Try to set up iOS audio session to route to speaker (Safari 16.4+)
    try {
      const nav: any = navigator;
      if (nav.audioSession && typeof nav.audioSession.type !== "undefined") {
        nav.audioSession.type = "play-and-record";
        console.log("[CallModal] 🍎 iOS audioSession set to play-and-record");
      }
    } catch (e) {
      console.log("[CallModal] audioSession not available:", e);
    }
    
    audioRef.current.srcObject = remoteStream;
    audioRef.current.muted = false;
    audioRef.current.volume = 1;
    
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("[CallModal] ✅ Audio playing");
          setNeedsTapToHear(false);
        })
        .catch((err) => {
          console.error("[CallModal] ❌ Audio play failed:", err);
          setNeedsTapToHear(true);
        });
    }
    
    remoteStream.getAudioTracks().forEach((t) => {
      console.log("[CallModal] Track:", t.label, "| enabled:", t.enabled, "| muted:", t.muted, "| state:", t.readyState);
    });
  }, [remoteStream]);

  const handleTapToHear = async () => {
    if (!audioRef.current || !remoteStream) return;
    try {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.muted = false;
      audioRef.current.volume = 1;
      await audioRef.current.play();
      setNeedsTapToHear(false);
      console.log("[CallModal] ✅ Audio playing after tap");
    } catch (e) {
      console.error("[CallModal] Still failing:", e);
    }
  };

  const statusLabel = 
    status === "calling" ? "Calling..." :
    status === "ringing" ? "Ringing..." :
    status === "connected" ? "Connected" :
    status === "rejected" ? "Call declined" :
    status === "ended" ? "Call ended" :
    status === "failed" ? "Call failed" :
    "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10010] bg-gradient-to-b from-[#1c1c1e] via-[#0a0303] to-black flex flex-col items-center justify-between p-6 pt-16 pb-10"
      >
        <audio ref={audioRef} autoPlay playsInline style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", opacity: 0.01 }} />

        {/* Header */}
        <div className="w-full max-w-md flex justify-end">
          <button
            onClick={onEnd}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/60 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* iOS: Tap to hear overlay */}
        {needsTapToHear && (
          <button
            onClick={handleTapToHear}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-[#E53945] text-white font-bold py-3 px-6 rounded-full shadow-2xl animate-pulse"
          >
            🔊 Tap to enable audio
          </button>
        )}

        {/* Center: peer info */}
        <div className="flex flex-col items-center flex-1 justify-center -mt-20">
          <motion.div
            animate={{ scale: status === "connected" ? 1 : [1, 1.05, 1] }}
            transition={status === "connected" ? {} : { duration: 1.5, repeat: Infinity }}
            className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-[#E53945] to-[#D4AF37] mb-6 shadow-2xl"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1c1c1e] flex items-center justify-center">
              {peerAvatar ? (
                <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-white">{peerName.charAt(0).toUpperCase() || "?"}</span>
              )}
            </div>
          </motion.div>

          <h2 className="text-2xl font-black text-white mb-2">{peerName || "Caller"}</h2>
          <p className={`text-sm font-semibold ${status === "connected" ? "text-green-400" : status === "rejected" || status === "failed" ? "text-red-400" : "text-white/50"}`}>
            {statusLabel}
          </p>
        </div>

        {/* Bottom: controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={onToggleMute}
            disabled={status !== "connected"}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition disabled:opacity-30 ${muted ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff size={26} className="text-white" /> : <Mic size={26} className="text-white" />}
          </button>

          <button
            onClick={onEnd}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/40 transition"
            aria-label="End call"
          >
            <PhoneOff size={30} className="text-white" />
          </button>

          <div className="w-16 h-16" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
