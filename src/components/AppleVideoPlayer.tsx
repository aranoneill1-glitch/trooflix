"use client";

import { useState, useEffect } from "react";
import { getCachedUser } from "@/lib/cache";
import { createPortal } from "react-dom";
import VideoIntro from "@/components/VideoIntro";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";

interface AppleVideoPlayerProps {
  src: string;
  onClose: () => void;
  poster?: string;
  title?: string;
  creatorName?: string;
  creatorPhoto?: string;
  views?: string;
  timeAgo?: string;
  chapters?: { title: string; time: number }[];
  textOverlays?: any[];
  feedVideos?: any[];
}

export default function AppleVideoPlayer({ src, onClose, poster }: AppleVideoPlayerProps) {
  const [mounted, setMounted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [userTier, setUserTier] = useState<"free" | "plus" | "creator">("free");

  useEffect(() => {
    setMounted(true);
    getCachedUser().then(async (u) => {
      if (!u) { setUserTier("free"); return; }
      try {
        const r = await fetch(`/api/profile?user_id=${u.id}`);
        const d = await r.json();
        const raw = String(d.profile?.tier || "free").toLowerCase();
        let normalized: "free" | "plus" | "creator" = "free";
        if (raw === "creator" || raw === "podcaster" || raw === "pro") normalized = "creator";
        else if (raw === "plus" || raw === "pass" || raw === "troopass") normalized = "plus";
        if (normalized !== "free" && d.profile?.plus_expires_at) {
          if (new Date(d.profile.plus_expires_at) < new Date()) normalized = "free";
        }
        setUserTier(normalized);
      } catch {
        setUserTier("free");
      }
    });
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <CustomVideoPlayer src={src} poster={poster} onClose={onClose} userTier={userTier} isLongForm={true} />
      
      {showIntro && (
        <div className="absolute inset-0 z-[10000]">
          <VideoIntro onDone={() => setShowIntro(false)} />
        </div>
      )}
    </div>,
    document.body
  );
}
