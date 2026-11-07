"use client";

import { useEffect, useState } from "react";
import { getCachedUser } from "@/lib/cache";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import IncomingCallBanner from "@/components/IncomingCallBanner";
import CallModal from "@/components/CallModal";

export default function GlobalIncomingCall() {
  const [userId, setUserId] = useState<string | null>(null);
  const [showActive, setShowActive] = useState(false);

  useEffect(() => {
    getCachedUser().then((u) => setUserId(u?.id || null));
  }, []);

  const webrtc = useWebRTCCall(userId);

  useEffect(() => {
    if (webrtc.status === "connected" || webrtc.status === "calling" || webrtc.status === "ringing") {
      setShowActive(true);
    }
  }, [webrtc.status]);

  // Listen for "start-call" custom events from anywhere in the app
  useEffect(() => {
    const handleStartCall = (e: any) => {
      const { recipientId, recipientName, recipientAvatar } = e.detail;
      webrtc.startCall(recipientId, recipientName, recipientAvatar);
      setShowActive(true);
    };
    window.addEventListener("start-call", handleStartCall);
    return () => window.removeEventListener("start-call", handleStartCall);
  }, [webrtc]);

  if (!userId) return null;

  return (
    <>
      <IncomingCallBanner
        incoming={webrtc.incoming}
        onAccept={() => {
          webrtc.acceptCall();
          setShowActive(true);
        }}
        onReject={webrtc.rejectCall}
      />
      {showActive && webrtc.status !== "idle" && (
        <CallModal
          status={webrtc.status as any}
          peerName={webrtc.peerName}
          peerAvatar={webrtc.peerAvatar}
          remoteStream={webrtc.remoteStream}
          muted={webrtc.muted}
          onToggleMute={webrtc.toggleMute}
          onEnd={() => { webrtc.endCall(); setShowActive(false); }}
        />
      )}
    </>
  );
}
