"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, AlertCircle } from "lucide-react";

export default function LivePlayer({ whepUrl }: { whepUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);
  const playerRef = useRef<any>(null);

  const connectStream = async () => {
    if (!whepUrl || !videoRef.current) return;
    setConnecting(true);
    setError(false);

    try {
      // Dynamically import the Eyevinn library to keep bundle size small
      const { WebRTCPlayer } = await import("@eyevinn/webrtc-player");
      
      const player = new WebRTCPlayer({
        video: videoRef.current,
        type: "whep",
        statsTypeFilter: "^candidate",
      });

      playerRef.current = player;

      await player.load(new URL(whepUrl));
      
      setConnecting(false);
      setStarted(true);
    } catch (err) {
      console.error("Live playback error:", err);
      setConnecting(false);
      setError(true);
    }
  };

  useEffect(() => {
    return () => {
      // Clean up the player if the user navigates away
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        controls={started} 
        className="w-full h-full object-cover" 
      />
      
      <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse z-10">
        <div className="w-2 h-2 bg-white rounded-full" /> LIVE
      </div>

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
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <p className="text-white font-bold text-lg mb-2">Stream unavailable</p>
              <button 
                onClick={(e) => { e.stopPropagation(); connectStream(); }}
                className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-bold transition"
              >
                Retry
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
