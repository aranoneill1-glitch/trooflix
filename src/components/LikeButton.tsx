"use client";

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

// --- Global external like trigger (used by feed double-tap) ---
const likeBusListeners = new Map<number, Set<() => void>>();
export function externalLike(videoId: number) {
  const set = likeBusListeners.get(videoId);
  if (set) set.forEach((fn) => fn());
}


// --- Anonymous browser ID (per-device, stored in localStorage) ---
// Cache in-memory so private mode / blocked localStorage still works this session
let _anonId: string | null = null;

function getAnonId(): string {
  if (typeof window === "undefined") return "";
  if (_anonId) return _anonId;
  try {
    const stored = localStorage.getItem("trooflix:anon_id");
    if (stored && stored.length > 5) {
      _anonId = stored;
      return _anonId;
    }
  } catch {
    // localStorage blocked — fall through and generate in-memory
  }
  const id = "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    localStorage.setItem("trooflix:anon_id", id);
  } catch {
    // ignore — memory cache will keep it for this session
  }
  _anonId = id;
  return _anonId;
}

// --- Global liked IDs cache (per-browser, from localStorage + API) ---
let cachedLikedIds: number[] | null = null;
let inflight: Promise<number[]> | null = null;
const listeners = new Set<(ids: number[]) => void>();

// --- Global like counts cache (all users, from Supabase) ---
let cachedCounts: Record<number, number> | null = null;
let countsInflight: Promise<Record<number, number>> | null = null;
const countListeners = new Set<(counts: Record<number, number>) => void>();

async function fetchLikedIds(): Promise<number[]> {
  if (cachedLikedIds) return cachedLikedIds;
  if (inflight) return inflight;

  inflight = (async () => {
    const anonId = getAnonId();
    if (!anonId) {
      inflight = null;
      return [];
    }
    const r = await fetch(`/api/likes?anon_id=${anonId}`);
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
  if (countsInflight) return countsInflight;

  countsInflight = fetch("/api/like-counts", { cache: "no-store" })
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
  stacked = false,
}: {
  videoId: number;
  size?: number;
  showCount?: boolean;
  stacked?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCountState] = useState<number>(0);
  const [checking, setChecking] = useState(true);

  // Listen for external like triggers (feed double-tap)
  useEffect(() => {
    const fn = () => {
      // Fire the same toggle path as a click, ignoring the event arg
      const fakeEvent = { stopPropagation: () => {}, preventDefault: () => {} } as any;
      toggle(fakeEvent);
    };
    if (!likeBusListeners.has(videoId)) likeBusListeners.set(videoId, new Set());
    likeBusListeners.get(videoId)!.add(fn);
    return () => {
      likeBusListeners.get(videoId)?.delete(fn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Subscribe to liked IDs
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

    const anonId = getAnonId();

    const wasLiked = liked;
    const newLiked = !wasLiked;
    const newCount = wasLiked ? Math.max(0, count - 1) : count + 1;

    // Optimistic
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
      body: JSON.stringify({ anonId, videoId }),
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

  if (stacked) {
    return (
      <button
        onClick={toggle}
        className={`flex flex-col items-center justify-center gap-1.5 transition ${
          liked ? "text-red-500" : "text-white"
        }`}
        style={{ minHeight: size + 20 }}
        title={liked ? "Unlike" : "Like"}
      >
        <ThumbsUp size={size} fill={liked ? "currentColor" : "none"} />
        {showCount && (
          <span className="text-[11px] font-semibold tabular-nums text-white/90 leading-none h-3">
            {count > 0 ? count.toLocaleString() : "\u00A0"}
          </span>
        )}
      </button>
    );
  }

  return (
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
  );
}
