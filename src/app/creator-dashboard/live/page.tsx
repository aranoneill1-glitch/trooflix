"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle, Monitor, MonitorOff } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [liveInputId, setLiveInputId] = useState<string | null>(null);

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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = screenStream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        const newStream = new MediaStream([screenTrack, audioTrack]);
        
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;

        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(screenTrack);
        }
        setIsScreenSharing(true);

        screenTrack.onended = () => toggleScreenShare();
      } else {
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

      // Force VP8 codec to prevent Cloudflare from dropping the stream
      const videoTransceiver = pc.getTransceivers().find(t => t.sender.track?.kind === "video");
      if (videoTransceiver) {
        const caps = RTCRtpSender.getCapabilities("video");
        if (caps) {
          const vp8 = caps.codecs.filter(c => c.mimeType === "video/VP8");
          if (vp8.length > 0) {
            videoTransceiver.setCodecPreferences(vp8);
          }
        }
      }

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
    <main className="min-h-[100dvh] bg-[#0a0303] text-white p-4 lg:p-8 flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        
        <h1 className="text-2xl lg:text-3xl font-black text-center flex items-center justify-center gap-2 mb-2">
          <Radio className={isLive ? "text-red-500 animate-pulse" : "text-white/50"} size={24} />
          {isLive ? "You are LIVE" : "Setup Broadcast"}
        </h1>

        <div className={isLive ? "grid grid-cols-1 lg:grid-cols-3 gap-6 w-full" : "w-full max-w-3xl mx-auto flex flex-col items-center"}>
          
          {/* VIDEO COLUMN */}
          <div className={isLive ? "lg:col-span-2 flex flex-col gap-4" : "w-full flex flex-col gap-4"}>
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl ring-1 ring-white/5">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain bg-black"
                style={{ transform: (!isScreenSharing && !isVideoOff) ? "scaleX(-1)" : "none" }}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <VideoOff size={64} className="text-white/20" />
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <button onClick={toggleMute} className={`p-4 rounded-full transition ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20"}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button onClick={toggleVideo} className={`p-4 rounded-full transition ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20"}`}>
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
              <button onClick={toggleScreenShare} className={`p-4 rounded-full transition ${isScreenSharing ? "bg-blue-500/20 text-blue-500" : "bg-white/10 hover:bg-white/20"}`}>
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </button>
            </div>

            {!isLive ? (
              <button
                onClick={startStream}
                disabled={loading}
                className="w-full max-w-md mx-auto mt-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition shadow-[0_0_20px_rgba(229,57,69,0.3)]"
              >
                {loading ? "Connecting to Trooflix..." : "Go Live Now"}
              </button>
            ) : (
              <button
                onClick={stopStream}
                disabled={loading}
                className="w-full max-w-md mx-auto mt-2 bg-white/10 hover:bg-white/20 border border-white/20 text-red-500 font-bold py-4 rounded-xl text-lg transition flex items-center justify-center gap-2"
              >
                <StopCircle size={20} /> End Broadcast
              </button>
            )}
          </div>

          {/* CHAT COLUMN (Only visible when live) */}
          {isLive && liveInputId && (
            <div className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-200px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <LiveChat liveInputId={liveInputId} className="h-full" />
            </div>
          )}
          
        </div>
      </div>
    </main>
  );
}
