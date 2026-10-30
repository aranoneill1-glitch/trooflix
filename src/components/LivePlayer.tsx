"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  const connectStream = async () => {
    if (!whepUrl) return;
    setConnecting(true);
    setError(false);

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

      if (!res.ok) {
        throw new Error("Failed to connect to stream");
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // When the track arrives, attach it and force play
      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().then(() => {
            setConnecting(false);
            setStarted(true);
          }).catch(e => {
            console.error("Autoplay blocked:", e);
            // If autoplay is blocked, we still need to mark it started so they can use native controls
            setConnecting(false);
            setStarted(true);
          });
        }
      };

      setPeerConnection(pc);
    } catch (err) {
      console.error("Live playback error:", err);
      setConnecting(false);
      setError(true);
    }
  };

  useEffect(() => {
    return () => {
      if (peerConnection) peerConnection.close();
    };
  }, [peerConnection]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
      {/* Added key to force React to treat it as a new video element if it re-renders */}
      <video 
        key={started ? "playing" : "waiting"}
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
          {connecting ? (
            <>
              <Loader2 size={48} className="text-[#E53945] animate-spin mb-4" />
              <p className="text-white font-bold text-lg">Connecting...</p>
            </>
          ) : error ? (
            <>
              <p className="text-white font-bold text-lg mb-2">Stream not found</p>
              <p className="text-white/60 text-sm mb-4">The stream may have ended or hasn't fully started yet.</p>
              <button 
                onClick={(e) => { e.stopPropagation(); connectStream(); }}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-bold transition"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#E53945] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(229,57,69,0.5)]">
                <Play size={32} className="text-white ml-1" fill="currentColor" />
              </div>
              <p className="text-white font-bold text-lg">Tap to watch live</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
