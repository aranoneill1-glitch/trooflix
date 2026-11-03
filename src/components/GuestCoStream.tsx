"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

export default function GuestCoStream({ roomId }: { roomId: string }) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!roomId) return;
    let cleanupChannel: any;

    const setupGuest = async () => {
      const user = await getCachedUser();
      if (!user) return;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }, { urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          supabase.from("webrtc_signals").insert({
            room_id: roomId, sender_id: user.id, type: "candidate", payload: event.candidate
          });
        }
      };

      const fetchMissedOffer = async () => {
        const { data } = await supabase.from("webrtc_signals").select("*").eq("room_id", roomId).eq("type", "offer").order("created_at", { ascending: false }).limit(1);
        if (data && data.length > 0) {
          await pc.setRemoteDescription(new RTCSessionDescription(data[0].payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await supabase.from("webrtc_signals").insert({ room_id: roomId, sender_id: user.id, type: "answer", payload: answer });
        }
      };

      const channel = supabase.channel(`webrtc_${roomId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `room_id=eq.${roomId}` }, async (payload) => {
          const signal = payload.new;
          if (signal.sender_id === user.id) return; // Ignore own signals

          if (signal.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            supabase.from("webrtc_signals").insert({
              room_id: roomId, sender_id: user.id, type: "answer", payload: answer
            });
          } else if (signal.type === "candidate") {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(console.error);
          }
        })
        .subscribe((status) => { if (status === "SUBSCRIBED") fetchMissedOffer(); });
        
      cleanupChannel = channel;
    };

    setupGuest();

    return () => {
      if (cleanupChannel) supabase.removeChannel(cleanupChannel);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, [roomId, supabase]);

  return null; // This component works in the background
}
