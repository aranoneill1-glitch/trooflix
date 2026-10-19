"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const PREVIEW_SECONDS = 10;

export default function PaywallGate({
  children,
  isPodcasterContent,
  contentType,
  videoId,
}: {
  children: (props: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onSeeking: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    onPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  }) => React.ReactNode;
  isPodcasterContent: boolean;
  contentType: string | null;
  videoId: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tier, setTier] = useState<"user" | "pro" | "podcaster" | "loading">("loading");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) {
        setTier("user");
        return;
      }
      try {
        const res = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const d = await res.json();
        const t = d.profile?.tier;
        if (t === "pro" || t === "podcaster") setTier(t);
        else setTier("user");
      } catch {
        setTier("user");
      }
    });
  }, []);

  // Determine if this content is locked for the current viewer
  // Locked only when: podcaster content AND not a reel AND viewer is free user
  const isLocked =
    tier === "user" &&
    isPodcasterContent &&
    contentType !== "Reel";



  const blockVideo = (v: HTMLVideoElement) => {
    v.pause();
    if (!v.dataset.originalSrc) v.dataset.originalSrc = v.src;
    v.removeAttribute("src");
    try { v.load(); } catch {}
    setBlocked(true);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isLocked) return;
    const v = e.currentTarget;
    if (v.currentTime >= PREVIEW_SECONDS) {
      blockVideo(v);
    }
  };

  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isLocked) return;
    const v = e.currentTarget;
    if (v.currentTime >= PREVIEW_SECONDS || !v.src) {
      blockVideo(v);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isLocked) e.preventDefault();
  };

  const handleSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isLocked) return;
    const v = e.currentTarget;
    if (v.currentTime >= PREVIEW_SECONDS) {
      blockVideo(v);
    }
  };

  return (
    <div className="relative">
      {children({
        videoRef,
        onTimeUpdate: handleTimeUpdate,
        onContextMenu: handleContextMenu,
        onSeeking: handleSeeking,
        onPlay: handlePlay,
      })}

      {blocked && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 flex items-center justify-center">
              <Lock size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black mb-2">Preview Ended</h2>
            <p className="text-white/70 text-sm mb-6">
              You've watched the first {PREVIEW_SECONDS} seconds. Upgrade to Pro to watch the full episode.
            </p>
            <Link
              href="/upgrade"
              className="inline-block bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition"
            >
              Upgrade to Pro — $4.99/mo
            </Link>
            <p className="text-xs text-white/40 mt-4">
              Cancel anytime. Includes unlimited reels + podcast access.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
