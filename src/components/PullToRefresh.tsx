"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 70;        // px pulled before triggering
const MAX_PULL = 120;        // hard cap so it doesn't go absurdly far

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      // Only trigger if at the very top of the page
      if (window.scrollY > 0 || refreshing) return;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY === 0) {
        // Pull down only when at top
        const distance = Math.min(delta * 0.6, MAX_PULL);
        setPullDistance(distance);
        // Prevent default scroll while pulling
        if (distance > 5) e.preventDefault();
      }
    };

    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      const trigger = pullDistance >= THRESHOLD;
      startYRef.current = null;

      if (trigger && !refreshing) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        try {
          await onRefresh();
        } catch (err) {
          console.error("refresh failed:", err);
        }
        // Brief pause so the user sees it completed
        await new Promise((r) => setTimeout(r, 400));
        setRefreshing(false);
        setPullDistance(0);
      } else {
        setPullDistance(0);
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, refreshing, pullDistance]);

  // Compute progress 0..1 based on pull distance
  const progress = Math.min(pullDistance / THRESHOLD, 1);
  // Glow rotates faster the more you pull
  const rotationSpeed = refreshing ? 1.2 : Math.max(0.4, 2 - progress * 1.6);
  // Logo scales up as you pull, drops back to 1 while refreshing
  const logoScale = refreshing ? 1 : 0.7 + progress * 0.4;
  // Show only when actively pulled or refreshing
  const show = pullDistance > 4 || refreshing;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator (spinner with logo) */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-[999] flex justify-center transition-opacity"
        style={{
          top: `${Math.max(pullDistance - 30, 0)}px`,
          opacity: show ? 1 : 0,
        }}
      >
        <div
          className="relative"
          style={{
            width: 60,
            height: 60,
            transform: `scale(${logoScale})`,
            transition: refreshing ? "none" : "transform 0.15s ease-out",
          }}
        >
          {/* Spinning glow ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, #dc2626 40%, #ff6b6b 60%, transparent 100%)`,
              animation: `ptr-spin ${rotationSpeed}s linear infinite`,
              filter: "blur(3px)",
              opacity: progress > 0.2 || refreshing ? 1 : 0.4,
            }}
          />
          {/* Logo circle (dark background to make logo pop) */}
          <div className="absolute inset-1 rounded-full bg-black flex items-center justify-center overflow-hidden">
            <img
              src="/loading-logo.jpg"
              alt=""
              className="w-[80%] h-[80%] object-contain"
              draggable={false}
            />
          </div>
        </div>
      </div>

      {/* Content — offset down while pulling */}
      <div
        style={{
          transform: `translateY(${refreshing ? THRESHOLD : pullDistance}px)`,
          transition: refreshing || pullDistance === 0 ? "transform 0.25s ease-out" : "none",
        }}
      >
        {children}
      </div>

      {/* Keyframes injected once */}
      <style jsx>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
