"use client";

import { useEffect, useRef } from "react";

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!whepUrl) return;
    let peerConnection: RTCPeerConnection;

    async function playStream() {
      try {
        peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
        });

        peerConnection.addTransceiver("video", { direction: "recvonly" });
        peerConnection.addTransceiver("audio", { direction: "recvonly" });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const res = await fetch(whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: offer.sdp,
        });

        if (!res.ok) throw new Error("Failed to connect to stream");
        const answerSdp = await res.text();
        await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });

        peerConnection.ontrack = (event) => {
          if (videoRef.current) videoRef.current.srcObject = event.streams[0];
        };
      } catch (err) {
        console.error("Live playback error:", err);
      }
    }
    playStream();

    return () => {
      if (peerConnection) peerConnection.close();
    };
  }, [whepUrl]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
      <video ref={videoRef} autoPlay playsInline controls className="w-full h-full object-contain" />
      <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full" /> LIVE
      </div>
    </div>
  );
}
