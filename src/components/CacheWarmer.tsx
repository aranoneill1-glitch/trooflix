"use client";

import { useEffect } from "react";
import { getCachedVideos, getCachedCreators } from "@/lib/cache";

/**
 * Invisible component that warms the videos + creators cache as soon as the
 * app boots. Result: every page that uses this data has zero-latency access.
 * Fires once per session.
 */
export default function CacheWarmer() {
  useEffect(() => {
    // Fire and forget
    getCachedVideos().catch(() => {});
    getCachedCreators().catch(() => {});
  }, []);

  return null;
}
