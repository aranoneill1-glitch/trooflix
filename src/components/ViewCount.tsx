"use client";

import { useEffect, useState } from "react";

let cachedCounts: Record<number, number> | null = null;
let inflight: Promise<Record<number, number>> | null = null;
const listeners = new Set<(counts: Record<number, number>) => void>();

async function fetchCounts(): Promise<Record<number, number>> {
  if (cachedCounts) return cachedCounts;
  if (inflight) return inflight;

  inflight = fetch("/api/views")
    .then((r) => r.json())
    .then((d) => {
      const counts = d.counts && typeof d.counts === "object" ? d.counts : {};
      cachedCounts = counts;
      inflight = null;
      listeners.forEach((fn) => fn(counts));
      return counts;
    })
    .catch(() => {
      inflight = null;
      return {};
    });

  return inflight;
}

// Public helper to increment a view (called by the player)
export async function trackView(videoId: number) {
  try {
    await fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    // Bust cache so next fetch sees the new count
    cachedCounts = null;
  } catch {}
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export default function ViewCount({ videoId }: { videoId: number }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const onUpdate = (counts: Record<number, number>) => {
      if (mounted) setCount(counts[videoId] ?? 0);
    };
    listeners.add(onUpdate);

    fetchCounts().then((counts) => {
      if (mounted) setCount(counts[videoId] ?? 0);
    });

    return () => {
      mounted = false;
      listeners.delete(onUpdate);
    };
  }, [videoId]);

  if (count === null) return null;
  if (count === 0) return null;

  return (
    <span className="text-xs text-white/50">
      {formatCount(count)} {count === 1 ? "view" : "views"}
    </span>
  );
}
