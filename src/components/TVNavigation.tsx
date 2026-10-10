"use client";

import { useEffect } from "react";

export default function TVNavigation() {
  useEffect(() => {
    // Only run on TV-like devices or when arrow keys are pressed
    const isTV = /AFT|Silk|Android TV|BRAVIA|HbbTV|SmartTV|Tizen|Web0S/i.test(
      navigator.userAgent
    );

    const init = () => {
      let currentIndex = -1;
      let currentEl: HTMLElement | null = null;
      let active = false;

      const getFocusable = (): HTMLElement[] => {
        const nodes = document.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return Array.from(nodes).filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width > 0 &&
            r.height > 0 &&
            el.offsetParent !== null &&
            getComputedStyle(el).visibility !== "hidden"
          );
        });
      };

      const highlight = (el: HTMLElement) => {
        document.querySelectorAll(".tv-focus").forEach((e) =>
          e.classList.remove("tv-focus")
        );
        el.classList.add("tv-focus");
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        currentEl = el;
      };

      const findNearest = (dir: "up" | "down" | "left" | "right") => {
        const items = getFocusable();
        if (items.length === 0) return null;
        if (!currentEl || !document.body.contains(currentEl)) {
          currentIndex = 0;
          return items[0];
        }
        const cur = currentEl.getBoundingClientRect();
        const cx = cur.left + cur.width / 2;
        const cy = cur.top + cur.height / 2;

        let best: HTMLElement | null = null;
        let bestScore = Infinity;

        for (const el of items) {
          if (el === currentEl) continue;
          const r = el.getBoundingClientRect();
          const ex = r.left + r.width / 2;
          const ey = r.top + r.height / 2;
          const dx = ex - cx;
          const dy = ey - cy;

          const passes =
            (dir === "right" && dx > 5) ||
            (dir === "left" && dx < -5) ||
            (dir === "down" && dy > 5) ||
            (dir === "up" && dy < -5);
          if (!passes) continue;

          const primary = dir === "left" || dir === "right" ? Math.abs(dx) : Math.abs(dy);
          const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
          const score = primary + secondary * 3;
          if (score < bestScore) {
            bestScore = score;
            best = el;
          }
        }
        return best;
      };

      const onKey = (e: KeyboardEvent) => {
        // Initialize on first arrow key if not yet active
        if (!active) {
          active = true;
          const items = getFocusable();
          if (items.length > 0) {
            highlight(items[0]);
            currentIndex = 0;
            return;
          }
        }

        let dir: "up" | "down" | "left" | "right" | null = null;
        if (e.key === "ArrowUp") dir = "up";
        else if (e.key === "ArrowDown") dir = "down";
        else if (e.key === "ArrowLeft") dir = "left";
        else if (e.key === "ArrowRight") dir = "right";

        if (dir) {
          e.preventDefault();
          const next = findNearest(dir);
          if (next) highlight(next);
          return;
        }

        if (e.key === "Enter" || e.key === "OK" || e.key === "Select") {
          if (currentEl) {
            e.preventDefault();
            currentEl.click();
          }
        }
      };

      document.addEventListener("keydown", onKey);

      // Auto-focus first item after a delay
      setTimeout(() => {
        const items = getFocusable();
        if (items.length > 0 && !currentEl) {
          highlight(items[0]);
          active = true;
        }
      }, 1500);

      // Cleanup
      return () => {
        document.removeEventListener("keydown", onKey);
      };
    };

    // Add the focus style
    const style = document.createElement("style");
    style.textContent = `
      .tv-focus {
        outline: 3px solid #dc2626 !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 24px rgba(220, 38, 38, 0.7) !important;
        transform: scale(1.03) !important;
        transition: transform 0.15s ease, box-shadow 0.15s ease !important;
        z-index: 60 !important;
      }
    `;
    document.head.appendChild(style);

    const cleanup = init();
    return cleanup;
  }, []);

  return null;
}
