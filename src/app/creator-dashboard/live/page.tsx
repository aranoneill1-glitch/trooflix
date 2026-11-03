"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle, Monitor, MonitorOff } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [liveInputId, setLiveInputId] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);

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

    const toggleScreenShare = async () => {
    if (!stream) return;
    try {
      if (!isScreenSharing) {
        // Switch to Screen Share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace the video track in the local preview
        const audioTrack = stream.getAudioTracks()[0];
        const newStream = new MediaStream([screenTrack, audioTrack]);
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;

        // Replace the track in the live WebRTC connection
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(screenTrack);
        }

        setIsScreenSharing(true);

        // Handle user clicking "Stop Sharing" on the browser UI
        screenTrack.onended = () => toggleScreenShare();
      } else {
        // Switch back to Camera
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        const camTrack = camStream.getVideoTracks()[0];

        const audioTrack = stream.getAudioTracks()[0];
        const newStream = new MediaStream([camTrack, audioTrack]);
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(camTrack);
        }

        setIsScreenSharing(false);
      }
    } catch (err: any) {
      alert("Screen sharing failed or was cancelled: " + err.message);
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

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whipRes = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!whipRes.ok) throw new Error("Failed to connect to Cloudflare");

      const answerSdp = await whipRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

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

      setLiveInputId(liveInputId);
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
      setLiveInputId(null);
      router.push("/creator-dashboard");
    } catch (err: any) {
        alert("Failed to stop stream.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // LOCK TO EXACTLY ONE SCREEN ON MOBILE
    <div className="min-h-[100dvh] w-full bg-[#0a0303] text-white p-4 lg:p-8 flex flex-col items-center justify-start overflow-y-auto">
      <div className="w-full max-w-5xl h-full flex flex-col">
        
        <h1 className="text-xl lg:text-3xl font-black mb-2 lg:mb-6 text-center flex items-center justify-center gap-2 shrink-0">
          <Radio className={isLive ? "text-red-500 animate-pulse" : "text-white/50"} size={20} />
          {isLive ? "You are LIVE" : "Setup Broadcast"}
        </h1>

        {/* LAYOUT: Stacked on mobile filling space, side-by-side on desktop */}
        <div className={`flex flex-col lg:grid lg:grid-cols-12 gap-6 w-full max-w-7xl mx-auto flex-1 min-h-0 ${!isLive ? "justify-start" : "justify-between"}`}>
          
          {/* VIDEO COLUMN */}
          <div className={`flex flex-col shrink-0 ${isLive ? "lg:col-span-8" : "max-w-3xl mx-auto w-full"}`}>
            <div className="bg-black rounded-2xl overflow-hidden aspect-video relative mb-4 border border-white/10 shadow-2xl max-h-[40vh] lg:max-h-none ring-1 ring-white/5">
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

            <div className="flex justify-center gap-4 mb-3 lg:mb-8 shrink-0">
              <button onClick={toggleMute} className={`p-3 lg:p-4 rounded-full ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20"}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button onClick={toggleVideo} className={`p-3 lg:p-4 rounded-full ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20"}`}>
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
              <button onClick={toggleScreenShare} className={`p-3 lg:p-4 rounded-full ${isScreenSharing ? "bg-blue-500/20 text-blue-500" : "bg-white/10 hover:bg-white/20"}`}>
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </button>
            </div>

            {!isLive ? (
              <button
                onClick={startStream}
                disabled={loading}
                className="w-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3 lg:py-4 rounded-xl text-base lg:text-lg transition shadow-[0_0_20px_rgba(229,57,69,0.3)] shrink-0 ring-2 ring-[#E53945]/50 ring-offset-2 ring-offset-[#0a0303]"
              >
                {/* CHANGED TO TROOFLIX */}
                {loading ? "Connecting to Trooflix..." : "Go Live Now"}
              </button>
            ) : (
              <button
                onClick={stopStream}
                disabled={loading}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-red-500 font-bold py-3 lg:py-4 rounded-xl text-base lg:text-lg transition flex items-center justify-center gap-2 shrink-0"
              >
                <StopCircle size={20} /> End Broadcast
              </button>
            )}
          </div>

          {/* CHAT COLUMN (Only visible when live) */}
          {isLive && liveInputId && (
            <div className="flex-1 min-h-[400px] lg:min-h-0 flex flex-col lg:col-span-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4 lg:pb-0">
              <LiveChat liveInputId={liveInputId} className="h-full min-h-0" />
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
