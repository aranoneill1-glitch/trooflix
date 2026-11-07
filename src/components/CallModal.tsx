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
  const audioRef = useRef<HTMLVideoElement>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const remoteAudioContextRef = useRef<AudioContext | null>(null);
  const [localMicLevel, setLocalMicLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [localMicStream, setLocalMicStream] = useState<MediaStream | null>(null);
  const [needsTapToHear, setNeedsTapToHear] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => {
    if (status === "connected") {
      startLocalMicAnalyzer();
      startRemoteAnalyzer();
    }
  }, [status]);

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
    
    console.log("[CallModal] 🎤 About to play. Element:", {
      tag: audioRef.current.tagName,
      muted: audioRef.current.muted,
      volume: audioRef.current.volume,
      srcObject: !!audioRef.current.srcObject,
      tracks: (audioRef.current.srcObject as MediaStream)?.getAudioTracks().map(t => ({
        enabled: t.enabled, muted: t.muted, state: t.readyState
      }))
    });
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

  const startLocalMicAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setLocalMicStream(stream);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      localAudioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      const data = new Uint8Array(analyzer.frequencyBinCount);
      const loop = () => {
        analyzer.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setLocalMicLevel(Math.round((avg / 128) * 100));
        requestAnimationFrame(loop);
      };
      loop();
      console.log("[MicAnalyzer] 🎤 Started");
    } catch (e) {
      console.error("[MicAnalyzer] Failed:", e);
    }
  };

  const startRemoteAnalyzer = () => {
    if (!remoteStream || !audioRef.current) return;
    try {
      const ctx = remoteAudioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      remoteAudioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(remoteStream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      const data = new Uint8Array(analyzer.frequencyBinCount);
      const loop = () => {
        analyzer.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setRemoteAudioLevel(Math.round((avg / 128) * 100));
        requestAnimationFrame(loop);
      };
      loop();
      console.log("[RemoteAnalyzer] 🎤 Started");
    } catch (e) {
      console.error("[RemoteAnalyzer] Failed:", e);
    }
  };

  const playTestTone = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 440;
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 2);
      console.log("[TestTone] 🎵 Playing 440Hz for 2 seconds");
    } catch (e) {
      console.error("[TestTone] Failed:", e);
    }
  };

  const toggleSpeaker = () => {
    if (!audioRef.current) return;
    // Video elements route to speaker by default; toggle to try earpiece
    if (speakerOn) {
      // Force mute then unmute to re-route
      audioRef.current.volume = 0;
      setTimeout(() => {
        if (audioRef.current) audioRef.current.volume = 1;
      }, 50);
      setSpeakerOn(false);
    } else {
      // Force speaker
      try {
        const nav: any = navigator;
        if (nav.audioSession) nav.audioSession.type = "play-and-record";
      } catch {}
      audioRef.current.volume = 1;
      audioRef.current.play().catch(() => {});
      setSpeakerOn(true);
    }
  };

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
        <video ref={audioRef as any} autoPlay playsInline style={{ position: "fixed", top: 0, left: 0, width: "10px", height: "10px", opacity: 0.01, pointerEvents: "none", zIndex: -1 }} />

        {/* Header */}
        <div className="w-full max-w-md flex justify-end">
          <button
            onClick={playTestTone}
            className="p-3 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-full text-yellow-500 transition mr-2"
            aria-label="Test audio"
            title="Play test tone"
          >
            🔊
          </button>
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

        {/* AUDIO METERS */}
        <div className="fixed top-4 left-4 right-4 z-10 flex flex-col gap-2 max-w-xs">
          <div className="bg-black/60 backdrop-blur rounded-lg p-2">
            <p className="text-[10px] text-white/60 mb-1 font-bold">LOCAL MIC</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-75" style={{ width: `${localMicLevel}%` }} />
            </div>
            <p className="text-[10px] text-white/40 mt-1">{localMicLevel}%</p>
          </div>
          <div className="bg-black/60 backdrop-blur rounded-lg p-2">
            <p className="text-[10px] text-white/60 mb-1 font-bold">REMOTE AUDIO</p>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-75" style={{ width: `${remoteAudioLevel}%` }} />
            </div>
            <p className="text-[10px] text-white/40 mt-1">{remoteAudioLevel}%</p>
          </div>
        </div>

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
            onClick={toggleSpeaker}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition ${speakerOn ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
            aria-label={speakerOn ? "Earpiece" : "Speaker"}
            title={speakerOn ? "Switch to earpiece" : "Switch to speaker"}
          >
            <span className="text-2xl">{speakerOn ? "🔊" : "📞"}</span>
          </button>
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
