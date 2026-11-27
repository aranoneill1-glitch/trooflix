"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";
import { Mic, MicOff, Video, VideoOff, Radio, StopCircle, Monitor, MonitorOff, UserCheck, PictureInPicture, ShoppingBag, X, Globe, Lock, Loader2, SwitchCamera, MessageCircle, UserPlus, Search } from "lucide-react";
import LiveChat from "@/components/LiveChat";

export default function GoLivePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestVideoRef = useRef<HTMLVideoElement>(null);
  const guestAudioRef = useRef<HTMLAudioElement>(null);
  const canvasPreviewRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
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
  const [streamTime, setStreamTime] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [liveInputId, setLiveInputId] = useState<string | null>(null);
  const [joinRequest, setJoinRequest] = useState<any>(null);
  const [guestConnected, setGuestConnected] = useState(false);
  const [connectedGuestName, setConnectedGuestName] = useState("");
  const [connectedGuestAvatar, setConnectedGuestAvatar] = useState<string | null>(null);
  const [connectedGuestUserId, setConnectedGuestUserId] = useState<string | null>(null);
  const [isFollowingGuest, setIsFollowingGuest] = useState(false);
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [liveVisibility, setLiveVisibility] = useState<"public" | "subscribers">("public");
  const [creatorToolsUnlocked, setCreatorToolsUnlocked] = useState<boolean | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false);
  const [floatingComments, setFloatingComments] = useState<any[]>([]);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<any[]>([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [inviteSending, setInviteSending] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<{ username?: string; display_name?: string } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (!isLive || !liveInputId) { setFloatingComments([]); return; }
    const supabase = createClient();
    const channel = supabase
      .channel(`live_floating_host_${liveInputId}_${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `live_input_id=eq.${liveInputId}` },
        (payload) => {
          const msg = payload.new as any;
          const item = { id: String(msg.id || Date.now()), display_name: msg.display_name || "User", avatar_url: msg.avatar_url || null, message: msg.message || "", type: msg.type, metadata: msg.metadata };
          setFloatingComments((prev) => [...prev.slice(-99), item]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isLive, liveInputId]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [floatingComments]);

  useEffect(() => {
    if (!showInviteSheet) return;
    const q = inviteQuery.trim();
    if (q.length < 2) { setInviteResults([]); return; }
    const t = setTimeout(async () => {
      setInviteSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await res.json();
        const users = Array.isArray(data?.users) ? data.users.filter((u: any) => u.user_id !== userId) : [];
        setInviteResults(users);
      } catch { setInviteResults([]); }
      finally { setInviteSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [showInviteSheet, inviteQuery, userId]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => setStreamTime(prev => prev + 1), 1000);
    } else {
      setStreamTime(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    guestConnectedRef.current = guestConnected;
  }, [guestConnected]);

  useEffect(() => {
    if (stream && videoRef.current) {
      if (videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (!connectedGuestUserId || !userId) { setIsFollowingGuest(false); return; }
    fetch(`/api/user-follows?user_id=${encodeURIComponent(userId)}&target_id=${encodeURIComponent(connectedGuestUserId)}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setIsFollowingGuest(!!d?.following))
      .catch(() => setIsFollowingGuest(false));
  }, [connectedGuestUserId, userId]);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        alert("Please allow camera and microphone access.");
      }
    }
    setupCamera();

    getCachedUser().then(async (u) => {
      if (u) {
        setUserId(u.id);
        try {
          const p = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" }).then(r => r.json());
          setCreatorToolsUnlocked(!!p?.profile?.creator_tools_unlocked);
          setHostProfile({ username: p?.profile?.username, display_name: p?.profile?.display_name || p?.profile?.username });
        } catch { setCreatorToolsUnlocked(false); }
      } else {
        setCreatorToolsUnlocked(false);
      }
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
    if (!isLive) return;
    const attach = () => {
      if (canvasPreviewRef.current && canvasStreamRef.current) {
        if (canvasPreviewRef.current.srcObject !== canvasStreamRef.current) {
          canvasPreviewRef.current.srcObject = canvasStreamRef.current;
        }
        canvasPreviewRef.current.play().catch(() => {});
      }
    };
    attach();
    const t = setInterval(attach, 500);
    return () => clearInterval(t);
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

  const flipCamera = async () => {
    if (!stream || isScreenSharing) return;
    try {
      const nextFacing = isFrontCamera ? "environment" : "user";
      const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
      const newTrack = camStream.getVideoTracks()[0];
      const oldTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (oldTrack) oldTrack.stop();
      const newStream = new MediaStream([newTrack, ...(audioTrack ? [audioTrack] : [])]);
      setStream(newStream);
      if (videoRef.current) videoRef.current.srcObject = newStream;
      setIsFrontCamera(!isFrontCamera);
      setIsVideoOff(false);
    } catch (err) {
      console.error("Flip camera failed:", err);
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
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
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

  const sendInvite = async (targetUser: any) => {
    if (!userId || !targetUser?.user_id) return;
    setInviteSending(targetUser.user_id);
    try {
      const res = await fetch("/api/live/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostUserId: userId,
          hostName: hostProfile?.display_name || hostProfile?.username || "Someone",
          hostUsername: hostProfile?.username || "",
          invitedUserId: targetUser.user_id,
          liveInputId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to invite");
      setInviteResults((prev) => prev.map((u) => u.user_id === targetUser.user_id ? { ...u, invited: true } : u));
    } catch (e: any) {
      alert(e?.message || "Could not send invite.");
    } finally {
      setInviteSending(null);
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
    
    if (hostPcRef.current) hostPcRef.current.close();
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
        setConnectedGuestName("");
        setConnectedGuestAvatar(null);
        setConnectedGuestUserId(null);
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
    await supabase.from("webrtc_signals").insert({ room_id: liveInputId, sender_id: "host", type: "offer", payload: offer });

    const channel = supabase.channel(`webrtc_host_${liveInputId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `room_id=eq.${liveInputId}` }, async (payload) => {
        const signal = payload.new;
        if (!signal || signal.sender_id === "host") return;

        if (signal.type === "answer") {
          if (remoteSet) return;
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
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data } = await supabase.from("webrtc_signals")
            .select("*").eq("room_id", liveInputId).eq("type", "answer")
            .order("created_at", { ascending: false }).limit(1);
          if (data && data.length > 0 && !remoteSet) {
            const answer = data[0];
            if (answer.sender_id !== "host") {
              await pc.setRemoteDescription(new RTCSessionDescription(answer.payload));
              remoteSet = true;
              while (iceQueue.length > 0) {
                const candidate = iceQueue.shift();
                if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
              }
            }
          }
        }
      });

    return channel;
  };

  const handleJoinResponse = async (status: "approved" | "denied") => {
    if (joinRequest === null) return;
    const supabase = createClient();
    await supabase.from("stream_join_requests").update({ status }).eq("id", joinRequest.id);
    if (status === "approved") {
      setConnectedGuestName(joinRequest.viewer_name);
      setConnectedGuestAvatar(joinRequest.viewer_avatar || null);
      setConnectedGuestUserId(joinRequest.viewer_user_id || null);
      await connectGuest(joinRequest.viewer_user_id);
    }
    setJoinRequest(null);
  };

  const toggleFollowGuest = async () => {
    if (!userId || !connectedGuestUserId) return;
    const next = !isFollowingGuest;
    setIsFollowingGuest(next);
    try {
      await fetch("/api/user-follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: userId, followingId: connectedGuestUserId }),
      });
    } catch {
      setIsFollowingGuest(!next);
    }
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

      if (videoRef.current) {
        if (videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const isMobile = window.innerWidth < 768;
      const canvas = document.createElement("canvas");
      canvas.width = isMobile ? 1080 : 1920;
      canvas.height = isMobile ? 1920 : 1080;
      const ctx = canvas.getContext("2d")!;

      const draw = () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const isGuestHere = guestConnectedRef.current;
        if (isMobile) {
          if (isGuestHere) {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 1080, 960, ctx);
            if (guestVideoRef.current && guestVideoRef.current.srcObject) drawVideoCover(guestVideoRef.current, 0, 960, 1080, 960, ctx);
          } else {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 1080, 1920, ctx);
          }
        } else {
          if (isGuestHere) {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 1920, 540, ctx);
            if (guestVideoRef.current && guestVideoRef.current.srcObject) drawVideoCover(guestVideoRef.current, 0, 540, 1920, 540, ctx);
          } else {
            if (videoRef.current) drawVideoCover(videoRef.current, 0, 0, 1920, 1080, ctx);
          }
        }
        requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(30);
      canvasStreamRef.current = canvasStream;
      const finalStream = new MediaStream([...canvasStream.getVideoTracks(), ...destRef.current.stream.getAudioTracks()]);

      const res = await fetch("/api/live/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
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

      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        try {
          if (videoSender.track) (videoSender.track as any).contentHint = "motion";
          const params = videoSender.getParameters();
          if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
          params.encodings[0].maxBitrate = 6_000_000;
          params.encodings[0].maxFramerate = 30;
          (params as any).degradationPreference = "maintain-resolution";
          await videoSender.setParameters(params);
        } catch (e) { console.warn("Failed to set video bitrate", e); }
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whipRes = await fetch(whipUrl, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: offer.sdp });
      if (!whipRes.ok) throw new Error("WHIP connection failed");
      await pc.setRemoteDescription({ type: "answer", sdp: await whipRes.text() });

      await fetch("/api/live/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, is_live: true, live_playback_url: whepUrl, live_input_id: liveInputId, live_visibility: liveVisibility }) });

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
      await fetch("/api/live/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, is_live: false, live_playback_url: null, live_input_id: null, live_visibility: "public" }) });
      await fetch("/api/live/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setIsLive(false);
      router.push("/creator-dashboard");
    } catch (err: any) {
      alert("Failed to stop stream.");
    } finally {
      setLoading(false);
    }
  };

  if (creatorToolsUnlocked === null) {
    return (
      <main className="h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  if (!creatorToolsUnlocked) {
    return (
      <main className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1c1c1e] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-yellow-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Unlock Creator Tools</h1>
          <p className="text-white/55 text-sm mb-6">Drop $5 on coins to unlock Live, Shop, and Premium. The best part? Those coins go straight to your favorite creators — not us. Give a little, unlock a lot.</p>
          <a href="/wallet?topup=true&unlock=creator-tools" className="inline-flex items-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-3 rounded-xl transition">
            Buy Coins to Unlock
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] bg-black text-white relative overflow-hidden lg:flex lg:flex-col lg:bg-[#0a0a0a]">
      <video ref={guestVideoRef} autoPlay playsInline muted style={{ position: "absolute", width: "320px", height: "180px", opacity: 0, pointerEvents: "none", top: 0, left: 0, zIndex: -1 }} />
      <audio ref={guestAudioRef} autoPlay style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none", top: 0, left: 0 }} />

      {showProductMenu && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
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

      {/* Mobile FaceTime-style layout */}
      {!isDesktop && (
      <div className="absolute inset-0">
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: isFrontCamera && !isScreenSharing ? "scaleX(-1)" : "none" }} />
        {isLive && (guestConnected || isScreenSharing) && <video ref={canvasPreviewRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover z-10 bg-black" style={{ transform: "none" }} />}
        {isLive && guestConnected && (
          <div className="absolute left-4 top-[52%] z-30 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-black/45 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-2 py-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                {connectedGuestAvatar ? (
                  <img src={connectedGuestAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{(connectedGuestName || "G").charAt(0).toUpperCase()}</div>
                )}
              </div>
              <span className="text-xs font-bold text-white max-w-[110px] truncate">{connectedGuestName || "Guest"}</span>
              {connectedGuestUserId && connectedGuestUserId !== userId && (
                <button
                  onClick={toggleFollowGuest}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${isFollowingGuest ? "bg-white/15 text-white border border-white/15" : "bg-[#E53945] text-white"}`}
                >
                  {isFollowingGuest ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 z-20 pt-[calc(env(safe-area-inset-top)+12px)] px-4 pb-10 bg-gradient-to-b from-black/70 via-black/20 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 bg-black/45 border border-white/10 rounded-full px-3 py-1.5">
              {isLive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#E53945] animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-white">Live</span>
                  <span className="text-[11px] font-medium text-white/70 tabular-nums">{formatTime(streamTime)}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-white/80">Preview</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {guestConnected && (
                <div className="bg-green-500/25 border border-green-500/40 text-green-300 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <UserCheck size={13} /> {connectedGuestName || "Guest"}
                </div>
              )}
              {isLive && (
                <button onClick={() => { setShowInviteSheet(true); setShowMobileChat(false); }} className="w-10 h-10 rounded-full bg-black/45 border border-white/10 flex items-center justify-center text-white/90" aria-label="Invite participant">
                  <UserPlus size={18} />
                </button>
              )}
              <button onClick={() => (isLive ? stopStream() : router.push("/creator-dashboard"))} className="w-10 h-10 rounded-full bg-black/45 border border-white/10 flex items-center justify-center text-white/90" aria-label="Close">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {joinRequest && (
          <div className="absolute top-[calc(env(safe-area-inset-top)+72px)] left-4 right-4 z-30 bg-[#1c1c1e]/95 backdrop-blur-xl border border-[#E53945]/30 p-4 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              {joinRequest.viewer_avatar ? (
                <img src={joinRequest.viewer_avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#E53945] flex items-center justify-center text-sm font-bold text-white">{joinRequest.viewer_name.charAt(0).toUpperCase()}</div>
              )}
              <p className="text-sm font-bold"><span className="text-[#E53945]">{joinRequest.viewer_name}</span> wants to join!</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleJoinResponse("approved")} className="flex-1 bg-green-500 text-white font-bold py-2 rounded-full text-sm">Approve</button>
              <button onClick={() => handleJoinResponse("denied")} className="flex-1 bg-red-500/20 text-red-400 font-bold py-2 rounded-full text-sm border border-red-500/20">Deny</button>
            </div>
          </div>
        )}

        {showMobileChat && isLive && liveInputId && (
          <div className="absolute inset-x-0 bottom-0 z-40 h-[55dvh] bg-[#111114]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-bold">Live Chat</h3>
              <button onClick={() => setShowMobileChat(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X size={16} /></button>
            </div>
            <LiveChat liveInputId={liveInputId} className="flex-1 min-h-0" />
          </div>
        )}

        {showInviteSheet && isLive && (
          <div className="absolute inset-x-0 bottom-0 z-40 h-[55dvh] bg-[#111114]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[28px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-bold">Invite to Live</h3>
              <button onClick={() => { setShowInviteSheet(false); setInviteQuery(""); setInviteResults([]); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={inviteQuery}
                  onChange={(e) => setInviteQuery(e.target.value)}
                  placeholder="Search users to invite..."
                  className="w-full h-11 bg-white/[0.06] border border-white/10 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {inviteQuery.trim().length < 2 ? (
                <p className="text-sm text-white/45 text-center py-8">Type at least 2 characters to search.</p>
              ) : inviteSearching ? (
                <p className="text-sm text-white/45 text-center py-8">Searching...</p>
              ) : inviteResults.length === 0 ? (
                <p className="text-sm text-white/45 text-center py-8">No users found.</p>
              ) : inviteResults.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between gap-3 bg-white/[0.04] border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/70">{String(u.display_name || u.username || "U").charAt(0).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.display_name || u.username || "User"}</p>
                      <p className="text-xs text-white/45 truncate">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendInvite(u)}
                    disabled={!!u.invited || inviteSending === u.user_id}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ${u.invited ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-[#E53945] text-white hover:bg-[#d12e39] disabled:opacity-60"}`}
                  >
                    {u.invited ? "Invited" : inviteSending === u.user_id ? "..." : "Invite"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={chatScrollRef} className="absolute bottom-[170px] left-0 w-[78%] max-w-[340px] h-[40%] px-4 overflow-y-auto pointer-events-auto z-20 space-y-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {floatingComments.map((c) => (
            <div key={c.id} className="max-w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="inline-flex max-w-full items-start gap-2 rounded-2xl bg-black/35 backdrop-blur-sm border border-white/10 px-3 py-2 shadow-lg">
                {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border border-white/15" /> : <div className="w-6 h-6 rounded-full bg-[#E53945] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white">{String(c.display_name || "U").charAt(0).toUpperCase()}</div>}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white/80 leading-tight truncate">{c.display_name}</p>
                  <p className="text-[13px] text-white leading-snug break-words [overflow-wrap:anywhere]">{c.type === "tip" && c.metadata?.amount ? `Sent a $${c.metadata.amount} tip!` : c.type === "like" ? "❤️ liked the stream" : c.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-16 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
          <div className="flex items-center justify-center gap-2 mb-3">
            <button onClick={() => setLiveVisibility("public")} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border backdrop-blur-xl transition ${liveVisibility === "public" ? "bg-white/15 border-white/25 text-white" : "bg-black/20 border-white/10 text-white/60"}`}>
              <span className="inline-flex items-center gap-1"><Globe size={12} /> Everyone</span>
            </button>
            <button onClick={() => setLiveVisibility("subscribers")} className={`px-3 py-1.5 rounded-full text-[11px] font-bold border backdrop-blur-xl transition ${liveVisibility === "subscribers" ? "bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#D4AF37]" : "bg-black/20 border-white/10 text-white/60"}`}>
              <span className="inline-flex items-center gap-1"><Lock size={12} /> Subs</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-xl transition ${isMuted ? "bg-red-500/25 border-red-400/40 text-red-300" : "bg-white/12 border-white/15 text-white"}`} aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-xl transition ${isVideoOff ? "bg-red-500/25 border-red-400/40 text-red-300" : "bg-white/12 border-white/15 text-white"}`} aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}>
              {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>

            {!isLive ? (
              <button onClick={startStream} disabled={loading} className="flex-1 max-w-[180px] h-14 rounded-full bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-60 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(229,57,69,0.45)] border border-red-300/20">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Radio size={20} />}
                {loading ? "Starting..." : "Go Live"}
              </button>
            ) : (
              <button onClick={stopStream} disabled={loading} className="flex-1 max-w-[180px] h-14 rounded-full bg-white/15 hover:bg-white/20 disabled:opacity-60 text-red-400 font-bold text-[15px] flex items-center justify-center gap-2 backdrop-blur-xl border border-white/15">
                {loading ? <Loader2 size={20} className="animate-spin" /> : <StopCircle size={20} />}
                {loading ? "Stopping..." : "End Live"}
              </button>
            )}

            <button onClick={flipCamera} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/12 border border-white/15 text-white backdrop-blur-xl transition" aria-label="Flip camera">
              <SwitchCamera size={20} />
            </button>
            <button onClick={() => { if (isLive && liveInputId) { setShowMobileChat(v => !v); setShowInviteSheet(false); } else { openProductMenu(); } }} className={`w-12 h-12 rounded-full flex items-center justify-center border backdrop-blur-xl transition ${isLive ? "bg-white/12 border-white/15 text-white" : "bg-[#E53945]/20 border-[#E53945]/30 text-[#E53945]"}`} aria-label={isLive ? "Chat" : "Products"}>
              {isLive ? <MessageCircle size={20} /> : <ShoppingBag size={20} />}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Desktop layout */}
      {isDesktop && (
      <div className="flex flex-1 flex-col lg:flex-row w-full overflow-hidden">
        <div className="flex-1 relative bg-black flex items-center justify-center p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="relative w-full h-full rounded-3xl overflow-hidden bg-[#0f0f12] shadow-2xl border border-white/10">
            <video autoPlay muted playsInline className="w-full h-full object-cover absolute inset-0" style={{ transform: isFrontCamera && !isScreenSharing ? "scaleX(-1)" : "none" }} ref={(el) => { if (el) { (videoRef as any).current = el; if (stream && el.srcObject !== stream) el.srcObject = stream; } }} />
            {isLive && (guestConnected || isScreenSharing) && (
              <video ref={canvasPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover absolute inset-0 z-10 bg-black" style={{ transform: "none" }} />
            )}
            {isLive && guestConnected && (
              <div className="absolute left-4 top-[52%] z-30 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 bg-black/45 backdrop-blur-md border border-white/10 rounded-full pl-1 pr-2 py-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                    {connectedGuestAvatar ? (
                      <img src={connectedGuestAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{(connectedGuestName || "G").charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white max-w-[110px] truncate">{connectedGuestName || "Guest"}</span>
                  {connectedGuestUserId && connectedGuestUserId !== userId && (
                    <button
                      onClick={toggleFollowGuest}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${isFollowingGuest ? "bg-white/15 text-white border border-white/15" : "bg-[#E53945] text-white"}`}
                    >
                      {isFollowingGuest ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <div className="w-8 h-8 rounded-full bg-[#E53945] flex items-center justify-center text-sm font-bold text-white border border-white/20">
                {isLive ? "L" : "P"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">My Broadcast</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                  </div>
                  <span className="text-xs font-mono text-white/80">{formatTime(streamTime)}</span>
                </div>
              </div>
            </div>

            {guestConnected && (
              <div className="absolute top-4 right-4 z-20 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <UserCheck size={14} /> {connectedGuestName || "Guest"} Connected
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/60 border border-white/10 p-2 rounded-full shadow-2xl">
              <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
              <button onClick={toggleScreenShare} className={`w-12 h-12 rounded-full flex items-center justify-center transition ${isScreenSharing ? "bg-blue-500/20 text-blue-500" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              </button>
              <button onClick={togglePiP} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition">
                <PictureInPicture size={20} />
              </button>
              <button onClick={openProductMenu} className="w-12 h-12 rounded-full flex items-center justify-center bg-[#E53945]/20 hover:bg-[#E53945]/30 text-[#E53945] transition">
                <ShoppingBag size={20} />
              </button>
              <div className="w-px h-8 bg-white/20 mx-1" />
              <div className="flex bg-black/50 border border-white/10 rounded-full p-1 shadow-inner">
                <button onClick={() => setLiveVisibility("public")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition ${liveVisibility === "public" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"}`}>
                  <Globe size={14} /> <span className="hidden sm:inline">Everyone</span>
                </button>
                <button onClick={() => setLiveVisibility("subscribers")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition ${liveVisibility === "subscribers" ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-sm" : "text-white/50 hover:text-white"}`}>
                  <Lock size={14} /> <span className="hidden sm:inline">Subs Only</span>
                </button>
              </div>
              <div className="w-px h-8 bg-white/20 mx-1" />
              {!isLive ? (
                <button onClick={startStream} disabled={loading} className="bg-[#E53945] hover:bg-[#d12e39] text-white font-bold px-6 py-2.5 rounded-full transition flex items-center gap-2">
                  <Radio size={18} /> {loading ? "Starting..." : "Go Live"}
                </button>
              ) : (
                <button onClick={stopStream} disabled={loading} className="bg-white/10 hover:bg-white/20 border border-white/10 text-red-500 font-bold px-6 py-2.5 rounded-full transition flex items-center gap-2">
                  <StopCircle size={18} /> End Stream
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[380px] h-[40vh] lg:h-full flex flex-col shrink-0">
          {isLive && liveInputId ? (
             <>
               {joinRequest && (
                 <div className="bg-[#1c1c1e] border border-[#E53945]/30 p-4 m-4 rounded-xl shadow-lg animate-in slide-in-from-bottom-2 shrink-0 z-40">
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
               <LiveChat liveInputId={liveInputId} className="flex-1" />
             </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-l border-white/5 bg-[#18181b]">
              <Radio size={48} className="text-white/20 mb-4" />
              <h2 className="text-xl font-bold mb-2">Ready to broadcast</h2>
              <p className="text-white/50 text-sm">When you go live, your chat and viewer interactions will appear here.</p>
            </div>
          )}
        </div>
      </div>
      )}
    </main>
  );
}
