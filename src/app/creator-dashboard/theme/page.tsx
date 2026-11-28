"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Palette } from "lucide-react";
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
  const [status, setStatus] = useState({ type: "", message: "" });

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [selectedPattern, setSelectedPattern] = useState<ThemePattern>("none");

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
      } else {
        setSelectedColor(DEFAULT_COLOR);
        setSelectedPattern("none");
      }

      setLoading(false);
    });
  }, [router, supabase]);

  const saveTheme = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const backdrop_url = getBackdropFromColor(selectedColor, selectedPattern);
      const { error } = await supabase
        .from("profiles")
        .update({ backdrop_url })
        .eq("user_id", userId);

      if (error) throw error;

      try { localStorage.setItem("trooflix:app-theme-color", selectedColor); } catch {}
      applyAppTheme(selectedColor);
      window.dispatchEvent(new CustomEvent("app-theme-updated", { detail: { color: selectedColor, backdrop_url } }));

      setStatus({ type: "success", message: "Theme updated across your account!" });
      clearUserCache();
      setTimeout(() => {
        router.push("/creator-dashboard");
      }, 1200);
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save theme." });
    } finally {
      setSaving(false);
    }
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
            Pick a color and texture theme for your account. It applies across the site when you’re logged in.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 py-4">
          <div
            className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden"
            style={{ background: selectedColor }}
          >
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              aria-label="Choose profile theme color"
              className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            />
          </div>
          <p className="text-xs text-white/50">Tap to choose</p>
          <p className="text-sm font-semibold tracking-wide text-white/90">
            {selectedColor.toUpperCase()}
          </p>
          <button
            type="button"
            onClick={() => { setSelectedColor(DEFAULT_COLOR); setSelectedPattern("none"); }}
            className="text-xs font-semibold text-white/60 hover:text-white transition underline underline-offset-4"
          >
            Reset to default
          </button>
        </div>

        <div className="mt-8">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Texture / Pattern</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {THEME_PATTERNS.map((p) => {
              const active = selectedPattern === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPattern(p.id)}
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

        <button
          onClick={saveTheme}
          disabled={saving}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
        >
          <Save size={18} /> {saving ? "Saving Theme…" : "Save Theme"}
        </button>
      </div>
      <MobileBottomNav />
    </main>
  );
}
