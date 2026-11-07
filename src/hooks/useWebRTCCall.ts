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

    // Forward remote tracks
    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
      setRemoteStream(remote);
    };

    pc.onicecandidate = (event) => {
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
      if (pc.connectionState === "connected") setStatus("connected");
      else if (pc.connectionState === "failed") setStatus("failed");
      else if (pc.connectionState === "disconnected") {
        setTimeout(() => {
          if (pc.connectionState === "disconnected") setStatus("failed");
        }, 5000);
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

    setPeerUserId(recipientId);
    setPeerName(recipientName);
    setPeerAvatar(recipientAvatar);
    setStatus("calling");

    const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    currentCallIdRef.current = newCallId;
    setCallId(newCallId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

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
    const { callId: incomingCallId, fromUserId, fromName, fromAvatar, offer } = incoming;
    setIncoming(null);
    setPeerUserId(fromUserId);
    setPeerName(fromName);
    setPeerAvatar(fromAvatar);
    currentCallIdRef.current = incomingCallId;
    setCallId(incomingCallId);
    setStatus("connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

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
            const pc = pcRef.current;
            if (pc && pc.signalingState !== "stable") {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
                // Drain pending ICE
                for (const candidate of pendingIceCandidates.current) {
                  try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
                }
                pendingIceCandidates.current = [];
              } catch (e) {
                console.error("setRemoteDescription(answer) failed", e);
              }
            }
          } else if (signal_type === "ice") {
            const pc = pcRef.current;
            if (pc && pc.remoteDescription) {
              try { await pc.addIceCandidate(new RTCIceCandidate(signal_data)); } catch {}
            } else {
              pendingIceCandidates.current.push(signal_data);
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
