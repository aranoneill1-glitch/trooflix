"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended" | "rejected" | "failed";
export type CallType = "audio" | "video";
export type FacingMode = "user" | "environment";

export type IncomingCall = {
  callId: string;
  fromUserId: string;
  fromName: string;
  fromAvatar: string | null;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
};

export function useWebRTCCall(userId: string | null) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [callType, setCallType] = useState<CallType>("audio");
  const [callId, setCallId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string>("");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const currentCallIdRef = useRef<string | null>(null);
  const peerUserIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const callRoleRef = useRef<"caller" | "receiver" | null>(null);

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

  const logCompletedCall = useCallback(async (
    finalStatus: "completed" | "unanswered",
    explicitCallerId?: string,
    explicitReceiverId?: string
  ) => {
    let cId = explicitCallerId;
    let rId = explicitReceiverId;

    if (!cId || !rId) {
      const role = callRoleRef.current;
      const currentPeer = peerUserIdRef.current;
      if (!role || !userId || !currentPeer) return;
      cId = role === "caller" ? userId : currentPeer;
      rId = role === "caller" ? currentPeer : userId;
    }

    const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
    console.log("[WebRTC] 📞 Logging call:", { status: finalStatus, caller: cId, receiver: rId, duration });

    try {
      const res = await fetch("/api/calls/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerId: cId, receiverId: rId, status: finalStatus, duration }),
      });
      if (!res.ok) throw new Error(await res.text());
      console.log("[WebRTC] ✅ Call logged");
      window.dispatchEvent(new CustomEvent("call-ended"));
    } catch (e) {
      console.error("[WebRTC] ❌ Failed to log call", e);
    }
  }, [userId]);

  const setRemoteStreamAndDetectVideo = useCallback((stream: MediaStream) => {
    setRemoteStream(stream);
    setHasRemoteVideo(stream.getVideoTracks().length > 0);
  }, []);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const remote = new MediaStream();
    remoteStreamRef.current = remote;

    pc.ontrack = (event) => {
      console.log("[WebRTC] ontrack:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStreamAndDetectVideo(event.streams[0]);
      } else {
        setRemoteStreamAndDetectVideo(new MediaStream([event.track]));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && currentCallIdRef.current && userId && peerUserIdRef.current) {
        sendSignal(currentCallIdRef.current, userId, peerUserIdRef.current, "ice", event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
        setStatus("connected");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
        setStatus("connected");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [userId, sendSignal, setRemoteStreamAndDetectVideo]);

  const cleanup = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach((t) => t.stop()); remoteStreamRef.current = null; }

    setRemoteStream(null);
    setLocalStream(null);
    setMuted(false);
    setVideoEnabled(true);
    setHasRemoteVideo(false);
    setFacingMode("user");
    setCallId(null);
    setPeerName("");
    setPeerAvatar(null);
    setIncoming(null);
    currentCallIdRef.current = null;
    peerUserIdRef.current = null;
    callRoleRef.current = null;
    callStartTimeRef.current = null;
  }, []);

  const startCall = useCallback(async (
    recipientId: string,
    recipientName: string,
    recipientAvatar: string | null,
    type: CallType = "video"
  ) => {
    if (!userId || status !== "idle") return;

    setPeerName(recipientName);
    setPeerAvatar(recipientAvatar);
    setCallType(type);
    setStatus("calling");
    callRoleRef.current = "caller";
    callStartTimeRef.current = null;
    peerUserIdRef.current = recipientId;

    const newCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    currentCallIdRef.current = newCallId;
    setCallId(newCallId);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video" ? { facingMode: "user" } : false,
        });
      } catch (e: any) {
        if (type === "video") {
          console.warn("[WebRTC] Video failed, falling back to audio:", e);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setCallType("audio");
          setVideoEnabled(false);
        } else {
          throw e;
        }
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoEnabled(stream.getVideoTracks().length > 0);

      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(newCallId, userId, recipientId, "offer", offer);
    } catch (e: any) {
      console.error("startCall error:", e);
      setStatus("failed");
      alert("Could not access microphone.");
    }
  }, [userId, status, createPeerConnection, sendSignal]);

  const acceptCall = useCallback(async () => {
    if (!incoming || !userId) return;
    const { callId: incomingCallId, fromUserId, fromName, fromAvatar, offer, callType: incomingType } = incoming;

    setPeerName(fromName);
    setPeerAvatar(fromAvatar);
    setCallType(incomingType);
    currentCallIdRef.current = incomingCallId;
    peerUserIdRef.current = fromUserId;
    setCallId(incomingCallId);
    setStatus("ringing");
    callRoleRef.current = "receiver";
    callStartTimeRef.current = null;
    setIncoming(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: incomingType === "video" ? { facingMode: "user" } : false,
        });
      } catch (e: any) {
        if (incomingType === "video") {
          console.warn("[WebRTC] Video failed, falling back to audio");
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setCallType("audio");
          setVideoEnabled(false);
        } else {
          throw e;
        }
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setVideoEnabled(stream.getVideoTracks().length > 0);

      const pc = createPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      setStatus("connected");

      for (const c of pendingIceCandidates.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingIceCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(incomingCallId, userId, fromUserId, "answer", answer);
    } catch (e: any) {
      console.error("acceptCall error:", e);
      setStatus("failed");
      alert("Could not access microphone.");
    }
  }, [incoming, userId, createPeerConnection, sendSignal]);

  const endCall = useCallback(async () => {
    console.log("[WebRTC] 🛑 End call");
    const currentCallId = currentCallIdRef.current;
    const currentPeer = peerUserIdRef.current;
    if (currentCallId && userId && currentPeer) {
      await sendSignal(currentCallId, userId, currentPeer, "hangup", null);
    }
    const role = callRoleRef.current;
    let cId, rId;
    if (userId && currentPeer) {
      cId = role === "caller" ? userId : currentPeer;
      rId = role === "caller" ? currentPeer : userId;
    }
    await logCompletedCall(callStartTimeRef.current ? "completed" : "unanswered", cId, rId);
    cleanup();
    setStatus("idle");
  }, [userId, sendSignal, cleanup, logCompletedCall]);

  const rejectCall = useCallback(async () => {
    if (!incoming || !userId) return;
    await sendSignal(incoming.callId, userId, incoming.fromUserId, "reject", null);
    await logCompletedCall("unanswered", incoming.fromUserId, userId);
    cleanup();
    setStatus("idle");
  }, [incoming, userId, sendSignal, cleanup, logCompletedCall]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); }
  }, []);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!currentVideoTrack) return;

    const newFacing: FacingMode = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing }, audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
      currentVideoTrack.stop();
      localStreamRef.current.removeTrack(currentVideoTrack);
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(newFacing);
    } catch (e) { console.error("Flip camera failed:", e); }
  }, [facingMode]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const suffix = Math.random().toString(36).slice(2, 8);

    const channel = supabase
      .channel(`webrtc:${userId}:${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `recipient_id=eq.${userId}` },
        async (payload: any) => {
          const row = payload.new;
          if (!row || row.sender_id === userId) return;
          const { call_id, sender_id, signal_type, signal_data } = row;

          if (signal_type === "offer") {
            if (status !== "idle") { await sendSignal(call_id, userId, sender_id, "reject", null); return; }
            const offerHasVideo = (signal_data?.sdp || "").includes("m=video");
            try {
              const res = await fetch(`/api/profile?user_id=${sender_id}`);
              const d = await res.json();
              setIncoming({
                callId: call_id, fromUserId: sender_id,
                fromName: d.profile?.display_name || d.profile?.username || "Someone",
                fromAvatar: d.profile?.avatar_url || null,
                offer: signal_data, callType: offerHasVideo ? "video" : "audio",
              });
            } catch {
              setIncoming({ callId: call_id, fromUserId: sender_id, fromName: "Someone", fromAvatar: null, offer: signal_data, callType: offerHasVideo ? "video" : "audio" });
            }
          } else if (signal_type === "answer") {
            const pc = pcRef.current;
            if (pc && pc.signalingState !== "stable") {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(signal_data));
                for (const c of pendingIceCandidates.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
                pendingIceCandidates.current = [];
                setStatus("connected");
              } catch (e) { console.error("setRemoteDescription failed", e); }
            }
          } else if (signal_type === "ice") {
            const pc = pcRef.current;
            if (pc && pc.remoteDescription) { try { await pc.addIceCandidate(new RTCIceCandidate(signal_data)); } catch {} }
            else { pendingIceCandidates.current.push(signal_data); }
          } else if (signal_type === "hangup" || signal_type === "reject") {
            // No logging here — the initiator already logged it
            if (signal_type === "reject") setStatus("rejected");
            else setStatus("ended");
            setTimeout(() => { cleanup(); setStatus("idle"); }, 1500);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { try { supabase.removeChannel(channel); } catch {} channelRef.current = null; };
  }, [userId, status, sendSignal, cleanup]);

  return {
    status, incoming, remoteStream, localStream, muted, videoEnabled, hasRemoteVideo, facingMode, callType,
    peerName, peerAvatar, callId,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera, flipCamera,
  };
}
