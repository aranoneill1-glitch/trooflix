"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

// --- Global external like trigger (used by feed double-tap) ---
const likeBusListeners = new Map<number, Set<(forceLikeOnly?: boolean) => void>>();
export function externalLike(videoId: number, forceLikeOnly?: boolean) {
  const set = likeBusListeners.get(videoId);
  if (set) set.forEach((fn) => fn(forceLikeOnly));
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
  const [isSparking, setIsSparking] = useState(false);
  const latestLikedRef = useRef(false);
  const latestCountRef = useRef(0);
  useEffect(() => {
    latestLikedRef.current = liked;
  }, [liked]);
  useEffect(() => {
    latestCountRef.current = count;
  }, [count]);

  // Listen for external like triggers (feed double-tap)
  useEffect(() => {
    const fn = (forceLikeOnly?: boolean) => {
      if (forceLikeOnly && latestLikedRef.current) {
        setIsSparking(true);
        setTimeout(() => setIsSparking(false), 500);
        return;
      }
      const fakeEvent = {
        stopPropagation: () => {},
        preventDefault: () => {},
      } as any;
      // Call the LATEST toggle closure via ref so count state is fresh
      toggleRef.current?.(fakeEvent);
    };
    if (!likeBusListeners.has(videoId)) likeBusListeners.set(videoId, new Set());
    likeBusListeners.get(videoId)!.add(fn);
    return () => {
      likeBusListeners.get(videoId)?.delete(fn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, liked, count]);

  // Keep the fn reference fresh via a ref so bus calls always see latest state
  const toggleRef = useRef<((e: React.MouseEvent) => void) | null>(null);
  useEffect(() => {
    toggleRef.current = toggle;
  });

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

    const wasLiked = latestLikedRef.current;
    const currentCount = latestCountRef.current;
    const newLiked = !wasLiked;
    const newCount = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1;

    if (newLiked) {
      setIsSparking(true);
      setTimeout(() => setIsSparking(false), 500);
    }

    // Optimistic
    setLiked(newLiked);
    setCountState(newCount);
    setCount(videoId, newCount);
    latestLikedRef.current = newLiked;
    latestCountRef.current = newCount;

    const currentIds = cachedLikedIds || [];
    setLikedIds(
      wasLiked
        ? currentIds.filter((id) => id !== videoId)
        : [...currentIds, videoId]
    );

    // OLD LOGIC FIX: Send real userId if logged in
    const { getCachedUser } = await import("@/lib/cache");
    const user = await getCachedUser();
    
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        anonId, 
        userId: user?.id || null, 
        videoId 
      }),
    });

    if (!res.ok) {
      // Rollback
      setLiked(wasLiked);
      setCountState(currentCount);
      setCount(videoId, currentCount);
      setLikedIds(currentIds);
      latestLikedRef.current = wasLiked;
      latestCountRef.current = currentCount;
    }
  };

  if (checking) {
    return <div style={{ width: size, height: size }} />;
  }

  const renderAnimatedHeart = () => (
    <div className="relative flex items-center justify-center">
      <svg width="0" height="0" className="absolute pointer-events-none opacity-0">
        <defs>
          <linearGradient id="like-heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4B72" />
            <stop offset="100%" stopColor="#E53945" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        animate={isSparking ? { scale: [1, 1.45, 0.85, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Heart 
          size={size} 
          fill={liked ? "url(#like-heart-grad)" : "none"} 
          stroke={liked ? "url(#like-heart-grad)" : "currentColor"}
          strokeWidth={2.2}
          className={liked ? "filter drop-shadow-[0_2px_10px_rgba(229,57,69,0.7)]" : "drop-shadow-md"}
        />
      </motion.div>
      {isSparking && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const dist = size * 0.75;
            const x = Math.cos(rad) * dist;
            const y = Math.sin(rad) * dist;
            return (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                animate={{ scale: [0, 1.3, 0], opacity: [1, 1, 0], x, y }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"
              />
            );
          })}
        </div>
      )}
    </div>
  );

  if (stacked) {
    return (
      <button
        onClick={toggle}
        className={`flex flex-col items-center justify-center gap-0.5 transition ${
          liked ? "text-red-500" : "text-white"
        }`}
        style={{ minHeight: size + 20 }}
        title={liked ? "Unlike" : "Like"}
      >
        {renderAnimatedHeart()}
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
      {renderAnimatedHeart()}
      {showCount && count > 0 && (
        <span className="text-sm font-semibold tabular-nums">{count}</span>
      )}
    </button>
  );
}
