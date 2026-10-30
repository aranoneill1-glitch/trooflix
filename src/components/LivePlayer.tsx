"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  const connectStream = async () => {
    if (!whepUrl) return;
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(whepUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!res.ok) throw new Error("Failed to connect to stream");
      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(e => console.log("Autoplay blocked:", e));
        }
      };
      
      setPeerConnection(pc);
      setStarted(true);
    } catch (err) {
      console.error("Live playback error:", err);
      alert("Failed to load live stream. It may have ended.");
    }
  };

  useEffect(() => {
    return () => {
      if (peerConnection) peerConnection.close();
    };
  }, [peerConnection]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        controls={started} 
        className="w-full h-full object-contain" 
      />
      
      <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse z-10">
        <div className="w-2 h-2 bg-white rounded-full" /> LIVE
      </div>

      {/* OVERLAY: Forces user interaction so iPhone Safari allows playback */}
      {!started && (
        <div 
          onClick={connectStream}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 cursor-pointer backdrop-blur-sm"
        >
          <div className="w-16 h-16 bg-[#E53945] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(229,57,69,0.5)]">
            <Play size={32} className="text-white ml-1" fill="currentColor" />
          </div>
          <p className="text-white font-bold text-lg">Tap to watch live</p>
        </div>
      )}
    </div>
  );
}
