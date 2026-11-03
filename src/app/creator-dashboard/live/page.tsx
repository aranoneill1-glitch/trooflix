"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle, Monitor, MonitorOff } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [liveInputId, setLiveInputId] = useState<string | null>(null);
  const [joinRequest, setJoinRequest] = useState<any>(null);

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
        alert("Please allow camera and microphone access.");
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

  useEffect(() => {
    if (isLive === false || liveInputId === null) return;
    const supabase = createClient();

    const channel = supabase
      .channel("join_requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stream_join_requests", filter: `live_input_id=eq.${liveInputId}` },
        (payload) => {
          if (payload.new.status === "pending") {
            setJoinRequest(payload.new);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive, liveInputId]);

  const connectGuest = async (guestUserId: string) => {
    if (liveInputId === null) return;
    const supabase = createClient();
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onconnectionstatechange = () => {
      console.log("WebRTC Connection State:", pc.connectionState);
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from("webrtc_signals").insert({
          room_id: liveInputId, sender_id: "host", type: "candidate", payload: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = event.streams[0];
        guestVideoRef.current.play().catch(e => console.warn("Guest video play blocked", e));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await supabase.from("webrtc_signals").insert({
      room_id: liveInputId, sender_id: "host", type: "offer", payload: offer
    });

    const channel = supabase.channel(`webrtc_host_${liveInputId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `room_id=eq.${liveInputId}` }, async (payload) => {
        const signal = payload.new;
        if (signal.sender_id === "host") return;

        if (signal.type === "candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.error);
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload)).catch(console.error);
        }
      })
      .subscribe();

    return channel;
  };

  const handleJoinResponse = async (status: "approved" | "denied") => {
    if (joinRequest === null) return;
    const supabase = createClient();
    await supabase.from("stream_join_requests").update({ status }).eq("id", joinRequest.id);
    if (status === "approved") await connectGuest(joinRequest.viewer_user_id);
    setJoinRequest(null);
  };

  const startStream = async () => {
    if (stream === null || userId === null) return;
    setLoading(true);

    try {
      // 1. Setup Canvas IMMEDIATELY
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d")!;

      // Loop to draw video
      const draw = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Host
        if (videoRef.current && videoRef.current.readyState >= 2) {
          ctx.save();
          ctx.translate(640, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, 640, 720);
          ctx.restore();
        }

        // Draw Guest (if connected)
        if (guestVideoRef.current && guestVideoRef.current.readyState >= 2 && guestVideoRef.current.srcObject) {
          ctx.drawImage(guestVideoRef.current, 640, 0, 640, 720);
        }
        requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(30);

      // 2. Mix Audio
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const dest = audioCtx.createMediaStreamDestination();
      
      stream.getAudioTracks().forEach(track => {
        audioCtx.createMediaStreamSource(new MediaStream([track])).connect(dest);
      });

      // Combine Canvas + Audio
      const finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      // 3. Connect to Cloudflare
      let iceServers = [{ urls: "stun:stun.cloudflare.com:3478" }];
      try {
        const turnRes = await fetch("/api/live/turn-credentials");
        if (turnRes.ok) {
          const turnData = await turnRes.json();
          if (Array.isArray(turnData.iceServers)) iceServers = turnData.iceServers;
        }
      } catch (e) {}

      const res = await fetch("/api/live/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to create live input");

      const pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
      pcRef.current = pc;

      finalStream.getTracks().forEach((track) => pc.addTrack(track, finalStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whipRes = await fetch(data.whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!whipRes.ok) throw new Error("WHIP connection failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await whipRes.text() });

      await fetch("/api/live/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_live: true, live_playback_url: data.whepUrl, live_input_id: data.liveInputId }),
      });

      setLiveInputId(data.liveInputId);
      setIsLive(true);
    } catch (err: any) {
      alert("Failed to start: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopStream = async () => {
    if (userId === null) return;
    setLoading(true);
    try {
      await fetch("/api/live/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_live: false, live_playback_url: null, live_input_id: null }),
      });
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setIsLive(false);
      router.push("/creator-dashboard");
    } catch (err: any) {
      alert("Failed to stop stream.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#0a0303] text-white p-4 lg:p-8 flex flex-col items-center overflow-y-auto">
      
      {joinRequest && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] bg-[#1c1c1e] border border-white/20 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in">
          <p className="text-lg font-bold mb-4"><span className="text-[#E53945]">{joinRequest.viewer_name}</span> wants to join!</p>
          <div className="flex gap-3">
            <button onClick={() => handleJoinResponse("approved")} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition">Approve</button>
            <button onClick={() => handleJoinResponse("denied")} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold py-2 rounded-lg transition">Deny</button>
          </div>
        </div>
      )}

      {/* Hidden guest video tag that feeds into the canvas */}
      {/* DEBUG: Floating guest preview to verify WebRTC connection */}
      <div className="fixed top-24 right-6 w-64 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-green-500 z-[9999]">
        <video ref={guestVideoRef} autoPlay playsInline className="w-full h-full object-cover" muted />
        <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
          Guest Debug
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl lg:text-3xl font-black text-center flex items-center justify-center gap-2 mb-2">
          <Radio className={isLive ? "text-red-500 animate-pulse" : "text-white/50"} size={24} />
          {isLive ? "You are LIVE" : "Setup Broadcast"}
        </h1>

        <div className={isLive ? "grid grid-cols-1 lg:grid-cols-3 gap-6 w-full" : "w-full max-w-3xl mx-auto flex flex-col items-center"}>
          <div className={isLive ? "lg:col-span-2 flex flex-col gap-4" : "w-full flex flex-col gap-4"}>
            
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain bg-black" />
            </div>

            {!isLive ? (
              <button onClick={startStream} disabled={loading} className="w-full max-w-md mx-auto mt-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition">
                {loading ? "Connecting..." : "Go Live Now"}
              </button>
            ) : (
              <button onClick={stopStream} disabled={loading} className="w-full max-w-md mx-auto mt-2 bg-white/10 hover:bg-white/20 border border-white/20 text-red-500 font-bold py-4 rounded-xl text-lg transition flex items-center justify-center gap-2">
                <StopCircle size={20} /> End Broadcast
              </button>
            )}
          </div>

          {isLive && liveInputId && (
            <div className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-200px)]">
              <LiveChat liveInputId={liveInputId} className="h-full" />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
