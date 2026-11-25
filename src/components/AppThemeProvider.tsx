"use client";

import { useEffect } from "react";
import { getCachedUser } from "@/lib/cache";
import { applyAppTheme, clearAppTheme, extractThemeColor, DEFAULT_APP_THEME_COLOR } from "@/lib/appTheme";

const STORAGE_KEY = "trooflix:app-theme-color";

export default function AppThemeProvider() {
  useEffect(() => {
    // Fast apply from local cache
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) applyAppTheme(cached);
    } catch {}

    let cancelled = false;

    const sync = async () => {
      try {
        const user = await getCachedUser();
        if (!user) {
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          clearAppTheme();
          return;
        }
        const res = await fetch(`/api/profile?user_id=${user.id}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const color = extractThemeColor(data?.profile?.backdrop_url || DEFAULT_APP_THEME_COLOR);
        try { localStorage.setItem(STORAGE_KEY, color); } catch {}
        applyAppTheme(color);
      } catch {
        // keep cached theme if fetch fails
      }
    };

    sync();

    const onThemeUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const color = extractThemeColor(detail?.color || detail?.backdrop_url || localStorage.getItem(STORAGE_KEY) || DEFAULT_APP_THEME_COLOR);
      try { localStorage.setItem(STORAGE_KEY, color); } catch {}
      applyAppTheme(color);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) applyAppTheme(e.newValue || DEFAULT_APP_THEME_COLOR);
    };

    window.addEventListener("app-theme-updated", onThemeUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("app-theme-updated", onThemeUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
