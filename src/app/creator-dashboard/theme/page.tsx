"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Palette } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

const DEFAULT_COLOR = "#09090B";

function getColorFromBackdrop(backdropUrl: string) {
  if (!backdropUrl) return DEFAULT_COLOR;
  const match = backdropUrl.match(/#(?:[0-9a-fA-F]{3,8})/);
  return match ? match[0] : DEFAULT_COLOR;
}

function getBackdropFromColor(color: string) {
  return color.toLowerCase() === DEFAULT_COLOR.toLowerCase()
    ? ""
    : `linear-gradient(to bottom, ${color}, #09090b)`;
}

export default function ProfileThemePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [userId, setUserId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR);

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
        setSelectedColor(getColorFromBackdrop(data.backdrop_url));
      } else {
        setSelectedColor(DEFAULT_COLOR);
      }

      setLoading(false);
    });
  }, [router, supabase]);

  const saveTheme = async () => {
    if (!userId) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          backdrop_url: getBackdropFromColor(selectedColor),
        })
        .eq("user_id", userId);

      if (error) throw error;

      setStatus({ type: "success", message: "Theme updated successfully!" });
      clearUserCache();
      setTimeout(() => {
        router.push("/creator-dashboard");
      }, 1500);
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

  const previewBackground = getBackdropFromColor(selectedColor) || DEFAULT_COLOR;

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-28 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-4">
        <Link
          href="/creator-dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-4 transition"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="mb-5">
          <h1 className="text-2xl font-black tracking-tight mb-1 flex items-center gap-2">
            <Palette size={22} className="text-white/70" /> Profile Theme
          </h1>
          <p className="text-sm text-white/50">
            Pick a color for your profile background.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-3">
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
              onClick={() => setSelectedColor(DEFAULT_COLOR)}
              className="text-xs font-semibold text-white/60 hover:text-white transition underline underline-offset-4"
            >
              Reset to default
            </button>
          </div>

          <div className="w-full sm:flex-1 max-w-sm">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 text-center sm:text-left">Preview</p>
            <div
              className="h-24 sm:h-40 rounded-2xl border border-white/10 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
              style={{ background: previewBackground }}
            />
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
          className="w-full mt-5 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/20 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
        >
          <Save size={18} /> {saving ? "Saving Theme…" : "Save Theme"}
        </button>
      </div>
      <MobileBottomNav />
    </main>
  );
}
