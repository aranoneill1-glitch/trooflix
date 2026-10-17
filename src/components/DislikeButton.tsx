"use client";

import { useEffect, useRef, useState } from "react";

// --- Global external dislike trigger (used by feed long-press etc.) ---
const dislikeBusListeners = new Map<number, Set<() => void>>();
export function externalDislike(videoId: number) {
  const set = dislikeBusListeners.get(videoId);
  if (set) set.forEach((fn) => fn());
}

// --- Anonymous browser ID (same one used by LikeButton) ---
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
  } catch {}
  const id = "anon_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    localStorage.setItem("trooflix:anon_id", id);
  } catch {}
  _anonId = id;
  return _anonId;
}

// --- Global disliked IDs cache ---
let cachedDislikedIds: number[] | null = null;
let inflightIds: Promise<number[]> | null = null;
const idListeners = new Set<(ids: number[]) => void>();

// --- Global dislike counts cache ---
let cachedCounts: Record<number, number> | null = null;
let inflightCounts: Promise<Record<number, number>> | null = null;
const countListeners = new Set<(counts: Record<number, number>) => void>();

async function fetchDislikedIds(): Promise<number[]> {
  if (cachedDislikedIds) return cachedDislikedIds;
  if (inflightIds) return inflightIds;
  inflightIds = (async () => {
    const anonId = getAnonId();
    if (!anonId) {
      inflightIds = null;
      return [];
    }
    const r = await fetch(`/api/dislikes?anon_id=${anonId}`);
    const d = await r.json();
    const ids = Array.isArray(d.ids) ? d.ids : [];
    cachedDislikedIds = ids;
    inflightIds = null;
    idListeners.forEach((fn) => fn(ids));
    return ids;
  })();
  return inflightIds;
}

async function fetchCounts(): Promise<Record<number, number>> {
  if (cachedCounts) return cachedCounts;
  if (inflightCounts) return inflightCounts;
  inflightCounts = fetch("/api/dislike-counts", { cache: "no-store" })
    .then((r) => r.json())
    .then((d) => {
      const counts = d.counts && typeof d.counts === "object" ? d.counts : {};
      cachedCounts = counts;
      inflightCounts = null;
      countListeners.forEach((fn) => fn(counts));
      return counts;
    })
    .catch(() => {
      inflightCounts = null;
      return {};
    });
  return inflightCounts;
}

function setDislikedIds(ids: number[]) {
  cachedDislikedIds = ids;
  idListeners.forEach((fn) => fn(ids));
}

function setCount(videoId: number, value: number) {
  if (!cachedCounts) cachedCounts = {};
  cachedCounts[videoId] = value;
  countListeners.forEach((fn) => fn(cachedCounts!));
}

// --- Middle-finger SVG icon ---
function MiddleFinger({ size = 22, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Palm */}
      <path d="M8 20v-6c0-1.5 0.5-3 1-4l1-2h2v5l1.5-6c0.3-1.2 1.6-1.8 2.6-1.2 0.9 0.5 1.2 1.6 1 2.6l-1.5 6H18c1.1 0 2 0.9 2 2v3c0 1.1-0.9 2-2 2H10c-1.1 0-2-0.9-2-2z" />
    </svg>
  );
}

export default function DislikeButton({
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
  const [disliked, setDisliked] = useState(false);
  const [count, setCountState] = useState<number>(0);
  const [checking, setChecking] = useState(true);
  const latestDislikedRef = useRef(false);
  const latestCountRef = useRef(0);

  useEffect(() => {
    latestDislikedRef.current = disliked;
  }, [disliked]);
  useEffect(() => {
    latestCountRef.current = count;
  }, [count]);

  // Listen for external triggers
  useEffect(() => {
    const fn = () => {
      const fake = { stopPropagation: () => {}, preventDefault: () => {} } as any;
      toggleRef.current?.(fake);
    };
    if (!dislikeBusListeners.has(videoId)) dislikeBusListeners.set(videoId, new Set());
    dislikeBusListeners.get(videoId)!.add(fn);
    return () => {
      dislikeBusListeners.get(videoId)?.delete(fn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, disliked, count]);

  const toggleRef = useRef<((e: React.MouseEvent) => void) | null>(null);
  useEffect(() => {
    toggleRef.current = toggle;
  });

  // Subscribe to disliked IDs
  useEffect(() => {
    let mounted = true;
    const onUpdate = (ids: number[]) => {
      if (mounted) setDisliked(ids.includes(videoId));
    };
    idListeners.add(onUpdate);
    fetchDislikedIds().then((ids) => {
      if (mounted) {
        setDisliked(ids.includes(videoId));
        setChecking(false);
      }
    });
    return () => {
      mounted = false;
      idListeners.delete(onUpdate);
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
    const wasDisliked = latestDislikedRef.current;
    const currentCount = latestCountRef.current;
    const newDisliked = !wasDisliked;
    const newCount = wasDisliked ? Math.max(0, currentCount - 1) : currentCount + 1;

    // Optimistic
    setDisliked(newDisliked);
    setCountState(newCount);
    setCount(videoId, newCount);
    latestDislikedRef.current = newDisliked;
    latestCountRef.current = newCount;

    const currentIds = cachedDislikedIds || [];
    setDislikedIds(
      wasDisliked
        ? currentIds.filter((id) => id !== videoId)
        : [...currentIds, videoId]
    );

    try {
      const res = await fetch("/api/dislikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, videoId }),
      });

      if (!res.ok) {
        // Rollback
        setDisliked(wasDisliked);
        setCountState(currentCount);
        setCount(videoId, currentCount);
        setDislikedIds(currentIds);
        latestDislikedRef.current = wasDisliked;
        latestCountRef.current = currentCount;
      } else {
        // Trigger like cache refresh so mutual exclusivity is reflected everywhere
        // (like cache is private to LikeButton, this is best-effort)
      }
    } catch {
      setDisliked(wasDisliked);
      setCountState(currentCount);
      setCount(videoId, currentCount);
      setDislikedIds(currentIds);
      latestDislikedRef.current = wasDisliked;
      latestCountRef.current = currentCount;
    }
  };

  if (checking) {
    return <div style={{ width: size, height: size }} />;
  }

  if (stacked) {
    return (
      <button
        onClick={toggle}
        className={`flex flex-col items-center justify-center gap-0.5 transition ${
          disliked ? "text-red-500" : "text-white"
        }`}
        style={{ minHeight: size + 20 }}
        title={disliked ? "Remove dislike" : "Dislike"}
      >
        <MiddleFinger size={size} filled={disliked} />
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
        disliked ? "text-red-500" : "text-white/80 hover:text-white"
      }`}
      title={disliked ? "Remove dislike" : "Dislike"}
    >
      <MiddleFinger size={size} filled={disliked} />
      {showCount && count > 0 && (
        <span className="text-sm font-semibold tabular-nums">{count}</span>
      )}
    </button>
  );
}
