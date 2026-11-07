"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, ChevronDown } from "lucide-react";
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
  const audioRef = useRef<HTMLVideoElement>(null);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "connected") {
      interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (status === "ended" || status === "failed") setDuration(0);
    };
  }, [status]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Attach remote stream
  useEffect(() => {
    const audio = audioRef.current;
    const stream = remoteStream;
    if (!audio || !stream) return;
    
    const attachStream = () => {
      if (!audioRef.current || !remoteStream) return;
      if (remoteStream.getAudioTracks().length === 0) return;
      
      if (audioRef.current.srcObject !== remoteStream) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.muted = false;
        audioRef.current.volume = 1;
      }
      audioRef.current.play().catch((err) => {
        console.warn("[CallModal] Play blocked:", err.name);
      });
    };
    
    attachStream();
    const poll = setInterval(attachStream, 500);
    const timeout = setTimeout(() => clearInterval(poll), 10000);
    
    // iOS audio session
    try {
      const nav: any = navigator;
      if (nav.audioSession) nav.audioSession.type = "play-and-record";
    } catch {}

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [remoteStream]);

  // Unlock audio on tap (Android)
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
      } catch {}
    };
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, []);

  const toggleSpeaker = () => setSpeakerOn(!speakerOn);

  const statusLabel = 
    status === "calling" ? "Calling..." :
    status === "ringing" ? "Ringing..." :
    status === "connected" ? formatDuration(duration) :
    status === "rejected" ? "Declined" :
    status === "ended" ? "Call Ended" :
    status === "failed" ? "Call Failed" : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed inset-0 z-[10010] bg-[#0b141a] flex flex-col justify-between p-6 pt-12 pb-16"
      >
        {/* Hidden audio element (still needs to be visible 20x20 for Android) */}
        <video ref={audioRef} autoPlay playsInline style={{ position: "fixed", bottom: "10px", right: "10px", width: "4px", height: "4px", opacity: 0.01, pointerEvents: "none" }} />

        {/* HEADER */}
        <div className="w-full flex items-center justify-between z-10">
          <button onClick={onEnd} className="p-2 -ml-2 text-white/80 hover:text-white transition">
            <ChevronDown size={32} />
          </button>
          <p className="text-white/60 text-sm font-semibold tracking-wide uppercase">Trooflix Audio</p>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* CENTER AVATAR & INFO */}
        <div className="flex flex-col items-center flex-1 justify-center -mt-10 relative z-10">
          <motion.div
            animate={{ scale: status === "connected" ? 1 : [1, 1.02, 1] }}
            transition={status === "connected" ? {} : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-36 h-36 rounded-full p-1 bg-white/10 shadow-2xl mb-6 relative"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1c1c1e] flex items-center justify-center">
              {peerAvatar ? (
                <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-white/80">{peerName.charAt(0).toUpperCase() || "?"}</span>
              )}
            </div>
            {/* Pulsing ring */}
            {status !== "connected" && (
              <span className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20" />
            )}
          </motion.div>

          <h2 className="text-3xl font-semibold text-white mb-2 tracking-tight">{peerName || "Caller"}</h2>
          <p className={`text-base font-medium ${status === "connected" ? "text-white/80" : status === "rejected" || status === "failed" ? "text-red-400" : "text-white/50"}`}>
            {statusLabel}
          </p>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="w-full flex items-center justify-center gap-6 z-10 pb-4">
          {/* Speaker */}
          <button
            onClick={toggleSpeaker}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${speakerOn ? "bg-white/20 text-white" : "bg-white/5 text-white/60"}`}
          >
            {speakerOn ? <Volume2 size={28} /> : <VolumeX size={28} />}
          </button>

          {/* Mute */}
          <button
            onClick={onToggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${muted ? "bg-white/20 text-white" : "bg-white/5 text-white/60"}`}
          >
            {muted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>

          {/* End Call */}
          <button
            onClick={onEnd}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-transform hover:scale-105"
          >
            <PhoneOff size={32} className="text-white" fill="white" />
          </button>
        </div>

      </motion.div>
    </AnimatePresence>
  );
}
