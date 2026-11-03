"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, AlertCircle, RefreshCw, Heart, Eye, Share2, VolumeX, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FloatingHeart = { id: number; x: number };

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true); // Default to muted for iOS Autoplay
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [viewers] = useState(Math.floor(Math.random() * 500) + 42);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  const connectStream = async () => {
    if (!whepUrl || !videoRef.current) return;
    setConnecting(true);
    setError(null);

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    try {
      // 1. Fetch TURN credentials
      const turnRes = await fetch("/api/live/turn-credentials");
      const turnData = await turnRes.json();
      const iceServers = turnData.iceServers || [{ urls: "stun:stun.cloudflare.com:3478" }];

      // 2. Create Peer Connection
      const pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
      pcRef.current = pc;

      // 3. Setup transceivers and force VP8
      const videoTransceiver = pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      if (RTCRtpReceiver.getCapabilities) {
        const caps = RTCRtpReceiver.getCapabilities("video");
        if (caps && caps.codecs) {
          const vp8 = caps.codecs.filter(c => c.mimeType === "video/VP8");
          if (vp8.length > 0) videoTransceiver.setCodecPreferences(vp8);
        }
      }

      // 4. Create Offer & Wait for ICE Gathering
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") { resolve(); return; }
        const checkState = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", checkState);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", checkState);
        setTimeout(resolve, 3000); // 3s timeout fallback
      });

      // 5. Send to Cloudflare
      const res = await fetch(whepUrl, { 
        method: "POST", 
        headers: { "Content-Type": "application/sdp" }, 
        body: pc.localDescription?.sdp 
      });

      if (!res.ok) throw new Error(`Cloudflare Error: ${res.status}`);

      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });

      // 6. Play Video
      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().then(() => {
            setConnecting(false);
            setStarted(true);
          }).catch(() => {
             // Autoplay failed, user must tap to play manually
             setConnecting(false);
             setStarted(true); 
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setError("Network connection dropped. Try reloading.");
        }
      };
    } catch (err: any) {
      setConnecting(false);
      setError(err.message || "Failed to connect to stream");
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  useEffect(() => { return () => { if (pcRef.current) pcRef.current.close(); }; }, []);

  const spawnHeart = () => {
    const id = Date.now();
    setHearts((prev) => [...prev, { id, x: Math.random() * 40 - 20 }]);
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 2000);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
      <video ref={videoRef} autoPlay playsInline muted={isMuted} controls={started} className="w-full h-full object-cover" />
      
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none flex justify-between items-start z-10">
        <div className="bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-md flex items-center gap-2 shadow-lg">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Eye size={14} /> {viewers}
        </div>
      </div>

      <AnimatePresence>
        {hearts.map((h) => (
          <motion.div key={h.id} initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }} animate={{ opacity: 0, y: -150, scale: 1.5, x: h.x }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute bottom-20 right-10 text-[#E53945] pointer-events-none z-30">
            <Heart size={32} fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>

      {started && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center z-20 pointer-events-none">
          <button onClick={toggleMute} className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <div className="flex gap-3">
            <button onClick={() => navigator.share?.({ url: window.location.href })} className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition">
              <Share2 size={20} />
            </button>
            <button onClick={spawnHeart} className="pointer-events-auto p-4 rounded-full bg-[#E53945] hover:bg-[#d12e39] shadow-[0_0_20px_rgba(229,57,69,0.4)] text-white transition active:scale-90">
              <Heart size={24} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {!started && (
        <div onClick={connectStream} className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 cursor-pointer backdrop-blur-md transition-all p-6 text-center">
          {connecting ? (
            <><Loader2 size={48} className="text-[#E53945] animate-spin mb-4" /><p className="text-white font-bold text-lg">Connecting...</p></>
          ) : error ? (
            <><AlertCircle size={48} className="text-red-500 mb-4" /><p className="text-white font-bold text-lg mb-2">Connection Failed</p><p className="text-red-400 text-sm mb-6 max-w-md bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p><button onClick={(e) => { e.stopPropagation(); connectStream(); }} className="px-6 py-2 bg-[#E53945] hover:bg-[#d12e39] rounded-full text-white font-bold flex items-center gap-2"><RefreshCw size={16} /> Try Again</button></>
          ) : (
            <><div className="w-16 h-16 bg-[#E53945] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(229,57,69,0.5)]"><Play size={32} className="text-white ml-1" fill="currentColor" /></div><p className="text-white font-bold text-lg">Tap to watch live</p></>
          )}
        </div>
      )}
    </div>
  );
}
