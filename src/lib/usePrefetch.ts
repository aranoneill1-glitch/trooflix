"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Returns handlers that preload a destination route's JS chunk when the
 * user hovers or starts touching a link. Works alongside Next.js's own
 * viewport-based prefetch — this covers links that just entered the
 * viewport or that the browser hasn't gotten to yet.
 */
export function usePrefetch(href: string) {
  const router = useRouter();

  const prefetch = useCallback(() => {
    try {
      // @ts-ignore — prefetch exists on Next.js App Router
      router.prefetch?.(href);
    } catch {
      // ignore
    }
  }, [router, href]);

  return {
    onMouseEnter: prefetch,
    onTouchStart: prefetch,
    onFocus: prefetch,
  };
}
