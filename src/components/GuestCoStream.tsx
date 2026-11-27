"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

export default function GuestCoStream({ roomId, hostUserId, localVideoRef }: { roomId: string; hostUserId?: string; localVideoRef?: React.RefObject<HTMLVideoElement | null> }) {
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
    const seenSignals = new Set<string>();

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
              call_id: roomId, sender_id: user.id, recipient_id: hostUserId || user.id, signal_type: "candidate", signal_data: event.candidate
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
            call_id: roomId, sender_id: user.id, recipient_id: hostUserId || user.id, signal_type: "answer", signal_data: answer
          });
        };

        channel = supabase.channel(`webrtc_${roomId}_${user.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "webrtc_signals", filter: `call_id=eq.${roomId}` }, async (payload) => {
            const signal = payload.new as any;
            if (!signal || signal.sender_id === user.id) return;

            if (signal.signal_type === "offer") await handleOffer(signal.signal_data);
            else if (signal.signal_type === "candidate") {
              if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data)).catch(console.error);
              else iceQueue.push(signal.signal_data);
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              const { data } = await supabase.from("webrtc_signals")
                .select("*").eq("call_id", roomId).eq("signal_type", "offer")
                .order("created_at", { ascending: false }).limit(1);
              if (data && data.length > 0) await handleOffer((data[0] as any).signal_data);
            }
          });

        const pollSignals = async () => {
          try {
            const { data } = await supabase
              .from("webrtc_signals")
              .select("id,sender_id,signal_type,signal_data")
              .eq("call_id", roomId)
              .order("created_at", { ascending: true })
              .limit(100);
            for (const signal of (data || []) as any[]) {
              const sid = String(signal.id);
              if (seenSignals.has(sid)) continue;
              seenSignals.add(sid);
              if (!signal || signal.sender_id === user.id) continue;
              if (signal.signal_type === "offer") await handleOffer(signal.signal_data);
              else if (signal.signal_type === "candidate") {
                if (remoteSet) await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data)).catch(console.error);
                else iceQueue.push(signal.signal_data);
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
