"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Save, User, AtSign, AlignLeft, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";
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
        setBackdropUrl(data.backdrop_url || "");
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

      setStatus({ type: "success", message: "Profile updated successfully!" });
      clearUserCache();
      setTimeout(() => { router.push("/creator-dashboard"); }, 1500);

    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      
            {isOnboarding && (
        <div className="max-w-2xl mx-auto mb-8 bg-gradient-to-r from-[#E53945]/20 via-[#E53945]/10 to-transparent border border-[#E53945]/30 rounded-2xl p-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E53945]/30 flex items-center justify-center shrink-0">
              <span className="text-xl">👋</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-white mb-1">Welcome to Trooflix!</h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Let's set up your profile. Add a photo, bio, and social handles so people can find you.
                Once you save, you'll be taken to your dashboard.
              </p>
            </div>
          </div>
        </div>
      )}
<div className="max-w-2xl mx-auto pt-24">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 mb-2">
            <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
        <ArrowLeft size={16} /> Skip for now
      </Link>
            <h1 className="text-base font-semibold">Edit profile</h1>
            <div className="w-8"></div>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center py-6 border-b border-white/10">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e] relative z-10 flex items-center justify-center">
              {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="text-3xl font-black text-white/20">{displayName.charAt(0) || "?"}</div>}
            </div>
            <div className="absolute inset-0 z-20 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[#E53945] text-sm font-semibold mt-4 hover:text-[#d12e39] transition">
            Edit picture or avatar
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        </div>

        {/* Instagram Style Form Rows */}
        <form onSubmit={saveProfile}>
          <div className="flex flex-col w-full">
            
            {/* Name */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/90 w-1/3">Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name" className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/40 text-right" required />
            </div>

            {/* Username */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/90 w-1/3">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/40 text-right" required />
            </div>

            {/* Bio */}
            <div className="flex items-start justify-between px-4 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/90 w-1/3 pt-0.5">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/40 text-right resize-none" />
            </div>

            {/* Instagram */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/90 w-1/3">Instagram</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="username" className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/40 text-right" />
            </div>

            {/* X */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <label className="text-sm font-semibold text-white/90 w-1/3">X (Twitter)</label>
              <input type="text" value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="username" className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/40 text-right" />
            </div>

          </div>

          {/* Status Message */}
          {status.message && (
            <div className={`mx-4 mt-4 rounded-xl px-4 py-3 text-sm font-medium ${status.type === "success" ? "bg-emerald-950/30 border border-emerald-600/40 text-emerald-300" : "bg-red-950/30 border border-red-600/40 text-red-300"}`}>
              {status.message}
            </div>
          )}

          {/* Save Button */}
          <div className="p-4 mt-2">
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(229,57,69,0.3)]">
              {saving ? "Saving..." : "Save"}
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
