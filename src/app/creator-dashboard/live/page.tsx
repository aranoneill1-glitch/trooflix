"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle, Monitor, MonitorOff, UserCheck, PictureInPicture, ShoppingBag, X, Globe, Lock, Loader2 } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const guestAudioRef = useRef<HTMLAudioElement>(null);
  const canvasPreviewRef = useRef<HTMLVideoElement>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const guestConnectedRef = useRef(false);
  const hostPcRef = useRef<RTCPeerConnection | null>(null);
  
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
  const [connectedGuestName, setConnectedGuestName] = useState("");
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [liveVisibility, setLiveVisibility] = useState<"public" | "subscribers">("public");

  useEffect(() => {
    guestConnectedRef.current = guestConnected;
  }, [guestConnected]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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

    const fetchPending = async () => {
      const { data } = await supabase.from("stream_join_requests")
        .select("*")
        .eq("live_input_id", liveInputId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) setJoinRequest(data[0]);
    };
    fetchPending();

    const channel = supabase
      .channel(`join_requests_${liveInputId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stream_join_requests" },
        (payload) => {
          if (payload.new && (payload.new as any).live_input_id === liveInputId) {
            if (payload.eventType === "INSERT" && (payload.new as any).status === "pending") {
              setJoinRequest(payload.new);
            } else if (payload.eventType === "UPDATE" && (payload.new as any).status === "left") {
              setGuestConnected(false);
              if (guestVideoRef.current) guestVideoRef.current.srcObject = null;
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive, liveInputId]);

  useEffect(() => {
    if (isLive && canvasPreviewRef.current && canvasStreamRef.current) {
      canvasPreviewRef.current.srcObject = canvasStreamRef.current;
      canvasPreviewRef.current.play().catch(e => console.error("Canvas play failed", e));
    }
  }, [isLive]);

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
        setIsScreenSharing(true);
        screenTrack.onended = () => toggleScreenShare();
      } else {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        const camTrack = camStream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        const newStream = new MediaStream([camTrack, audioTrack]);
        setStream(newStream);
        if (videoRef.current) videoRef.current.srcObject = newStream;
        setIsScreenSharing(false);
      }
    } catch (err: any) {
      alert("Screen sharing failed: " + err.message);
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        const videoToPop = isLive ? canvasPreviewRef.current : videoRef.current;
        if (videoToPop) await videoToPop.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed:", err);
      alert("Picture-in-Picture is not supported on this browser/device.");
    }
  };

  const toggleLiveVisibility = async () => {
    const newVisibility = liveVisibility === "public" ? "subscribers" : "public";
    setLiveVisibility(newVisibility);
    
    if (isLive && userId) {
      const supabase = createClient();
      await supabase.from("profiles").update({ live_visibility: newVisibility }).eq("user_id", userId);
    }
  };

  const openProductMenu = async () => {
    setShowProductMenu(true);
    if (myProducts.length > 0) return;
    
    setIsLoadingProducts(true);
    
    try {
      const user = await getCachedUser();
      if (!user) return;

      const cr = await fetch(`/api/me/creator?user_id=${user.id}`).then(r => r.json());
      const cid = cr.creator?.id;

      const res = await fetch("/api/products/global").then(r => r.json());
      
      if (res.products) {
        const myItems = res.products.filter((p: any) => 
          String(p.creator_id) === String(cid) || String(p.creator_id) === String(user.id)
        );
        setMyProducts(myItems);
      }
    } catch (e) {
      console.error("Failed to fetch products", e);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const sendProductToChat = async (product: any) => {
    if (!liveInputId) return;
    const supabase = createClient();
    await supabase.from("live_chat_messages").insert({
      live_input_id: liveInputId,
      user_id: userId,
      display_name: "Trooflix Shop",
      message: `Showcased a product: ${product.name}`,
      type: "product",
      metadata: {
        id: product.id,
        name: product.name,
        price_cents: product.price_cents,
        image_url: product.image_url || product.image
      }
    });
    setShowProductMenu(false);
  };

  const connectGuest = async (guestUserId: string) => {
    if (liveInputId === null) return;
    const supabase = createClient();
    
    if (hostPcRef.current) {
      hostPcRef.current.close();
    }
    
    await supabase.from("webrtc_signals").delete().eq("room_id", liveInputId);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]
    });
    hostPcRef.current = pc;
    
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
      if (event.track.kind === "video" && guestVideoRef.current) {
        guestVideoRef.current.srcObject = event.streams[0];
        guestVideoRef.current.play().catch(e => console.error("Video play failed", e));
      }
      
      if (event.track.kind === "audio") {
        if (guestAudioRef.current) {
          guestAudioRef.current.srcObject = new MediaStream([event.track]);
          guestAudioRef.current.play().catch(e => console.error("Host audio play failed", e));
        }
        if (audioCtxRef.current && destRef.current) {
          const source = audioCtxRef.current.createMediaStreamSource(new MediaStream([event.track]));
          source.connect(destRef.current);
        }
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
    if (status === "approved") {
      setConnectedGuestName(joinRequest.viewer_name);
      await connectGuest(joinRequest.viewer_user_id);
    }
    setJoinRequest(null);
  };

  const drawVideoCover = (video: HTMLVideoElement, x: number, y: number, w: number, h: number, ctx: CanvasRenderingContext2D) => {
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

      const draw = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const isGuestHere = guestConnectedRef.current;

        if (isMobile) {
          if (isGuestHere) {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 720, 640, ctx);
            if (guestVideoRef.current && guestVideoRef.current.srcObject) drawVideoCover(guestVideoRef.current, 0, 640, 720, 640, ctx);
          } else {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 720, 1280, ctx);
          }
        } else {
          if (isGuestHere) {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 640, 720, ctx);
            if (guestVideoRef.current && guestVideoRef.current.srcObject) drawVideoCover(guestVideoRef.current, 640, 0, 640, 720, ctx);
          } else {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 1280, 720, ctx);
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

      const res = await fetch("/api/live/create", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }) 
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create live input");

      const { whipUrl, whepUrl, liveInputId } = data;
      if (!whipUrl) throw new Error("Invalid WHIP URL received from API: " + JSON.stringify(data));

      let iceServers = [{ urls: "stun:stun.cloudflare.com:3478" }];
      try {
        const turnRes = await fetch("/api/live/turn-credentials");
        if (turnRes.ok) {
          const turnData = await turnRes.json();
          if (Array.isArray(turnData.iceServers)) iceServers = turnData.iceServers;
        }
      } catch (e) {}

      const pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
      finalStream.getTracks().forEach((track) => pc.addTrack(track, finalStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whipRes = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });

      if (!whipRes.ok) throw new Error("WHIP connection failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await whipRes.text() });

      await fetch("/api/live/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_live: true, live_playback_url: whepUrl, live_input_id: liveInputId, live_visibility: liveVisibility }),
      });

      setLiveInputId(liveInputId);
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
        body: JSON.stringify({ userId, is_live: false, live_playback_url: null, live_input_id: null, live_visibility: "public" }),
      });

      await fetch("/api/live/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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
      
      <video ref={guestVideoRef} autoPlay playsInline style={{ position: "absolute", width: "1px", height: "1px", opacity: 0.01, pointerEvents: "none", top: "-9999px", left: "-9999px" }} muted />
      <audio ref={guestAudioRef} autoPlay className="hidden" />

      {/* PRODUCT PICKER MODAL */}
      {showProductMenu && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><ShoppingBag size={20} className="text-[#E53945]"/> Showcase a Product</h3>
              <button onClick={() => setShowProductMenu(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition text-white"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
              {isLoadingProducts ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-white/50">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E53945] mb-4" />
                  <p className="font-bold">Loading your products...</p>
                </div>
              ) : myProducts.length === 0 ? (
                <div className="col-span-full text-center py-10 text-white/50">No products found in your shop.</div>
              ) : (
                myProducts.map(p => (
                  <div key={p.id} onClick={() => sendProductToChat(p)} className="bg-black/50 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-[#E53945] transition group">
                    <div className="aspect-square relative overflow-hidden">
                      <img src={p.image_url || p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <p className="text-emerald-400 text-xs font-bold">${(p.price_cents / 100).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1600px] mx-auto overflow-hidden p-4 gap-6">
        
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative flex-1 bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain absolute inset-0" style={{ transform: "none" }} />
            
            {isLive && (
              <video ref={canvasPreviewRef} autoPlay muted playsInline className="w-full h-full object-contain absolute inset-0 z-10 bg-black" />
            )}

            {isLive && (
              <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-20">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
              </div>
            )}
            
            {guestConnected && (
              <div className="absolute top-4 right-4 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md z-20">
                <UserCheck size={14} /> {connectedGuestName || "Guest"} Connected
              </div>
            )}
          </div>

          <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl flex flex-wrap justify-center lg:justify-between items-center gap-3 shadow-2xl w-full max-w-3xl mx-auto">
            
            {/* Left Side: Media Controls */}
            <div className="flex gap-2">
              <button onClick={toggleMute} className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/5 hover:bg-white/10 text-white"}`} title="Toggle Mic">
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button onClick={toggleVideo} className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/5 hover:bg-white/10 text-white"}`} title="Toggle Camera">
                {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
              <button onClick={toggleScreenShare} className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${isScreenSharing ? "bg-blue-500/20 text-blue-500" : "bg-white/5 hover:bg-white/10 text-white"}`} title="Share Screen">
                {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              </button>
              <button onClick={togglePiP} className="w-11 h-11 rounded-xl flex items-center justify-center transition bg-white/5 hover:bg-white/10 text-white" title="Picture in Picture">
                <PictureInPicture size={18} />
              </button>
              <button onClick={openProductMenu} className="w-11 h-11 rounded-xl flex items-center justify-center transition bg-[#E53945]/20 hover:bg-[#E53945]/30 text-[#E53945]" title="Showcase Product">
                <ShoppingBag size={18} />
              </button>
            </div>

            {/* Right Side: Visibility & Go Live */}
            <div className="flex items-center gap-3">
              
              {/* Visibility Toggle */}
              <div className="flex bg-black/50 border border-white/10 rounded-xl p-1 shadow-inner">
                <button onClick={() => setLiveVisibility("public")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${liveVisibility === "public" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"}`}>
                  <Globe size={14} /> <span className="hidden sm:inline">Everyone</span>
                </button>
                <button onClick={() => setLiveVisibility("subscribers")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${liveVisibility === "subscribers" ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-sm" : "text-white/50 hover:text-white"}`}>
                  <Lock size={14} /> <span className="hidden sm:inline">Subs Only</span>
                </button>
              </div>

              {/* Go Live / End Broadcast Button */}
              {!isLive ? (
                <button onClick={startStream} disabled={loading} className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(229,57,69,0.3)] min-w-[120px]">
                  <Radio size={18} /> {loading ? "Starting..." : "Go Live"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={toggleLiveVisibility} className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${liveVisibility === "subscribers" ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-white/5 hover:bg-white/10 text-white"}`} title="Toggle Privacy">
                    {liveVisibility === "subscribers" ? <Lock size={18} /> : <Globe size={18} />}
                  </button>
                  <button onClick={stopStream} disabled={loading} className="bg-white/10 hover:bg-white/20 text-red-500 font-bold px-6 py-2.5 rounded-xl transition flex items-center justify-center gap-2 whitespace-nowrap border border-white/10 min-w-[120px]">
                    <StopCircle size={18} /> End
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[380px] flex flex-col gap-3">
          {isLive && liveInputId ? (
             <>
               {joinRequest && (
                 <div className="bg-[#1c1c1e] border border-[#E53945]/30 p-4 rounded-xl shadow-lg animate-in slide-in-from-bottom-2">
                   <div className="flex items-center gap-3 mb-3">
                     {joinRequest.viewer_avatar ? (
                       <img src={joinRequest.viewer_avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-sm" />
                     ) : (
                       <div className="w-9 h-9 rounded-full bg-[#E53945] flex items-center justify-center text-sm font-bold text-white shadow-sm">
                         {joinRequest.viewer_name.charAt(0).toUpperCase()}
                       </div>
                     )}
                     <p className="text-sm font-bold"><span className="text-[#E53945]">{joinRequest.viewer_name}</span> wants to join!</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleJoinResponse("approved")} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 rounded-lg text-sm transition">Approve</button>
                     <button onClick={() => handleJoinResponse("denied")} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 font-bold py-1.5 rounded-lg text-sm transition border border-red-500/20">Deny</button>
                   </div>
                 </div>
               )}
               <LiveChat liveInputId={liveInputId} className="flex-1 min-h-[400px]" />
             </>
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
