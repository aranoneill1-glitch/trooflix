"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Palette, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { DEFAULT_APP_THEME_COLOR, getBackdropFromColor, applyAppTheme, parseThemeBackdrop, THEME_PATTERNS, getThemeBackdropStyle, type ThemePattern } from "@/lib/appTheme";

const DEFAULT_COLOR = DEFAULT_APP_THEME_COLOR;

export default function ProfileThemePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [selectedPattern, setSelectedPattern] = useState<ThemePattern>("none");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ color: DEFAULT_COLOR, pattern: "none" as ThemePattern });

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("backdrop_url")
        .eq("user_id", user.id)
        .single();

      if (data?.backdrop_url) {
        const parsed = parseThemeBackdrop(data.backdrop_url);
        setSelectedColor(parsed.color);
        setSelectedPattern(parsed.pattern);
        latestRef.current = { color: parsed.color, pattern: parsed.pattern };
      } else {
        setSelectedColor(DEFAULT_COLOR);
        setSelectedPattern("none");
        latestRef.current = { color: DEFAULT_COLOR, pattern: "none" };
      }

      setLoading(false);
    });
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [router, supabase]);

  const persistTheme = async (color: string, pattern: ThemePattern) => {
    if (!userId) return;
    setSaving(true);
    setSaved(false);
    setStatus({ type: "", message: "" });

    try {
      const backdrop_url = getBackdropFromColor(color, pattern);
      const { error } = await supabase
        .from("profiles")
        .update({ backdrop_url })
        .eq("user_id", userId);

      if (error) throw error;

      try { localStorage.setItem("trooflix:app-theme-color", color); } catch {}
      applyAppTheme(color);
      window.dispatchEvent(new CustomEvent("app-theme-updated", { detail: { color, backdrop_url } }));
      clearUserCache();
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save theme." });
    } finally {
      setSaving(false);
    }
  };

  const scheduleSave = (color: string, pattern: ThemePattern, immediate = false) => {
    latestRef.current = { color, pattern };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (immediate) {
      persistTheme(color, pattern);
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      persistTheme(latestRef.current.color, latestRef.current.pattern);
    }, 350);
  };

  const onColorChange = (color: string) => {
    setSelectedColor(color);
    scheduleSave(color, selectedPattern, false);
  };

  const onPatternSelect = (pattern: ThemePattern) => {
    setSelectedPattern(pattern);
    scheduleSave(selectedColor, pattern, true);
  };

  const onReset = () => {
    setSelectedColor(DEFAULT_COLOR);
    setSelectedPattern("none");
    scheduleSave(DEFAULT_COLOR, "none", true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-28 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+5rem)] pb-4">
        <Link
          href="/creator-dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4 transition"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight mb-1 flex items-center gap-2">
            <Palette size={22} className="text-white/70" /> App Theme
          </h1>
          <p className="text-sm text-white/50">
            Choose your own theme. Pick a color and background — it applies automatically across the site when you’re logged in.
          </p>
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Choose your own theme</p>
          <div className="flex flex-col items-center justify-center gap-3 py-4 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div
              className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden"
              style={{ background: selectedColor }}
            >
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => onColorChange(e.target.value)}
                aria-label="Choose profile theme color"
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
            </div>
            <p className="text-xs text-white/50">Tap to choose your color</p>
            <p className="text-sm font-semibold tracking-wide text-white/90">
              {selectedColor.toUpperCase()}
            </p>
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-white/60 hover:text-white transition underline underline-offset-4"
            >
              Reset to default
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Background Themes</p>
            <div className="text-xs font-medium text-white/50 h-4 flex items-center gap-1">
              {saving ? "Saving..." : saved ? <><Check size={13} className="text-emerald-400" /><span className="text-emerald-400">Applied</span></> : null}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {THEME_PATTERNS.map((p) => {
              const active = selectedPattern === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPatternSelect(p.id)}
                  className={`group flex flex-col items-center gap-2`}
                >
                  <div
                    className={`w-full aspect-square rounded-2xl border overflow-hidden transition ${active ? "border-[#E53945] ring-2 ring-[#E53945]/30" : "border-white/10 hover:border-white/25"}`}
                    style={getThemeBackdropStyle(getBackdropFromColor(selectedColor, p.id) || (p.id === "none" ? `linear-gradient(to bottom, ${selectedColor}, #09090b)` : JSON.stringify({ __trooflixTheme: true, v: 1, color: selectedColor, pattern: p.id })))}
                  />
                  <span className={`text-[11px] font-medium ${active ? "text-white" : "text-white/55"}`}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {status.message && (
          <div
            className={`mt-5 rounded-xl px-4 py-3 text-sm font-medium ${
              status.type === "success"
                ? "bg-emerald-950/30 border border-emerald-600/40 text-emerald-300"
                : "bg-red-950/30 border border-red-600/40 text-red-300"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
