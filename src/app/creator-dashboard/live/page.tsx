"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle } from "lucide-react";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        alert("Please allow camera and microphone access to go live.");
      }
    }
    setupCamera();

    getCachedUser().then((u) => {
      if (u) setUserId(u.id);
    });

    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const startStream = async () => {
    if (!stream || !userId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/live/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create live input");

      const { whipUrl, whepUrl, liveInputId } = data;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const whipRes = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!whipRes.ok) throw new Error("Failed to connect to Cloudflare");

      const answerSdp = await whipRes.text();
      await peerConnection.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // UPDATE VIA API ROUTE TO BYPASS RLS
      const statusRes = await fetch("/api/live/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          is_live: true,
          live_playback_url: whepUrl,
          live_input_id: liveInputId,
        }),
      });

      if (!statusRes.ok) {
        const errData = await statusRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update database");
      }

      setIsLive(true);
    } catch (err: any) {
      alert("Failed to start stream: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopStream = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      await fetch("/api/live/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          is_live: false,
          live_playback_url: null,
          live_input_id: null,
        }),
      });

      if (stream) stream.getTracks().forEach((track) => track.stop());
      setIsLive(false);
      router.push("/creator-dashboard");
    } catch (err: any) {
      alert("Failed to stop stream.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-black mb-6 text-center flex items-center justify-center gap-3">
          <Radio className={isLive ? "text-red-500 animate-pulse" : "text-white/50"} />
          {isLive ? "You are LIVE" : "Setup Broadcast"}
        </h1>

        <div className="bg-black rounded-2xl overflow-hidden aspect-video relative mb-6 border border-white/10 shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <VideoOff size={64} className="text-white/20" />
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20"}`}>
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <button onClick={toggleVideo} className={`p-4 rounded-full ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20"}`}>
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        </div>

        {!isLive ? (
          <button
            onClick={startStream}
            disabled={loading}
            className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition shadow-[0_0_20px_rgba(229,57,69,0.3)]"
          >
            {loading ? "Connecting to Cloudflare..." : "Go Live Now"}
          </button>
        ) : (
          <button
            onClick={stopStream}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-red-500 font-bold py-4 rounded-xl text-lg transition flex items-center justify-center gap-2"
          >
            <StopCircle size={20} /> End Broadcast
          </button>
        )}
      </div>
    </div>
  );
}
