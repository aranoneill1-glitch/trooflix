"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const PREVIEW_SECONDS = 120;

type Access = "loading" | "anon" | "free" | "pass" | "podcaster";

export default function PaywallGate({
  children,
  contentType,
}: {
  children: (props: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onSeeking: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
    onPlay: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  }) => React.ReactNode;
  contentType: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [access, setAccess] = useState<Access>("loading");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    getCachedUser().then(async (u) => {
      if (!u) {
        setAccess("anon");
        return;
      }
      try {
        const res = await fetch(`/api/profile?user_id=${u.id}`, { cache: "no-store" });
        const d = await res.json();
        const profile = d.profile;

        // Podcasters get full access (included in their subscription)
        if (profile?.tier === "podcaster") {
          setAccess("podcaster");
          return;
        }

        // Trooflix Pass holder — check has_pass + grace period
        if (profile?.has_pass === true) {
          const expires = profile?.pass_expires_at;
          if (!expires || new Date(expires) > new Date()) {
            setAccess("pass");
            return;
          }
          // Pass expired — treat as free
          setAccess("free");
          return;
        }

        // Everyone else = free
        setAccess("free");
      } catch {
        setAccess("free");
      }
    });
  }, []);

  // Reels and non-podcast content = always free
  const isPaywalledContent =
    contentType === "Podcast" || contentType === "Documentary";

  const isAnon = access === "anon";
  const isLocked =
    isPaywalledContent &&
    (isAnon || access === "free");

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
    if (v.currentTime >= PREVIEW_SECONDS) blockVideo(v);
  };

  const handlePlay = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isLocked) return;
    const v = e.currentTarget;
    if (v.currentTime >= PREVIEW_SECONDS || !v.src) blockVideo(v);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isLocked) e.preventDefault();
  };

  const handleSeeking = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (!isLocked) return;
    const v = e.currentTarget;
    if (v.currentTime >= PREVIEW_SECONDS) blockVideo(v);
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

      {/* Logged-out sign-in wall */}
      {isAnon && isLocked && !blocked && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 flex items-center justify-center">
              <Lock size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black mb-2">Sign in to watch</h2>
            <p className="text-white/70 text-sm mb-6">
              Sign in or create a free account to preview this podcast.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/login" className="inline-block bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition">
                Sign in
              </Link>
              <Link href="/signup" className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-lg transition">
                Create account
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Preview ended — Trooflix Pass upsell */}
      {blocked && !isAnon && (
        <div className="absolute inset-0 bg-black/95 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600/20 flex items-center justify-center">
              <Lock size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black mb-2">Preview Ended</h2>
            <p className="text-white/70 text-sm mb-6">
              You've watched the first {PREVIEW_SECONDS} seconds. Get the Trooflix Pass to watch the full episode and everything else.
            </p>
            <Link
              href="/upgrade"
              className="inline-block bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition"
            >
              Get Trooflix Pass — $9.99/mo
            </Link>
            <p className="text-xs text-white/40 mt-4">
              Unlimited access to all podcasts, documentaries, and Pro features.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
