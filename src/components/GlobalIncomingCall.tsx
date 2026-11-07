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

  useEffect(() => {
    const handleStartCall = (e: any) => {
      const { recipientId, recipientName, recipientAvatar, callType } = e.detail;
      webrtc.startCall(recipientId, recipientName, recipientAvatar, callType || "video");
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
        onAccept={() => { webrtc.acceptCall(); setShowActive(true); }}
        onReject={webrtc.rejectCall}
      />
      {showActive && webrtc.status !== "idle" && (
        <CallModal
          status={webrtc.status as any}
          peerName={webrtc.peerName}
          peerAvatar={webrtc.peerAvatar}
          remoteStream={webrtc.remoteStream}
          localStream={webrtc.localStream}
          muted={webrtc.muted}
          videoEnabled={webrtc.videoEnabled}
          hasRemoteVideo={webrtc.hasRemoteVideo}
          facingMode={webrtc.facingMode}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onFlipCamera={webrtc.flipCamera}
          onEnd={() => { webrtc.endCall(); setShowActive(false); }}
        />
      )}
    </>
  );
}
