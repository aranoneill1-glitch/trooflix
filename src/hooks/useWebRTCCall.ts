"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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
  const [peerName, setPeerName] = useState<string>("");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
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
    // Force audio m-line to be negotiated
    pc.addTransceiver("audio", { direction: "sendrecv" });
    (window as any).__webrtcPc = pc; // Expose for debugging stats

    // Forward remote tracks
    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      console.log("[WebRTC] 🎵 ontrack fired! Track kind:", event.track.kind, "| Streams:", event.streams.length);
      
      // Add the new track to our remote stream
      const incomingTrack = event.track;
      // Remove any existing track of the same kind (avoid duplicates)
      remote.getTracks().forEach((t) => {
        if (t.kind === incomingTrack.kind && t.id !== incomingTrack.id) {
          remote.removeTrack(t);
        }
      });
      remote.addTrack(incomingTrack);
      
      console.log("[WebRTC] Track added. Remote stream now has:", remote.getTracks().map(t => t.kind));
      
      // Force re-render by creating new stream reference each time
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) console.log("[WebRTC] Local ICE candidate:", event.candidate.candidate.slice(0, 40) + "...");
      if (event.candidate && currentCallIdRef.current && userId) {
        const peer = peerUserId;
        if (peer) {
          sendSignal(
            currentCallIdRef.current, userId, peer, "ice", event.candidate.toJSON()
          );
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] 🔌 Connection state:", pc.connectionState, "| iceState:", pc.iceConnectionState, "| gatherState:", pc.iceGatheringState);
      // Accept BOTH "connected" AND ICE "connected/completed" as success
      if (pc.connectionState === "connected" || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
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
    setPeerName("");
    setPeerAvatar(null);
    setIncoming(null);
    currentCallIdRef.current = null;
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
  const rejectCall = useCallback(async () => {
    if (!incoming || !userId) return;
    await sendSignal(incoming.callId, userId, incoming.fromUserId, "reject", null);
    setIncoming(null);
    cleanup();
    setStatus("idle");
  }, [incoming, userId, sendSignal, cleanup]);

  // ---- END CALL ----
  const endCall = useCallback(async () => {
    if (callId && userId && peerUserId) {
      await sendSignal(callId, userId, peerUserId, "hangup", null);
    }
    cleanup();
    setStatus("idle");
  }, [callId, userId, peerUserId, sendSignal, cleanup]);

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
  }, [userId, status, sendSignal, cleanup]);

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
