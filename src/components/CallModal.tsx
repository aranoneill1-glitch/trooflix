"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Video, VideoOff, SwitchCamera, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  status: "calling" | "ringing" | "connected" | "ended" | "rejected" | "failed";
  peerName: string;
  peerAvatar: string | null;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  muted: boolean;
  videoEnabled: boolean;
  hasRemoteVideo: boolean;
  facingMode: "user" | "environment";
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onEnd: () => void;
};

export default function CallModal({
  status, peerName, peerAvatar, remoteStream, localStream, muted,
  videoEnabled, hasRemoteVideo, facingMode,
  onToggleMute, onToggleCamera, onFlipCamera, onEnd,
}: Props) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);
  const showVideo = status === "connected" && hasRemoteVideo;
  const [swapped, setSwapped] = useState(false);

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

  // Remote stream
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video && remoteStream) {
      if (video.srcObject !== remoteStream) video.srcObject = remoteStream;
      video.muted = false;
      video.volume = 1;
      video.play().catch((e) => console.warn("Remote play failed:", e));
    }
  }, [remoteStream, swapped, showVideo]);

  // Local self-view
  useEffect(() => {
    const video = localVideoRef.current;
    if (video && localStream) {
      if (video.srcObject !== localStream) video.srcObject = localStream;
      video.muted = true;
      video.play().catch((e) => console.warn("Local play blocked:", e));
      
      // iOS sometimes needs a tiny delay to render video frames after a CSS swap
      const timer = setTimeout(() => {
        video.play().catch(() => {});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localStream, swapped, showVideo]);

  useEffect(() => {
    try {
      const nav: any = navigator;
      if (nav.audioSession) nav.audioSession.type = "play-and-record";
    } catch {}
  }, []);

  const toggleSpeaker = () => setSpeakerOn(!speakerOn);
  
  const statusLabel =
    status === "calling" ? "Calling..." :
    status === "ringing" ? "Connecting..." :
    status === "connected" ? formatDuration(duration) :
    status === "rejected" ? "Declined" :
    status === "ended" ? "Call ended" :
    status === "failed" ? "Failed" : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10010] bg-[#0b141a] flex flex-col overflow-hidden"
      >
        {/* Remote video (full screen if available) */}
        
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={showVideo ? `absolute ${swapped ? "top-20 right-4 w-28 h-40 rounded-2xl z-20 shadow-2xl" : "inset-0 w-full h-full object-cover"}` : "absolute w-1 h-1 opacity-0 pointer-events-none"}
          onClick={() => { if (swapped) setSwapped(false); }}
        />

        {/* Local PiP or Full */}
        {showVideo && localStream && (
          <div 
            onClick={() => setSwapped(!swapped)}
            className={`absolute ${swapped ? "inset-0 w-full h-full z-10" : "top-20 right-4 w-28 h-40 rounded-2xl z-20 shadow-2xl"} overflow-hidden bg-black cursor-pointer`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <VideoOff size={24} className="text-white/60" />
              </div>
            )}
          </div>
        )}


        {/* Avatar view (only when no remote video) */}
        {!showVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              animate={{ scale: status === "connected" ? 1 : [1, 1.02, 1] }}
              transition={status === "connected" ? {} : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-40 h-40 rounded-full p-1 bg-white/10 shadow-2xl mb-6 relative"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#1c1c1e] flex items-center justify-center">
                {peerAvatar ? (
                  <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-black text-white/80">{peerName.charAt(0).toUpperCase() || "?"}</span>
                )}
              </div>
            </motion.div>
            <h2 className="text-3xl font-semibold text-white mb-2 px-6 text-center">{peerName || "Caller"}</h2>
            <p className={`text-base font-medium ${status === "connected" ? "text-white/80" : status === "rejected" || status === "failed" ? "text-red-400" : "text-white/50"}`}>
              {statusLabel}
            </p>
          </div>
        )}

        {/* Top bar (video mode: name + duration overlay) */}
        {showVideo && (
          <>
            <div className="absolute top-0 left-0 right-0 p-4 pt-16 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
              <div className="flex flex-col items-center">
                <p className="text-white font-bold text-lg drop-shadow-lg">{peerName}</p>
                <p className="text-white/70 text-sm">{statusLabel}</p>
              </div>
            </div>
          </>
        )}

        {/* PiP self-view (video only) */}
        {showVideo && localStream && (
          <div className="absolute top-20 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl z-20 bg-transparent">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
            {!videoEnabled && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <VideoOff size={24} className="text-white/60" />
              </div>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onEnd}
          className="absolute top-4 left-4 z-30 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
          aria-label="Minimize"
        >
          <ChevronDown size={24} />
        </button>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 pb-12 pt-8 px-6 flex items-center justify-center gap-5 z-20 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={toggleSpeaker}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${speakerOn ? "bg-white/20 text-white" : "bg-white/10 text-white/70"}`}
          >
            {speakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

          <button
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${muted ? "bg-white text-black" : "bg-white/20 text-white"}`}
          >
            {muted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          {hasRemoteVideo && (
            <button
              onClick={onToggleCamera}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition ${!videoEnabled ? "bg-white text-black" : "bg-white/20 text-white"}`}
            >
              {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}

          {hasRemoteVideo && (
            <button
              onClick={onFlipCamera}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center transition"
            >
              <SwitchCamera size={24} />
            </button>
          )}

          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-transform hover:scale-105"
          >
            <PhoneOff size={28} className="text-white" fill="white" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
