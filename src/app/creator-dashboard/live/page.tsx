"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle, Monitor, MonitorOff, UserCheck } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const canvasPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const guestConnectedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [liveInputId, setLiveInputId] = useState<string | null>(null);
  const [joinRequest, setJoinRequest] = useState<any>(null);
  const [guestConnected, setGuestConnected] = useState(false);
  
  useEffect(() => {
    guestConnectedRef.current = guestConnected;
  }, [guestConnected]);

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
    if (isLive && canvasPreviewRef.current && canvasStreamRef.current) {
      canvasPreviewRef.current.srcObject = canvasStreamRef.current;
      canvasPreviewRef.current.play().catch(e => console.error("Canvas play failed", e));
    }
  }, [isLive]);

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
          } else if (payload.new.status === "left") {
            // Guest left, clear their video and reset canvas
            setGuestConnected(false);
            if (guestVideoRef.current) guestVideoRef.current.srcObject = null;
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive, liveInputId]);

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
      alert("Screen sharing failed: " + err.message);
    }
  };

  const connectGuest = async (guestUserId: string) => {
    if (liveInputId === null) return;
    const supabase = createClient();
    
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]
    });
    
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    let iceQueue: RTCIceCandidateInit[] = [];
    let remoteSet = false;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setGuestConnected(true);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        setGuestConnected(false);
        if (guestVideoRef.current) guestVideoRef.current.srcObject = null;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from("webrtc_signals").insert({
          room_id: liveInputId, sender_id: "host", type: "candidate", payload: event.candidate
        }).then();
      }
    };

    pc.ontrack = (event) => {
      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = event.streams[0];
        guestVideoRef.current.play().catch(e => console.error("Play failed", e));
      }
      
      // Dynamically mix the guest audio into the broadcast
      if (event.track.kind === "audio" && audioCtxRef.current && destRef.current) {
        const stream = event.streams[0];
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        source.connect(destRef.current);
        console.log("MIXED guest audio into stream");
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
        
        // If we detect a new track or a disconnect, handle it
        if (signal.type === "leave") {
           if (guestVideoRef.current) guestVideoRef.current.srcObject = null;
           setGuestConnected(false);
           return;
        }

        if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          remoteSet = true;
          while (iceQueue.length > 0) {
            const candidate = iceQueue.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }
        } else if (signal.type === "candidate") {
          if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.error);
          else iceQueue.push(signal.payload);
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
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      audioCtxRef.current = audioCtx;
      destRef.current = audioCtx.createMediaStreamDestination();

      stream.getAudioTracks().forEach(track => {
        audioCtx.createMediaStreamSource(new MediaStream([track])).connect(destRef.current!);
      });

      const isMobile = window.innerWidth < 768;
      const canvas = document.createElement("canvas");
      canvas.width = isMobile ? 720 : 1280;
      canvas.height = isMobile ? 1280 : 720;
      const ctx = canvas.getContext("2d")!;

      const drawVideoCover = (video: HTMLVideoElement, x: number, y: number, w: number, h: number) => {
        if (!video || video.readyState < 2) return;
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = w / h;
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        
        if (videoAspect > canvasAspect) {
          sw = video.videoHeight * canvasAspect;
          sx = (video.videoWidth - sw) / 2;
        } else {
          sh = video.videoWidth / canvasAspect;
          sy = (video.videoHeight - sh) / 2;
        }
        ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
      };

      const draw = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const isGuestHere = guestConnectedRef.current;

        if (isMobile) {
          // Mobile Layout
          if (isGuestHere) {
            // Split Screen (Top/Bottom)
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 720, 640);
            if (guestVideoRef.current && guestVideoRef.current.srcObject) drawVideoCover(guestVideoRef.current, 0, 640, 720, 640);
          } else {
            // Full Screen (Host only)
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 720, 1280);
          }
        } else {
          // Desktop Layout
          if (isGuestHere) {
            // Split Screen (Left/Right)
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 640, 720);
            if (guestVideoRef.current && guestVideoRef.current.srcObject) drawVideoCover(guestVideoRef.current, 640, 0, 640, 720);
          } else {
            // Full Screen (Host only)
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 1280, 720);
          }
        }
        requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(30);
      canvasStreamRef.current = canvasStream;

      const finalStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destRef.current.stream.getAudioTracks()
      ]);

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
    <main className="min-h-[100dvh] bg-[#0a0303] text-white flex flex-col overflow-hidden">
      
      {joinRequest && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[9999] bg-[#1c1c1e] border border-white/20 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 fade-in">
          <p className="text-lg font-bold mb-4"><span className="text-[#E53945]">{joinRequest.viewer_name}</span> wants to join!</p>
          <div className="flex gap-3">
            <button onClick={() => handleJoinResponse("approved")} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition">Approve</button>
            <button onClick={() => handleJoinResponse("denied")} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold py-2 rounded-lg transition">Deny</button>
          </div>
        </div>
      )}

      {/* Hidden video tag that feeds into the canvas */}
      <video ref={guestVideoRef} autoPlay playsInline style={{ position: "absolute", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", top: "-9999px", left: "-9999px" }} muted />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto overflow-hidden p-4 gap-6">
        
        {/* Left Side: Video & Controls */}
        <div className="flex-1 flex flex-col gap-4">
          
          {/* Video Container (Zoom Style) */}
          <div className="relative flex-1 bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
            
            {/* Host Camera (Always mounted so Canvas can read it) */}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className={`w-full h-full object-contain ${isLive ? "opacity-0 pointer-events-none absolute" : ""}`} 
              style={{ transform: "scaleX(-1)" }} 
            />
            
            {/* Live Canvas Preview */}
            {isLive && (
              <video ref={canvasPreviewRef} autoPlay muted playsInline className="w-full h-full object-contain absolute inset-0" />
            )}
            
            {/* Live Badge */}
            {isLive && (
              <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
              </div>
            )}
            
            {/* Guest Status Badge */}
            {guestConnected && (
              <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md">
                <UserCheck size={14} /> Guest Connected
              </div>
            )}
          </div>

          {/* Control Bar (Below video, no overlay) */}
          <div className="bg-[#1c1c1e] border border-white/10 p-3 rounded-2xl flex justify-between items-center shadow-xl w-full max-w-2xl mx-auto">
            <div className="flex gap-2">
              <button onClick={toggleMute} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/5 hover:bg-white/10 text-white"}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button onClick={toggleVideo} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/5 hover:bg-white/10 text-white"}`}>
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
              <button onClick={toggleScreenShare} className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${isScreenSharing ? "bg-blue-500/20 text-blue-500" : "bg-white/5 hover:bg-white/10 text-white"}`}>
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </button>
            </div>

            {!isLive ? (
              <button onClick={startStream} disabled={loading} className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-8 py-3 rounded-xl transition flex items-center gap-2">
                <Radio size={18} /> {loading ? "Connecting..." : "Go Live"}
              </button>
            ) : (
              <button onClick={stopStream} disabled={loading} className="bg-white/10 hover:bg-white/20 text-red-500 font-bold px-8 py-3 rounded-xl transition flex items-center gap-2">
                <StopCircle size={18} /> End Broadcast
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Chat & Info */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4">
          {isLive && liveInputId ? (
             <LiveChat liveInputId={liveInputId} className="flex-1 min-h-[400px]" />
          ) : (
            <div className="flex-1 bg-[#1c1c1e] border border-white/10 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
              <Radio size={48} className="text-white/20 mb-4" />
              <h2 className="text-xl font-bold mb-2">Ready to broadcast</h2>
              <p className="text-white/50 text-sm">When you go live, your chat and viewer interactions will appear here.</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
