"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Save, User, AtSign, AlignLeft, ArrowLeft, ImagePlus, Loader2, Palette, Check, Sparkles, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import { apiFetch } from "@/lib/api-fetch";
import { DEFAULT_APP_THEME_COLOR, getBackdropFromColor, applyAppTheme, parseThemeBackdrop, THEME_PATTERNS, getThemeBackdropStyle, type ThemePattern } from "@/lib/appTheme";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

function ProfileSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [instagram, setInstagram] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [backdropUrl, setBackdropUrl] = useState(""); 
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_APP_THEME_COLOR);
  const [selectedPattern, setSelectedPattern] = useState<ThemePattern>("none");
  const [customThemeImage, setCustomThemeImage] = useState("");
  const [uploadingTheme, setUploadingTheme] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCachedUser().then(async (user) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        setDisplayName(data.display_name || "");
        setUsername(data.username || "");
        setInstagram(data.instagram_handle || "");
        setXHandle(data.x_handle || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
        const bu = data.backdrop_url || "";
        setBackdropUrl(bu);
        if (bu && bu.startsWith("http") && !THEME_PATTERNS.some(p => p.image === bu)) {
          setCustomThemeImage(bu);
          setSelectedColor(DEFAULT_APP_THEME_COLOR);
          setSelectedPattern("none");
        } else if (bu) {
          const parsed = parseThemeBackdrop(bu);
          setSelectedColor(parsed.color);
          setSelectedPattern(parsed.pattern);
          setCustomThemeImage("");
        }
      }
      setLoading(false);
    });
  }, [router, supabase]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const onSelectTheme = (pattern: ThemePattern) => {
    setSelectedPattern(pattern);
    setCustomThemeImage("");
    const nextBackdrop = getBackdropFromColor(selectedColor, pattern);
    setBackdropUrl(nextBackdrop);
    applyAppTheme(selectedColor);
  };

  const onThemeColorChange = (color: string) => {
    setSelectedColor(color);
    if (customThemeImage) return;
    const nextBackdrop = getBackdropFromColor(color, selectedPattern);
    setBackdropUrl(nextBackdrop);
    applyAppTheme(color);
  };

  const uploadThemeImage = async (file: File) => {
    setUploadingTheme(true);
    try {
      const contentType = file.type || "image/jpeg";
      const presign = await apiFetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name || `theme-${Date.now()}.jpg`, contentType, folder: "theme-backgrounds" }),
      });
      const presignData = await presign.json().catch(() => ({}));
      if (!presign.ok) throw new Error(presignData?.error || "Upload failed");
      const { signedUrl, publicUrl } = presignData;
      if (!signedUrl || !publicUrl) throw new Error("Upload failed");
      const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: file });
      if (!put.ok) throw new Error("Upload failed");
      setCustomThemeImage(publicUrl);
      setSelectedPattern("none");
      setSelectedColor(DEFAULT_APP_THEME_COLOR);
      setBackdropUrl(publicUrl);
      applyAppTheme(DEFAULT_APP_THEME_COLOR);
    } catch (e: any) {
      setStatus({ type: "error", message: e?.message || "Couldn't upload theme image." });
    } finally {
      setUploadingTheme(false);
      if (themeFileRef.current) themeFileRef.current.value = "";
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      let finalAvatarUrl = avatarUrl;

      // UPLOAD TO CLOUDFLARE R2
      if (avatarFile) {
        const r2Res = await fetch('/api/r2-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: avatarFile.name, contentType: avatarFile.type }),
        });
        const r2Data = await r2Res.json();
        if (!r2Res.ok) throw new Error("Failed to get R2 upload URL");

        const uploadRes = await fetch(r2Data.uploadUrl, {
          method: 'PUT',
          body: avatarFile,
          headers: { 'Content-Type': avatarFile.type },
        });
        if (!uploadRes.ok) throw new Error("Failed to upload image to R2");

        finalAvatarUrl = r2Data.publicUrl;
      }

      // STRICT SANITIZATION FOR USERNAME
      const cleanUsername = username.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      const cleanIg = instagram.replace(/^@/, "").trim();
      const cleanX = xHandle.replace(/^@/, "").trim();

      const { error } = await supabase.from("profiles").update({
        display_name: displayName,
        username: cleanUsername,
        instagram_handle: cleanIg,
        x_handle: cleanX,
        bio: bio,
        avatar_url: finalAvatarUrl,
        backdrop_url: backdropUrl, // Kept so we don't accidentally wipe the theme
      }).eq("user_id", userId);

      if (error) throw error;

      const themeColor = customThemeImage ? DEFAULT_APP_THEME_COLOR : selectedColor;
      try { localStorage.setItem("trooflix:app-theme-color", themeColor); } catch {}
      applyAppTheme(themeColor);
      window.dispatchEvent(new CustomEvent("app-theme-updated", { detail: { color: themeColor, backdrop_url: backdropUrl } }));
      setStatus({ type: "success", message: "Profile updated successfully!" });
      clearUserCache();
      setTimeout(() => { router.push("/creator-dashboard"); }, 1500);

    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32 font-sans selection:bg-[#E53945]/30 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[420px] bg-gradient-to-b from-white/[0.06] to-transparent" />
        <div className="absolute -top-24 right-[-80px] w-[320px] h-[320px] rounded-full bg-[#E53945]/10 blur-[90px]" />
      </div>
      <TopBar />
      
      <div className="relative z-10 max-w-2xl mx-auto pt-[calc(env(safe-area-inset-top)+6rem)] pb-32 px-4">

        {/* ONBOARDING BANNER (only shows during signup) */}
        {isOnboarding && (
          <div className="mb-6 relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.06] backdrop-blur-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#E53945]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E53945]/30 bg-[#E53945]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#ff8a93] mb-4">
                <Sparkles size={13} />
                Welcome to Trooflix
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mb-2">Let’s make it yours.</h2>
              <p className="text-sm text-white/60 leading-relaxed max-w-xl">
                Add your photo, bio, and pick a theme so your profile feels like you from the moment you arrive.
              </p>
            </div>
          </div>
        )}

        {/* HEADER ROW */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/creator-dashboard"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition text-sm font-semibold px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="text-lg font-bold text-white">Edit Profile</h1>
          <div className="w-[72px]" />
        </div>

        <form onSubmit={saveProfile} className="bg-white/[0.08] backdrop-saturate-150 border border-white/20 rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.14)]">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center py-8 border-b border-white/10 bg-white/[0.02]">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/25 bg-white/5 relative z-10 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white/[0.06]"><User size={42} className="text-white/35" /></div>}
              </div>
              <div className="absolute inset-0 z-20 rounded-full bg-black/45] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold transition shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              Change photo
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>

          {/* Form Rows */}
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/85 w-28 shrink-0">Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name" className="flex-1 bg-white/[0.04] border border-white/10 focus:border-white/25 focus:bg-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 text-right transition" required />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/85 w-28 shrink-0">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="flex-1 bg-white/[0.04] border border-white/10 focus:border-white/25 focus:bg-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 text-right transition" required />
            </div>

            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/85 w-28 shrink-0 pt-2">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about you" rows={3} className="flex-1 bg-white/[0.04] border border-white/10 focus:border-white/25 focus:bg-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 text-right resize-none transition" />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/85 w-28 shrink-0">Instagram</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" className="flex-1 bg-white/[0.04] border border-white/10 focus:border-white/25 focus:bg-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 text-right transition" />
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <label className="text-sm font-semibold text-white/85 w-28 shrink-0">X (Twitter)</label>
              <input type="text" value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="@username" className="flex-1 bg-white/[0.04] border border-white/10 focus:border-white/25 focus:bg-white/[0.07] rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 text-right transition" />
            </div>
          </div>

          {/* Theme Section */}
          <div className="px-5 py-5 border-t border-white/10">
            <button
              type="button"
              onClick={() => setThemeOpen(v => !v)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                  <Palette size={18} className="text-white/70" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">Personalize your theme</h3>
                  <p className="text-xs text-white/45 truncate">
                    {customThemeImage ? "Custom image selected" : (THEME_PATTERNS.find(p => p.id === selectedPattern)?.label || "Clean")}
                  </p>
                </div>
              </div>
              <ChevronDown size={18} className={`text-white/50 transition-transform ${themeOpen ? "rotate-180" : ""}`} />
            </button>

            {themeOpen && (
              <div className="mt-4">
                <div className={`relative mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3 ${uploadingTheme ? "opacity-60 pointer-events-none" : ""}`}>
                  <input
                    ref={themeFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThemeImage(f); }}
                  />
                  <div className="w-14 h-14 rounded-xl border border-white/15 bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
                    {customThemeImage ? <img src={customThemeImage} alt="Custom theme" className="w-full h-full object-cover" /> : uploadingTheme ? <Loader2 size={18} className="text-white/60 animate-spin" /> : <ImagePlus size={18} className="text-white/60" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{uploadingTheme ? "Uploading..." : "Upload your own image"}</p>
                    <p className="text-[11px] text-white/45">Custom background for your profile</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {THEME_PATTERNS.map((p) => {
                    const active = !customThemeImage && selectedPattern === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectTheme(p.id)}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`w-full aspect-square rounded-xl border overflow-hidden transition ${active ? "border-[#E53945] ring-2 ring-[#E53945]/30" : "border-white/10 hover:border-white/25"}`}
                          style={getThemeBackdropStyle(getBackdropFromColor(selectedColor, p.id) || (p.id === "none" ? `linear-gradient(to bottom, ${selectedColor}, #09090b)` : JSON.stringify({ __trooflixTheme: true, v: 1, color: selectedColor, pattern: p.id })))}
                        />
                        <span className={`text-[10px] font-medium leading-tight text-center ${active ? "text-white" : "text-white/55"}`}>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          {status.message && (
            <div className={`mx-5 mb-1 rounded-xl px-4 py-3 text-sm font-medium border ${status.type === "success" ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-200" : "bg-red-500/10 border-red-400/25 text-red-200"}`}>
              {status.message}
            </div>
          )}

          {/* Save Button */}
          <div className="p-5 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="group relative w-full overflow-hidden flex items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/[0.10] hover:bg-white/[0.16] disabled:opacity-50 text-white font-bold py-4 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#E53945]/20 via-white/5 to-[#E53945]/20 opacity-80 pointer-events-none" />
              <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/15 border border-white/20">
                <Check size={15} className="text-white" />
              </span>
              <span className="relative">{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
      
      <MobileBottomNav />
    </main>
  );
}

export default function ProfileSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0303] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>}>
      <ProfileSettingsContent />
    </Suspense>
  );
}
