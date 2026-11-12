"use client";

import { useEffect } from "react";
import { getCachedVideos, getCachedCreators, getCachedProducts } from "@/lib/cache";

/**
 * Invisible component that warms the videos + creators + products cache as soon as the
 * app boots. Result: every page that uses this data has zero-latency access.
 * Fires once per session.
 */
export default function CacheWarmer() {
  useEffect(() => {
    // Fire and forget
    getCachedVideos().catch(() => {});
    getCachedCreators().catch(() => {});
    getCachedProducts().catch(() => {});
  }, []);

  return null;
}
