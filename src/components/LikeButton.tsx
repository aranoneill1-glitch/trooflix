"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// --- Global liked IDs cache (per-user) ---
let cachedLikedIds: number[] | null = null;
let cachedUserId: string | null | undefined = undefined;
let inflight: Promise<number[]> | null = null;
const listeners = new Set<(ids: number[]) => void>();

// --- Global like counts cache (all users) ---
let cachedCounts: Record<number, number> | null = null;
let countsInflight: Promise<Record<number, number>> | null = null;
const countListeners = new Set<(counts: Record<number, number>) => void>();

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

async function fetchLikedIds(): Promise<number[]> {
  if (cachedLikedIds) return cachedLikedIds;
  if (inflight) return inflight;

  inflight = (async () => {
    const userId = await getUserId();
    if (!userId) {
      inflight = null;
      return [];
    }
    const r = await fetch(`/api/likes?user_id=${userId}`);
    const d = await r.json();
    const ids = Array.isArray(d.ids) ? d.ids : [];
    cachedLikedIds = ids;
    inflight = null;
    listeners.forEach((fn) => fn(ids));
    return ids;
  })();

  return inflight;
}

async function fetchCounts(): Promise<Record<number, number>> {
  if (cachedCounts) return cachedCounts;
  if (countsInflight) return countsInflight;

  countsInflight = fetch("/api/like-counts")
    .then((r) => r.json())
    .then((d) => {
      const counts = d.counts && typeof d.counts === "object" ? d.counts : {};
      cachedCounts = counts;
      countsInflight = null;
      countListeners.forEach((fn) => fn(counts));
      return counts;
    })
    .catch(() => {
      countsInflight = null;
      return {};
    });

  return countsInflight;
}

function setLikedIds(ids: number[]) {
  cachedLikedIds = ids;
  listeners.forEach((fn) => fn(ids));
}

function setCount(videoId: number, value: number) {
  if (!cachedCounts) cachedCounts = {};
  cachedCounts[videoId] = value;
  countListeners.forEach((fn) => fn(cachedCounts!));
}

export default function LikeButton({
  videoId,
  size = 20,
  showCount = true,
}: {
  videoId: number;
  size?: number;
  showCount?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCountState] = useState<number>(0);
  const [checking, setChecking] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);

  // Subscribe to liked state
  useEffect(() => {
    let mounted = true;
    const onUpdate = (ids: number[]) => {
      if (mounted) setLiked(ids.includes(videoId));
    };
    listeners.add(onUpdate);
    fetchLikedIds().then((ids) => {
      if (mounted) {
        setLiked(ids.includes(videoId));
        setChecking(false);
      }
    });
    return () => {
      mounted = false;
      listeners.delete(onUpdate);
    };
  }, [videoId]);

  // Subscribe to counts
  useEffect(() => {
    let mounted = true;
    const onUpdate = (counts: Record<number, number>) => {
      if (mounted) setCountState(counts[videoId] ?? 0);
    };
    countListeners.add(onUpdate);
    fetchCounts().then((counts) => {
      if (mounted) setCountState(counts[videoId] ?? 0);
    });
    return () => {
      mounted = false;
      countListeners.delete(onUpdate);
    };
  }, [videoId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const userId = await getUserId();
    if (!userId) {
      setShowSignIn(true);
      return;
    }

    const wasLiked = liked;
    const newLiked = !wasLiked;
    const newCount = wasLiked ? Math.max(0, count - 1) : count + 1;

    // Optimistic updates
    setLiked(newLiked);
    setCountState(newCount);
    setCount(videoId, newCount);

    const currentIds = cachedLikedIds || [];
    setLikedIds(
      wasLiked
        ? currentIds.filter((id) => id !== videoId)
        : [...currentIds, videoId]
    );

    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId }),
    });

    if (!res.ok) {
      // Rollback
      setLiked(wasLiked);
      setCountState(count);
      setCount(videoId, count);
      setLikedIds(currentIds);
    }
  };

  if (checking) {
    return <div style={{ width: size, height: size }} />;
  }

  return (
    <>
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 transition ${
          liked ? "text-red-500" : "text-white/80 hover:text-white"
        }`}
        title={liked ? "Unlike" : "Like"}
      >
        <ThumbsUp size={size} fill={liked ? "currentColor" : "none"} />
        {showCount && count > 0 && (
          <span className="text-sm font-semibold tabular-nums">{count}</span>
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
              <h3 className="text-xl font-bold">Sign in to like</h3>
              <button
                onClick={() => setShowSignIn(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Sign in to like videos. Your likes sync across all devices.
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
