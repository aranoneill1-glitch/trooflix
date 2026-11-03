"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, AlertCircle, RefreshCw, Heart, Eye, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FloatingHeart = { id: number; x: number };

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryCount = useRef(0);
  const lastFrameTime = useRef(performance.now());

  const [viewers] = useState(Math.floor(Math.random() * 500) + 42);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  // Function to strip H.264 from SDP
  const mungeSdpOffer = (sdp: string): string => {
    const lines = sdp.split("\r\n");
    const h264Payloads = new Set<number>();

    // Find H.264 payload types
    for (const line of lines) {
      const match = line.match(/^a=rtpmap:(\d+) H264\/90000/i);
      if (match) {
        h264Payloads.add(parseInt(match[1]));
      }
    }

    if (h264Payloads.size === 0) return sdp;

    const newLines: string[] = [];
    for (const line of lines) {
      // Skip H.264 codec lines
      if (line.match(/^a=rtpmap:(\d+) H264\/90000/i)) continue;
      if (line.match(/^a=fmtp:(\d+)/) && h264Payloads.has(parseInt(line.match(/^a=fmtp:(\d+)/)![1]))) continue;
      if (line.match(/^a=rtcp-fb:(\d+)/) && h264Payloads.has(parseInt(line.match(/^a=rtcp-fb:(\d+)/)![1]))) continue;

      // Remove H.264 payloads from m=video line
      if (line.startsWith("m=video")) {
        const parts = line.split(" ");
        const header = parts.slice(0, 3);
        const payloads = parts.slice(3).filter(pt => !h264Payloads.has(parseInt(pt)));
        newLines.push([...header, ...payloads].join(" "));
        continue;
      }

      newLines.push(line);
    }

    return newLines.join("\r\n");
  };

  const connectStream = async (isRetry = false) => {
    if (!whepUrl || !videoRef.current) return;
    
    if (!isRetry) setConnecting(true); else setReconnecting(true);
    setError(null);

    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.cloudflare.com:3478" },
          {
            urls: "turn:turn.cloudflare.com:3478?transport=udp",
            username: "dummy",
            credential: "dummy"
          }
        ]
      });
      pcRef.current = pc;

      const videoTransceiver = pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      // Force VP8 codec preference
      if (RTCRtpReceiver.getCapabilities) {
        const caps = RTCRtpReceiver.getCapabilities("video");
        if (caps && caps.codecs) {
          const preferred = caps.codecs.filter(c => c.mimeType === "video/VP8");
          if (preferred.length > 0) {
            videoTransceiver.setCodecPreferences(preferred);
            console.log("Viewer forced to use VP8 codec.");
          }
        }
      }

      const offer = await pc.createOffer();
      
      // Munge the SDP to strip H.264
      const mungedSdp = mungeSdpOffer(offer.sdp || "");
      const mungedOffer = { type: "offer" as const, sdp: mungedSdp };
      
      await pc.setLocalDescription(mungedOffer);

      const res = await fetch(whepUrl, { 
        method: "POST", 
        headers: { "Content-Type": "application/sdp" }, 
        body: mungedSdp 
      });

      if (!res.ok) {
        throw new Error(`Cloudflare rejected the connection: ${res.status} ${res.statusText}`);
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      pc.ontrack = (event) => {
        console.log("Video track received from Cloudflare!");
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().then(() => {
            setConnecting(false); setReconnecting(false); setStarted(true);
            retryCount.current = 0;
            
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
          }).catch((e) => {
             setConnecting(false);
             setError("Browser blocked autoplay. Tap to play.");
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          if (retryCount.current < 5) { retryCount.current++; setTimeout(() => connectStream(true), 1000); }
          else { setError("Network connection lost. Please try reloading."); setReconnecting(false); }
        }
      };
    } catch (err: any) {
      setConnecting(false); setReconnecting(false);
      setError(err.message || "Failed to connect to stream");
      if (retryCount.current < 5) { retryCount.current++; setTimeout(() => connectStream(true), 2000); }
    }
  };

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

  const spawnHeart = () => {
    const id = Date.now();
    setHearts((prev) => [...prev, { id, x: Math.random() * 40 - 20 }]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 2000);
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
      <video ref={videoRef} autoPlay playsInline controls={started} className="w-full h-full object-cover" />
      
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
          <motion.div
            key={h.id}
            initial={{ opacity: 1, y: 0, scale: 0.5, x: 0 }}
            animate={{ opacity: 0, y: -150, scale: 1.5, x: h.x }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute bottom-20 right-10 text-[#E53945] pointer-events-none z-30"
          >
            <Heart size={32} fill="currentColor" />
          </motion.div>
        ))}
      </AnimatePresence>

      {started && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-end items-center gap-3 z-20 pointer-events-none">
          <button onClick={() => navigator.share?.({ url: window.location.href })} className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition">
            <Share2 size={20} />
          </button>
          <button onClick={spawnHeart} className="pointer-events-auto p-4 rounded-full bg-[#E53945] hover:bg-[#d12e39] shadow-[0_0_20px_rgba(229,57,69,0.4)] text-white transition active:scale-90">
            <Heart size={24} fill="currentColor" />
          </button>
        </div>
      )}

      {reconnecting && <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none"><RefreshCw size={32} className="text-[#E53945] animate-spin mb-2" /><p className="text-white font-bold text-sm">Reconnecting...</p></div>}
      
      {!started && !reconnecting && (
        <div onClick={() => connectStream(false)} className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 cursor-pointer backdrop-blur-md transition-all p-6 text-center">
          {connecting ? (
            <>
              <Loader2 size={48} className="text-[#E53945] animate-spin mb-4" />
              <p className="text-white font-bold text-lg">Connecting...</p>
            </>
          ) : error ? (
            <>
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <p className="text-white font-bold text-lg mb-2">Connection Failed</p>
              <p className="text-red-400 text-sm mb-6 max-w-md bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>
              <button onClick={(e) => { e.stopPropagation(); retryCount.current = 0; connectStream(false); }} className="px-6 py-2 bg-[#E53945] hover:bg-[#d12e39] rounded-full text-white font-bold flex items-center gap-2">
                <RefreshCw size={16} /> Try Again
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
