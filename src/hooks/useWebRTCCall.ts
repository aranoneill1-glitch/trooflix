"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free TURN servers from OpenRelay (100% free, no signup)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended" | "rejected" | "failed";

export type IncomingCall = {
  callId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string | null;
  offer: RTCSessionDescriptionInit;
};

export function useWebRTCCall(userId: string | null) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [peerUserId, setPeerUserId] = useState<string | null>(null);
  const peerUserIdRef = useRef<string | null>(null);
  const [peerName, setPeerName] = useState<string>("");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const callStartTimeRef = useRef<number | null>(null);
  const callRoleRef = useRef<"caller" | "receiver" | null>(null);
  const currentCallIdRef = useRef<string | null>(null);

  // ---- SEND SIGNAL ----
  const sendSignal = useCallback(async (
    callId: string, senderId: string, recipientId: string, signalType: string, signalData: any
  ) => {
    try {
      await fetch("/api/calls/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, senderId, recipientId, signalType, signalData }),
      });
    } catch (e) {
      console.error("sendSignal error:", e);
    }
  }, []);

  // ---- BUILD PEER CONNECTION ----
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    (window as any).__webrtcPc = pc; // Expose for debugging

    // Forward remote tracks
    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      console.log("[WebRTC] 🎵 ontrack fired! Track kind:", event.track.kind);
      
      if (event.streams && event.streams[0]) {
        // Use the stream directly from the event
        setRemoteStream(event.streams[0]);
      } else {
        // Fallback if no stream, create one from the track
        setRemoteStream(new MediaStream([event.track]));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) console.log("[WebRTC] Local ICE candidate:", event.candidate.candidate.slice(0, 40) + "...");
      if (event.candidate && currentCallIdRef.current && userId) {
        const peer = peerUserIdRef.current;
        if (peer) {
          sendSignal(
            currentCallIdRef.current, userId, peer, "ice", event.candidate.toJSON()
          );
        }
      }
    };

    
    (window as any).__activePc = pc;
    let lastInBytes = 0;
    let lastOutBytes = 0;
    setInterval(async () => {
      if (pc.connectionState === "connected") {
        const stats = await pc.getStats();
        let inB = 0; let outB = 0;
        stats.forEach((r) => {
          if (r.type === "inbound-rtp" && r.kind === "audio") inB += r.bytesReceived;
          if (r.type === "outbound-rtp" && r.kind === "audio") outB += r.bytesSent;
        });
        if (inB !== lastInBytes || outB !== lastOutBytes) {
          console.log(`[WebRTC STATS] 🟢 In: ${inB} bytes | 🔵 Out: ${outB} bytes`);
          lastInBytes = inB; lastOutBytes = outB;
        }
      }
    }, 1500);

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] 🔌 Connection state:", pc.connectionState, "| iceState:", pc.iceConnectionState, "| gatherState:", pc.iceGatheringState);
      if (pc.connectionState === "connected") {
        // Sample stats 3 times to see if bytes are flowing
        let sampleCount = 0;
        const statsInterval = setInterval(async () => {
          try {
            const stats = await pc.getStats();
            let outboundBytes = 0;
            let inboundBytes = 0;
            let packetsSent = 0;
            let packetsReceived = 0;
            stats.forEach((report) => {
              if (report.type === "outbound-rtp" && report.kind === "audio") {
                outboundBytes = report.bytesSent || 0;
                packetsSent = report.packetsSent || 0;
              }
              if (report.type === "inbound-rtp" && report.kind === "audio") {
                inboundBytes = report.bytesReceived || 0;
                packetsReceived = report.packetsReceived || 0;
              }
            });
            console.log(`[WebRTC STATS] 🔵 Out audio: ${outboundBytes} bytes (${packetsSent} pkts) | 🟢 In audio: ${inboundBytes} bytes (${packetsReceived} pkts)`);
            sampleCount++;
            if (sampleCount >= 6) clearInterval(statsInterval);
          } catch (e) {}
        }, 1000);
      }
      // Accept BOTH "connected" AND ICE "connected/completed" as success
      if (pc.connectionState === "connected" || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        if (!callStartTimeRef.current) {
          callStartTimeRef.current = Date.now();
          console.log("[WebRTC] ⏱️  Start timer (Connection)");
        }
        setStatus("connected");
      }
      else if (pc.connectionState === "failed") setStatus("failed");
      else if (pc.connectionState === "disconnected") {
        setTimeout(() => {
          if (pc.connectionState === "disconnected") setStatus("failed");
        }, 5000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        if (!callStartTimeRef.current) {
          callStartTimeRef.current = Date.now();
          console.log("[WebRTC] ⏱️  Start timer (ICE)");
        }
        console.log("[WebRTC] ✅ ICE connected - forcing status to connected");
        setStatus("connected");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [userId, peerUserId, sendSignal]);

  // ---- CLEANUP ----
  const cleanup = useCallback(() => {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((t) => t.stop());
        remoteStreamRef.current = null;
      }
    } catch (e) {
      console.warn("cleanup error:", e);
    }
    setRemoteStream(null);
    setMuted(false);
    setCallId(null);
    setPeerUserId(null);
    peerUserIdRef.current = null;
    setPeerName("");
    setPeerAvatar(null);
    setIncoming(null);
    currentCallIdRef.current = null;
    window.dispatchEvent(new CustomEvent("call-ended"));
  }, []);

  // ---- START CALL (caller) ----
  const startCall = useCallback(async (
    recipientId: string, recipientName: string, recipientAvatar: string | null
  ) => {
    if (!userId) return;
    if (status !== "idle") return;

    // Set iOS audio session to play-and-record BEFORE mic access
    try {
      const nav: any = navigator;
      if (nav.audioSession) {
        nav.audioSession.type = "play-and-record";
        console.log("[WebRTC] 🍎 audioSession set before getUserMedia");
      }
    } catch (e) {
      console.log("[WebRTC] audioSession setup failed:", e);
    }

    setPeerUserId(recipientId);
    peerUserIdRef.current = recipientId;
    setPeerName(recipientName);
    setPeerAvatar(recipientAvatar);
    setStatus("calling");

    const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    currentCallIdRef.current = newCallId;
    setCallId(newCallId);

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      console.log("[WebRTC] 🎤 Local mic acquired:", JSON.stringify(localStream.getAudioTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        state: t.readyState,
      })), null, 2));
      localStreamRef.current = localStream;

      const pc = createPeerConnection();
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendSignal(newCallId, userId, recipientId, "offer", offer);
    } catch (e: any) {
      console.error("startCall error:", e);
      setStatus("failed");
      alert("Could not access your microphone. Check browser permissions.");
    }
  }, [userId, status, createPeerConnection, sendSignal]);

  // ---- ACCEPT INCOMING ----
  const acceptCall = useCallback(async () => {
    if (!incoming || !userId) return;

    // Set iOS audio session to play-and-record BEFORE mic access
    try {
      const nav: any = navigator;
      if (nav.audioSession) {
        nav.audioSession.type = "play-and-record";
        console.log("[WebRTC] 🍎 audioSession set before accept");
      }
    } catch (e) {
      console.log("[WebRTC] audioSession setup failed:", e);
    }
    const { callId: incomingCallId, fromUserId, fromName, fromAvatar, offer } = incoming;
    setIncoming(null);
    setPeerUserId(fromUserId);
    peerUserIdRef.current = fromUserId;
    setPeerName(fromName);
    setPeerAvatar(fromAvatar);
    currentCallIdRef.current = incomingCallId;
    setCallId(incomingCallId);
    setStatus("ringing");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      console.log("[WebRTC] 🎤 Callee mic acquired:", JSON.stringify(localStream.getAudioTracks().map((t: MediaStreamTrack) => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        state: t.readyState,
      })), null, 2));
      localStreamRef.current = localStream;

      const pc = createPeerConnection();
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      setStatus("connected");

      // Drain pending ICE
      for (const candidate of pendingIceCandidates.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
      pendingIceCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendSignal(incomingCallId, userId, fromUserId, "answer", answer);
    } catch (e: any) {
      console.error("acceptCall error:", e);
      setStatus("failed");
      alert("Could not access your microphone.");
    }
  }, [incoming, userId, createPeerConnection, sendSignal]);

  // ---- REJECT INCOMING ----
  const logCompletedCall = useCallback(async (finalStatus: 'completed' | 'unanswered' | 'declined', explicitCallerId?: string, explicitReceiverId?: string) => {
    let cId = explicitCallerId;
    let rId = explicitReceiverId;
    
    if (!cId || !rId) {
      const role = callRoleRef.current;
      const currentPeer = peerUserIdRef.current;
      if (!role || !userId || !currentPeer) {
        console.warn("[WebRTC] Cannot log call, missing user IDs", { role, userId, currentPeer });
        return;
      }
      cId = role === "caller" ? userId : currentPeer;
      rId = role === "caller" ? currentPeer : userId;
    }

    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;

    console.log("[WebRTC] 📞 Logging call:", { status: finalStatus, caller: cId, receiver: rId, duration });

    try {
      await fetch("/api/calls/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerId: cId, receiverId: rId, status: finalStatus, duration }),
      });
      console.log("[WebRTC] ✅ Call logged successfully");
    } catch (e) {
      console.error("[WebRTC] ❌ Failed to log call", e);
    }
  }, [userId]);

  const rejectCall = useCallback(async () => {
    if (!incoming || !userId) return;
    await sendSignal(incoming.callId, userId, incoming.fromUserId, "reject", null);
    
    // Force log the missed call
    await logCompletedCall('unanswered', incoming.fromUserId, userId);
    
    setIncoming(null);
    cleanup();
    setStatus("idle");
  }, [incoming, userId, sendSignal, cleanup, logCompletedCall]);

  const endCall = useCallback(async () => {
    const currentCallId = currentCallIdRef.current;
    const currentPeer = peerUserIdRef.current;
    const role = callRoleRef.current;
    
    if (currentCallId && userId && currentPeer) {
      await sendSignal(currentCallId, userId, currentPeer, "hangup", null);
    }
    
    let cId, rId;
    if (role && userId && currentPeer) {
      cId = role === "caller" ? userId : currentPeer;
      rId = role === "caller" ? currentPeer : userId;
    }
    
    const status = callStartTimeRef.current ? 'completed' : 'unanswered';
    await logCompletedCall(status, cId, rId);
    
    cleanup();
    setStatus("idle");
  }, [userId, sendSignal, cleanup, logCompletedCall]);

  // ---- TOGGLE MUTE ----
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMuted(!audioTrack.enabled);
    }
  }, []);

  // ---- SUBSCRIBE TO REALTIME ----
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channelSuffix = Math.random().toString(36).slice(2, 8);
    const channel = supabase
      .channel(`webrtc:${userId}:${channelSuffix}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signals",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload: any) => {
          const row = payload.new;
          console.log("[WebRTC] Signal received:", row?.signal_type, "from", row?.sender_id, "to", row?.recipient_id);
          if (!row) return;
          const { call_id, sender_id, signal_type, signal_data } = row;

          // Ignore signals from ourselves
          if (sender_id === userId) return;

          if (signal_type === "offer") {
            // Incoming call
            if (status !== "idle") {
              // Already in a call — auto-reject
              await sendSignal(call_id, userId, sender_id, "reject", null);
              return;
            }
            // Fetch caller profile for name/avatar
            try {
              const res = await fetch(`/api/profile?user_id=${sender_id}`);
              const d = await res.json();
              const name = d.profile?.display_name || d.profile?.username || "Someone";
              const avatar = d.profile?.avatar_url || null;
              setIncoming({ callId: call_id, fromUserId: sender_id, fromName: name, fromAvatar: avatar, offer: signal_data });
            } catch {
              setIncoming({ callId: call_id, fromUserId: sender_id, fromName: "Someone", fromAvatar: null, offer: signal_data });
            }
          } else if (signal_type === "answer") {
            console.log("[WebRTC] CALLER received answer signal");
            const pc = pcRef.current;
            console.log("[WebRTC] Caller pc state:", pc?.signalingState, "| connectionState:", pc?.connectionState);
            if (pc && pc.signalingState !== "stable") {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
                console.log("[WebRTC] ✅ Caller remote description set");
                // Drain pending ICE
                for (const candidate of pendingIceCandidates.current) {
                  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
                }
                pendingIceCandidates.current = [];
                console.log("[WebRTC] Drained pending ICE");
                // Force status to connected once we have the answer
                setStatus("connected");
              } catch (e) {
                console.error("[WebRTC] ❌ setRemoteDescription(answer) failed:", e);
              }
            } else {
              console.warn("[WebRTC] ⚠️ Skipped answer - pc null or already stable. pc:", !!pc, "state:", pc?.signalingState);
            }
          } else if (signal_type === "ice") {
            console.log("[WebRTC] ICE candidate received. Has remote desc:", !!pcRef.current?.remoteDescription);
            const pc = pcRef.current;
            if (pc && pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(signal_data)); console.log("[WebRTC] ICE added"); } catch(e) { console.error("[WebRTC] ICE add failed:", e); }
            } else {
              pendingIceCandidates.current.push(signal_data);
              console.log("[WebRTC] ICE queued, pending:", pendingIceCandidates.current.length);
            }
          } else if (signal_type === "hangup" || signal_type === "reject") {
            const finalStatus = signal_type === "reject" ? "unanswered" : (callStartTimeRef.current ? "completed" : "unanswered");
            await logCompletedCall(finalStatus);
            if (signal_type === "reject") setStatus("rejected");
            else setStatus("ended");
            setTimeout(() => {
              cleanup();
              setStatus("idle");
            }, 1500);
          }
        }
      )
      .subscribe((status) => {
        console.log("[WebRTC] Subscription status:", status, "for user:", userId);
      });

    channelRef.current = channel;

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      channelRef.current = null;
    };
  }, [userId, status, sendSignal, cleanup, logCompletedCall]);

  return {
    status,
    incoming,
    remoteStream,
    muted,
    peerName,
    peerAvatar,
    callId,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
