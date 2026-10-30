"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, AlertCircle, RefreshCw } from "lucide-react";

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryCount = useRef(0);
  const lastFrameTime = useRef(performance.now());

  const connectStream = async (isRetry = false) => {
    if (!whepUrl || !videoRef.current) return;
    
    if (!isRetry) setConnecting(true); else setReconnecting(true);
    setError(false);

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }] });
      pcRef.current = pc;

      const videoTransceiver = pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      if (RTCRtpReceiver.getCapabilities) {
        const caps = RTCRtpReceiver.getCapabilities("video");
        if (caps && caps.codecs) {
          const preferred = caps.codecs.filter(c => c.mimeType === "video/VP8" || c.mimeType === "video/H264");
          if (preferred.length > 0) videoTransceiver.setCodecPreferences(preferred);
        }
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(whepUrl, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: offer.sdp });
      if (!res.ok) throw new Error("Failed to connect");
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().then(() => {
            setConnecting(false); setReconnecting(false); setStarted(true);
            retryCount.current = 0;
            
            // Save local reference to satisfy TypeScript
            const video = videoRef.current;
            lastFrameTime.current = performance.now();
            
            const tick = () => {
              lastFrameTime.current = performance.now();
              if (video && "requestVideoFrameCallback" in video) {
                video.requestVideoFrameCallback(tick);
              }
            };
            
            if (video && "requestVideoFrameCallback" in video) {
              video.requestVideoFrameCallback(tick);
            }
          }).catch(() => { setConnecting(false); setStarted(true); });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          if (retryCount.current < 5) { retryCount.current++; setTimeout(() => connectStream(true), 1000); }
          else { setError(true); setReconnecting(false); }
        }
      };
    } catch (err) {
      setConnecting(false); setReconnecting(false);
      if (retryCount.current < 5) { retryCount.current++; setTimeout(() => connectStream(true), 2000); }
      else setError(true);
    }
  };

  // THE FRAME FREEZE DETECTOR
  useEffect(() => {
    if (!started) return;

    const checkFreeze = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        if (performance.now() - lastFrameTime.current > 2500) {
          console.warn("Stream frozen. Forcing reconnect...");
          connectStream(true);
        }
      }
    }, 1000);

    return () => clearInterval(checkFreeze);
  }, [started]);

  useEffect(() => { return () => { if (pcRef.current) pcRef.current.close(); }; }, []);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <video ref={videoRef} autoPlay playsInline controls={started} className="w-full h-full object-cover" />
      <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse z-10 pointer-events-none"><div className="w-2 h-2 bg-white rounded-full" /> LIVE</div>
      {reconnecting && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"><RefreshCw size={32} className="text-[#E53945] animate-spin mb-2" /><p className="text-white font-bold text-sm">Reconnecting...</p></div>}
      {!started && !reconnecting && (
        <div onClick={() => connectStream(false)} className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 cursor-pointer backdrop-blur-sm">
          {connecting ? (<><Loader2 size={48} className="text-[#E53945] animate-spin mb-4" /><p className="text-white font-bold text-lg">Connecting...</p></>) : error ? (<><AlertCircle size={48} className="text-red-500 mb-4" /><p className="text-white font-bold text-lg mb-2">Stream disconnected</p><button onClick={(e) => { e.stopPropagation(); retryCount.current = 0; connectStream(false); }} className="mt-4 px-6 py-2 bg-[#E53945] rounded-full text-white font-bold">Reload Stream</button></>) : (<><div className="w-16 h-16 bg-[#E53945] rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(229,57,69,0.5)]"><Play size={32} className="text-white ml-1" fill="currentColor" /></div><p className="text-white font-bold text-lg">Tap to watch live</p></>)}
        </div>
      )}
    </div>
  );
}
