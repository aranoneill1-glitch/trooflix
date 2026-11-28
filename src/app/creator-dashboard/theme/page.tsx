"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Palette, Check, ImagePlus, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);
  const [selectedPattern, setSelectedPattern] = useState<ThemePattern>("none");
  const [customImage, setCustomImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ color: DEFAULT_COLOR, pattern: "none" as ThemePattern, customImage: "" });

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
        if (data.backdrop_url.startsWith("http") && !THEME_PATTERNS.some(p => p.image === data.backdrop_url)) {
          setCustomImage(data.backdrop_url);
          setSelectedColor(DEFAULT_COLOR);
          setSelectedPattern("none");
          latestRef.current = { color: DEFAULT_COLOR, pattern: "none", customImage: data.backdrop_url };
        } else {
          const parsed = parseThemeBackdrop(data.backdrop_url);
          setSelectedColor(parsed.color);
          setSelectedPattern(parsed.pattern);
          setCustomImage("");
          latestRef.current = { color: parsed.color, pattern: parsed.pattern, customImage: "" };
        }
      } else {
        setSelectedColor(DEFAULT_COLOR);
        setSelectedPattern("none");
        setCustomImage("");
        latestRef.current = { color: DEFAULT_COLOR, pattern: "none", customImage: "" };
      }

      setLoading(false);
    });
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, [router, supabase]);

  const persistTheme = async (color: string, pattern: ThemePattern, customImageUrl = "", goBack = false) => {
    if (!userId) return false;
    setSaving(true);
    setSaved(false);
    setStatus({ type: "", message: "" });

    try {
      const backdrop_url = customImageUrl || getBackdropFromColor(color, pattern);
      const { error } = await supabase
        .from("profiles")
        .update({ backdrop_url })
        .eq("user_id", userId);

      if (error) throw error;

      try { localStorage.setItem("trooflix:app-theme-color", customImageUrl ? DEFAULT_COLOR : color); } catch {}
      applyAppTheme(customImageUrl ? DEFAULT_COLOR : color);
      window.dispatchEvent(new CustomEvent("app-theme-updated", { detail: { color: customImageUrl ? DEFAULT_COLOR : color, backdrop_url } }));
      clearUserCache();
      setSaved(true);
      if (goBack) {
        router.push("/creator-dashboard");
        return true;
      }
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
      return true;
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save theme." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const scheduleSave = (color: string, pattern: ThemePattern, customImageUrl = "", immediate = false) => {
    latestRef.current = { color, pattern, customImage: customImageUrl };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (immediate) {
      void persistTheme(color, pattern, customImageUrl);
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      const l = latestRef.current;
      void persistTheme(l.color, l.pattern, l.customImage);
    }, 350);
  };

  const onColorChange = (color: string) => {
    setSelectedColor(color);
    setCustomImage("");
    scheduleSave(color, selectedPattern, "", false);
  };

  const onPatternSelect = async (pattern: ThemePattern) => {
    setSelectedPattern(pattern);
    setCustomImage("");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await persistTheme(selectedColor, pattern, "", true);
  };

  const onReset = async () => {
    setSelectedColor(DEFAULT_COLOR);
    setSelectedPattern("none");
    setCustomImage("");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await persistTheme(DEFAULT_COLOR, "none", "", true);
  };

  const uploadCustomImage = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    setStatus({ type: "", message: "" });
    try {
      const contentType = file.type || "image/jpeg";
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name || `theme-${Date.now()}.jpg`,
          contentType,
          folder: "theme-backgrounds",
        }),
      });
      const presignData = await presign.json().catch(() => ({}));
      if (!presign.ok) throw new Error(presignData?.error || "Upload failed");
      const { signedUrl, publicUrl } = presignData;
      if (!signedUrl || !publicUrl) throw new Error("Upload failed");

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");

      setCustomImage(publicUrl);
      setSelectedPattern("none");
      setSelectedColor(DEFAULT_COLOR);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      await persistTheme(DEFAULT_COLOR, "none", publicUrl, true);
    } catch (e: any) {
      console.error("Theme image upload failed:", e);
      setStatus({ type: "error", message: e?.message || "Couldn't upload image. Please try again." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
            Pick a background theme or upload your own image. It applies automatically across the site when you’re logged in.
          </p>
        </div>

        <div className="mb-8">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Choose your own theme</p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className={`relative flex items-center gap-4 text-left group ${uploading || saving ? "opacity-60 pointer-events-none" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadCustomImage(f);
                }}
              />
              <div className="w-20 h-20 rounded-2xl border border-white/15 bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
                {customImage ? (
                  <img src={customImage} alt="Custom theme" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <Loader2 size={24} className="text-white/60 animate-spin" />
                ) : (
                  <ImagePlus size={24} className="text-white/60 group-hover:text-white transition" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white">{uploading ? "Uploading..." : "Upload your own image"}</p>
                <p className="text-sm text-white/50 mt-0.5">Use any photo as your Trooflix background theme.</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
              <div
                className="relative w-14 h-14 rounded-full border border-white/20 overflow-hidden shrink-0"
                style={{ background: selectedColor }}
              >
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  aria-label="Choose theme color"
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">Theme color</p>
                <p className="text-xs text-white/45">{selectedColor.toUpperCase()} · tap circle to change</p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-white/60 hover:text-white transition underline underline-offset-4 shrink-0"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Background Themes</p>
            <div className="text-xs font-medium text-white/50 h-4 flex items-center gap-1">
              {saving && !uploading ? "Applying..." : saved ? <><Check size={13} className="text-emerald-400" /><span className="text-emerald-400">Applied</span></> : null}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {THEME_PATTERNS.map((p) => {
              const active = !customImage && selectedPattern === p.id;
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
