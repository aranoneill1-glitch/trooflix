"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

export default function GuestCoStream({ roomId, localVideoRef }: { roomId: string; localVideoRef?: React.RefObject<HTMLVideoElement | null> }) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    let channel: any;
    let iceQueue: RTCIceCandidateInit[] = [];
    let remoteSet = false;
    let closed = false;
    let signalPoll: any = null;
    let lastSignalId = 0;

    const setupGuest = async () => {
      try {
        const user = await getCachedUser();
        if (!user || closed) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        if (closed) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (localVideoRef?.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        let iceServers: RTCIceServer[] = [
          { urls: "stun:stun.cloudflare.com:3478" },
          { urls: "stun:stun.l.google.com:19302" },
        ];
        try {
          const turnRes = await fetch("/api/live/turn-credentials");
          if (turnRes.ok) {
            const turnData = await turnRes.json();
            if (Array.isArray(turnData.iceServers)) iceServers = turnData.iceServers;
          }
        } catch {}

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onconnectionstatechange = () => {
          console.log("GUEST Connection State:", pc.connectionState);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            supabase.from("webrtc_signals").insert({
              room_id: roomId, sender_id: user.id, type: "candidate", payload: event.candidate
            }).then();
          }
        };

        const handleOffer = async (offerPayload: any) => {
          if (remoteSet || closed) return;
          await pc.setRemoteDescription(new RTCSessionDescription(offerPayload));
          remoteSet = true;

          while (iceQueue.length > 0) {
            const candidate = iceQueue.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await supabase.from("webrtc_signals").insert({
            room_id: roomId, sender_id: user.id, type: "answer", payload: answer
          });
        };

        channel = supabase.channel(`webrtc_${roomId}_${user.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `room_id=eq.${roomId}` }, async (payload) => {
            const signal = payload.new;
            if (!signal || signal.sender_id === user.id) return;

            if (signal.type === "offer") await handleOffer(signal.payload);
            else if (signal.type === "candidate") {
              if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.error);
              else iceQueue.push(signal.payload);
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              const { data } = await supabase.from("webrtc_signals")
                .select("*").eq("room_id", roomId).eq("type", "offer")
                .order("created_at", { ascending: false }).limit(1);
              if (data && data.length > 0) await handleOffer(data[0].payload);
            }
          });

        const pollSignals = async () => {
          try {
            const { data } = await supabase
              .from("webrtc_signals")
              .select("id,sender_id,type,payload")
              .eq("room_id", roomId)
              .gt("id", lastSignalId)
              .order("id", { ascending: true })
              .limit(50);
            for (const signal of data || []) {
              if (typeof signal.id === "number") lastSignalId = Math.max(lastSignalId, signal.id);
              if (!signal || signal.sender_id === user.id) continue;
              if (signal.type === "offer") await handleOffer(signal.payload);
              else if (signal.type === "candidate") {
                if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.error);
                else iceQueue.push(signal.payload);
              }
            }
          } catch {}
        };
        signalPoll = setInterval(pollSignals, 2000);
      } catch (e) {
        console.error("GuestCoStream setup failed", e);
        alert("Could not access camera/microphone to join the live. Please allow permissions and try again.");
      }
    };

    setupGuest();

    return () => {
      closed = true;
      if (signalPoll) clearInterval(signalPoll);
      if (channel) supabase.removeChannel(channel);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, [roomId]);

  return null;
}
