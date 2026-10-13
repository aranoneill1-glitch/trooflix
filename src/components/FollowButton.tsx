"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// Global cache
let cachedIds: number[] | null = null;
let cachedUserId: string | null | undefined = undefined;
let inflight: Promise<number[]> | null = null;
const listeners = new Set<(ids: number[]) => void>();

async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    cachedUserId = user?.id || null;
    return cachedUserId;
  } catch {
    cachedUserId = null;
    return null;
  }
}

async function fetchFollowedIds(): Promise<number[]> {
  if (cachedIds) return cachedIds;
  if (inflight) return inflight;

  inflight = (async () => {
    const userId = await getUserId();
    if (!userId) {
      inflight = null;
      return [];
    }
    const r = await fetch(`/api/follows?user_id=${userId}`);
    const d = await r.json();
    const ids = Array.isArray(d.ids) ? d.ids : [];
    cachedIds = ids;
    inflight = null;
    listeners.forEach((fn) => fn(ids));
    return ids;
  })();

  return inflight;
}

function setFollowedIds(ids: number[]) {
  cachedIds = ids;
  listeners.forEach((fn) => fn(ids));
}

export default function FollowButton({
  creatorId,
  size = 16,
}: {
  creatorId: number;
  size?: number;
}) {
  const [following, setFollowing] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    const onUpdate = (ids: number[]) => {
      if (mounted) setFollowing(ids.includes(creatorId));
    };
    listeners.add(onUpdate);

    fetchFollowedIds().then((ids) => {
      if (mounted) {
        setFollowing(ids.includes(creatorId));
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      listeners.delete(onUpdate);
    };
  }, [creatorId]);

  const toggle = async () => {
    const userId = await getUserId();
    if (!userId) {
      setShowSignIn(true);
      return;
    }

    const wasFollowing = following;
    setFollowing(!wasFollowing);
    const current = cachedIds || [];
    setFollowedIds(
      wasFollowing
        ? current.filter((id) => id !== creatorId)
        : [...current, creatorId]
    );

    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, creatorId }),
    });

    if (!res.ok) {
      setFollowing(wasFollowing);
      setFollowedIds(current);
    }
  };

  if (checking) {
    return (
      <button className="flex items-center gap-2 bg-white/10 text-white/50 px-4 py-1.5 rounded-full text-sm">
        <Plus size={size} /> Follow
      </button>
    );
  }

  return (
    <>
      <button
        onClick={toggle}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition ${
          following
            ? "bg-white/10 hover:bg-white/20 text-white"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        {following ? (
          <>
            <Check size={size} /> Following
          </>
        ) : (
          <>
            <Plus size={size} /> Follow
          </>
        )}
      </button>

      {showSignIn && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowSignIn(false)}
        >
          <div
            className="bg-[#141418] border border-white/10 rounded-lg p-8 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">Sign in to follow</h3>
              <button
                onClick={() => setShowSignIn(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Sign in to follow podcasters. Your follows sync across all devices.
            </p>
            <div className="flex gap-3">
              <a
                href="/login"
                className="flex-1 text-center bg-red-600 hover:bg-red-500 font-semibold py-2.5 rounded transition"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="flex-1 text-center bg-white/10 hover:bg-white/20 font-semibold py-2.5 rounded transition"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
