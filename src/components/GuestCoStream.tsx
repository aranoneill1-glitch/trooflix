"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

export default function GuestCoStream({ roomId }: { roomId: string }) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!roomId) return;
    let channel: any;
    let iceQueue: RTCIceCandidateInit[] = [];
    let remoteSet = false;

    const setupGuest = async () => {
      const user = await getCachedUser();
      if (!user) return;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      streamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onconnectionstatechange = () => {
        console.log("GUEST Connection State:", pc.connectionState);
        if (pc.connectionState === "failed") {
          alert("WebRTC failed. Your network might be blocking the connection.");
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          supabase.from("webrtc_signals").insert({
            room_id: roomId, sender_id: user.id, type: "candidate", payload: event.candidate
          }).then();
        }
      };

      const handleOffer = async (offerPayload: any) => {
        if (remoteSet) return;
        await pc.setRemoteDescription(new RTCSessionDescription(offerPayload));
        remoteSet = true;
        
        // Process queued ICE candidates
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

      channel = supabase.channel(`webrtc_${roomId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `room_id=eq.${roomId}` }, async (payload) => {
          const signal = payload.new;
          if (signal.sender_id === user.id) return;

          if (signal.type === "offer") await handleOffer(signal.payload);
          else if (signal.type === "candidate") {
            if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.error);
            else iceQueue.push(signal.payload);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            // Catch any offers that arrived before we connected
            const { data } = await supabase.from("webrtc_signals")
              .select("*").eq("room_id", roomId).eq("type", "offer")
              .order("created_at", { ascending: false }).limit(1);
            if (data && data.length > 0) await handleOffer(data[0].payload);
          }
        });
    };

    setupGuest();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, [roomId, supabase]);

  return null;
}
