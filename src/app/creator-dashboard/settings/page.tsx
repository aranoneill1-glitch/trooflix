"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Save, User, AtSign, AlignLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser, clearUserCache } from "@/lib/cache";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

// Custom SVGs because this version of lucide-react lacks brand icons
const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function ProfileSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  // Form State
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [instagram, setInstagram] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      
      fetch(`/api/profile?user_id=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) {
            setDisplayName(d.profile.display_name || "");
            setUsername(d.profile.username || "");
            setInstagram(d.profile.instagram_handle || "");
            setXHandle(d.profile.x_handle || "");
            setBio(d.profile.bio || "");
            setAvatarUrl(d.profile.avatar_url || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    });
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file)); // Preview
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      let finalAvatarUrl = avatarUrl;

      // 1. Upload image if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });

        if (uploadError) throw new Error("Failed to upload image: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
        finalAvatarUrl = publicUrl;
      }

      // 2. Update Profile
      const cleanUsername = username.replace(/^@/, "").trim();
      const cleanIg = instagram.replace(/^@/, "").trim();
      const cleanX = xHandle.replace(/^@/, "").trim();

      const { error } = await supabase.from("profiles").update({
        display_name: displayName,
        username: cleanUsername,
        instagram_handle: cleanIg,
        x_handle: cleanX,
        bio: bio,
        avatar_url: finalAvatarUrl,
      }).eq("user_id", userId);

      if (error) throw error;

      setStatus({ type: "success", message: "Profile updated successfully!" });
      clearUserCache(); // Refresh cache so UI updates immediately
      
      setTimeout(() => {
        router.push("/creator-dashboard");
      }, 1500);

    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Failed to save profile." });
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
    <main className="min-h-screen bg-[#09090B] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-6">
        
        <Link href="/creator-dashboard" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white mb-8 transition">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Edit Profile</h1>
          <p className="text-sm text-white/50">Manage your public presence and social links.</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-6">
          
          {/* Avatar Section */}
          <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center">
            <div 
              className="relative group cursor-pointer" 
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#09090B] ring-2 ring-white/10 bg-black flex-shrink-0 relative z-10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/20">
                    {displayName.charAt(0) || "?"}
                  </div>
                )}
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 z-20 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={28} className="text-white" />
              </div>
            </div>
            <p className="text-sm font-semibold text-white mt-4">Change Profile Photo</p>
            <p className="text-xs text-white/40 mt-1">JPG, PNG or GIF. Max 5MB.</p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Form Fields */}
          <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            
            {/* Display Name */}
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User size={14} /> Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-[#E53945] transition"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AtSign size={14} /> Username Handle
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:border-[#E53945] transition"
                  required
                />
              </div>
            </div>

            <div className="h-px bg-white/5 my-2" />

            {/* Social Handles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <InstagramIcon size={14} /> Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="username"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:border-[#E53945] transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <XIcon size={14} /> X (Twitter)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                  <input
                    type="text"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    placeholder="username"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:border-[#E53945] transition"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlignLeft size={14} /> Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell your viewers about yourself..."
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-[#E53945] transition resize-none"
              />
            </div>

          </div>

          {/* Status Message */}
          {status.message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
              status.type === "success" ? "bg-emerald-950/30 border border-emerald-600/40 text-emerald-300" : "bg-red-950/30 border border-red-600/40 text-red-300"
            }`}>
              {status.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(229,57,69,0.3)]"
          >
            <Save size={18} /> {saving ? "Saving Changes…" : "Save Profile"}
          </button>

        </form>
      </div>

      <MobileBottomNav />
    </main>
  );
}
