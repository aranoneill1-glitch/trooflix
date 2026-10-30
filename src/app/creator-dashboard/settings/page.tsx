"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Save, User, AtSign, AlignLeft, Image as ImageIcon, Check, Search } from "lucide-react";
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

const THEMES = [
  { name: "Trooflix Black", value: "" },
  { name: "Midnight", value: "linear-gradient(to bottom, #0f172a, #09090b)" },
  { name: "Crimson", value: "linear-gradient(to bottom, #450a0a, #09090b)" },
  { name: "Emerald", value: "linear-gradient(to bottom, #022c22, #09090b)" },
  { name: "Royal Purple", value: "linear-gradient(to bottom, #2e1065, #09090b)" },
  { name: "Sunset", value: "linear-gradient(to bottom, #431407, #09090b)" },
  { name: "Cyberpunk", value: "linear-gradient(to bottom, #4a044e, #09090b)" },
  { name: "Deep Space", value: "linear-gradient(to bottom, #1e1b4b, #09090b)" },
  { name: "Rose Gold", value: "linear-gradient(to bottom, #4c0519, #09090b)" },
  { name: "Oceanic", value: "linear-gradient(to bottom, #083344, #09090b)" },
  { name: "Midas", value: "linear-gradient(to bottom, #422006, #09090b)" },
  { name: "Slate", value: "linear-gradient(to bottom, #1e293b, #09090b)" },
  { name: "Blood Moon", value: "linear-gradient(to bottom, #7f1d1d, #09090b)" },
  { name: "Forest Night", value: "linear-gradient(to bottom, #064e3b, #09090b)" },
  { name: "Abyss", value: "linear-gradient(to bottom, #020617, #09090b)" },
  { name: "Neon Pink", value: "linear-gradient(to bottom, #831843, #09090b)" },
  { name: "Desert", value: "linear-gradient(to bottom, #78350f, #09090b)" },
  { name: "Twilight", value: "linear-gradient(to bottom, #312e81, #09090b)" },
  { name: "Wine", value: "linear-gradient(to bottom, #4c0519, #09090b)" },
  { name: "Toxic", value: "linear-gradient(to bottom, #3f6212, #09090b)" },
  { name: "Monochrome", value: "linear-gradient(to bottom, #262626, #09090b)" },
  { name: "Golden Hour", value: "linear-gradient(to bottom, #713f12, #09090b)" },
  { name: "Arctic", value: "linear-gradient(to bottom, #164e63, #09090b)" },
  { name: "Plum", value: "linear-gradient(to bottom, #581c87, #09090b)" },
  { name: "Blood Red", value: "linear-gradient(to bottom, #991b1b, #09090b)" },
  { name: "Neon Green", value: "linear-gradient(to bottom, #166534, #09090b)" },
  { name: "Midnight Blue", value: "linear-gradient(to bottom, #1e3a8a, #09090b)" },
  { name: "Volcano", value: "linear-gradient(to bottom, #9a3412, #09090b)" },
  { name: "Mint", value: "linear-gradient(to bottom, #065f46, #09090b)" },
  { name: "Grape", value: "linear-gradient(to bottom, #4a044e, #09090b)" },
  { name: "Charcoal", value: "linear-gradient(to bottom, #171717, #09090b)" },
  { name: "Amber", value: "linear-gradient(to bottom, #b45309, #09090b)" },
  { name: "Cyan", value: "linear-gradient(to bottom, #0e7490, #09090b)" },
  { name: "Violet", value: "linear-gradient(to bottom, #6d28d9, #09090b)" },
  { name: "Coral", value: "linear-gradient(to bottom, #be123c, #09090b)" },
  { name: "Forest", value: "linear-gradient(to bottom, #15803d, #09090b)" },
  { name: "Navy", value: "linear-gradient(to bottom, #172554, #09090b)" },
  { name: "Rust", value: "linear-gradient(to bottom, #7c2d12, #09090b)" },
  { name: "Teal", value: "linear-gradient(to bottom, #115e59, #09090b)" },
  { name: "Fuchsia", value: "linear-gradient(to bottom, #86198f, #09090b)" },
  { name: "Cobalt", value: "linear-gradient(to bottom, #1d4ed8, #09090b)" },
  { name: "Copper", value: "linear-gradient(to bottom, #9a3412, #09090b)" },
  { name: "Ice", value: "linear-gradient(to bottom, #0ea5e9, #09090b)" },
  { name: "Magenta", value: "linear-gradient(to bottom, #a21caf, #09090b)" },
  { name: "Lava", value: "linear-gradient(to bottom, #dc2626, #09090b)" },
  { name: "Jungle", value: "linear-gradient(to bottom, #166534, #09090b)" },
  { name: "Storm", value: "linear-gradient(to bottom, #334155, #09090b)" },
  { name: "Sand", value: "linear-gradient(to bottom, #a16207, #09090b)" },
  { name: "Azure", value: "linear-gradient(to bottom, #0284c7, #09090b)" },
  { name: "Lilac", value: "linear-gradient(to bottom, #7e22ce, #09090b)" },
  { name: "Cherry", value: "linear-gradient(to bottom, #e11d48, #09090b)" },
  { name: "Olive", value: "linear-gradient(to bottom, #4d7c0f, #09090b)" },
  { name: "Steel", value: "linear-gradient(to bottom, #475569, #09090b)" },
  { name: "Apricot", value: "linear-gradient(to bottom, #ea580c, #09090b)" },
  { name: "Sky", value: "linear-gradient(to bottom, #0369a1, #09090b)" },
  { name: "Lavender", value: "linear-gradient(to bottom, #8b5cf6, #09090b)" },
  { name: "Ruby", value: "linear-gradient(to bottom, #b91c1c, #09090b)" },
  { name: "Moss", value: "linear-gradient(to bottom, #3f6212, #09090b)" },
  { name: "Graphite", value: "linear-gradient(to bottom, #374151, #09090b)" },
  { name: "Tangerine", value: "linear-gradient(to bottom, #c2410c, #09090b)" },
  { name: "Denim", value: "linear-gradient(to bottom, #1e40af, #09090b)" },
  { name: "Orchid", value: "linear-gradient(to bottom, #9333ea, #09090b)" },
  { name: "Raspberry", value: "linear-gradient(to bottom, #be185d, #09090b)" },
  { name: "Basil", value: "linear-gradient(to bottom, #15803d, #09090b)" },
  { name: "Silver", value: "linear-gradient(to bottom, #52525b, #09090b)" },
  { name: "Peach", value: "linear-gradient(to bottom, #f97316, #09090b)" },
  { name: "Marine", value: "linear-gradient(to bottom, #1e3a8a, #09090b)" },
  { name: "Amethyst", value: "linear-gradient(to bottom, #6b21a8, #09090b)" },
  { name: "Burgundy", value: "linear-gradient(to bottom, #7f1d1d, #09090b)" },
  { name: "Sage", value: "linear-gradient(to bottom, #166534, #09090b)" },
  { name: "Ash", value: "linear-gradient(to bottom, #404040, #09090b)" },
  { name: "Marigold", value: "linear-gradient(to bottom, #d97706, #09090b)" },
  { name: "Indigo", value: "linear-gradient(to bottom, #3730a3, #09090b)" },
  { name: "Mulberry", value: "linear-gradient(to bottom, #701a75, #09090b)" },
  { name: "Carnelian", value: "linear-gradient(to bottom, #991b1b, #09090b)" },
  { name: "Fern", value: "linear-gradient(to bottom, #14532d, #09090b)" },
  { name: "Pewter", value: "linear-gradient(to bottom, #4b5563, #09090b)" },
  { name: "Cider", value: "linear-gradient(to bottom, #b45309, #09090b)" },
  { name: "Sapphire", value: "linear-gradient(to bottom, #1e40af, #09090b)" },
  { name: "Byzantium", value: "linear-gradient(to bottom, #581c87, #09090b)" },
  { name: "Carmine", value: "linear-gradient(to bottom, #b91c1c, #09090b)" },
  { name: "Clipper", value: "linear-gradient(to bottom, #064e3b, #09090b)" },
  { name: "Gunmetal", value: "linear-gradient(to bottom, #27272a, #09090b)" },
  { name: "Rustic", value: "linear-gradient(to bottom, #9a3412, #09090b)" },
  { name: "Dodger", value: "linear-gradient(to bottom, #1d4ed8, #09090b)" },
  { name: "Imperial", value: "linear-gradient(to bottom, #4a044e, #09090b)" },
  { name: "Alizarin", value: "linear-gradient(to bottom, #dc2626, #09090b)" },
  { name: "Shamrock", value: "linear-gradient(to bottom, #15803d, #09090b)" },
  { name: "Onyx", value: "linear-gradient(to bottom, #18181b, #09090b)" },
  { name: "Bronze", value: "linear-gradient(to bottom, #78350f, #09090b)" },
  { name: "Cerulean", value: "linear-gradient(to bottom, #0284c7, #09090b)" },
  { name: "Mauve", value: "linear-gradient(to bottom, #6d28d9, #09090b)" },
  { name: "Venetian", value: "linear-gradient(to bottom, #b91c1c, #09090b)" },
  { name: "Laurel", value: "linear-gradient(to bottom, #3f6212, #09090b)" },
  { name: "Smoke", value: "linear-gradient(to bottom, #3f3f46, #09090b)" },
  { name: "Tuscan", value: "linear-gradient(to bottom, #b45309, #09090b)" },
  { name: "Azul", value: "linear-gradient(to bottom, #172554, #09090b)" },
  { name: "Seance", value: "linear-gradient(to bottom, #4c0519, #09090b)" },
  { name: "Cinnabar", value: "linear-gradient(to bottom, #991b1b, #09090b)" },
  { name: "Avocado", value: "linear-gradient(to bottom, #166534, #09090b)" },
  { name: "Zinc", value: "linear-gradient(to bottom, #27272a, #09090b)" },
  { name: "Flax", value: "linear-gradient(to bottom, #a16207, #09090b)" },
  { name: "Ultramarine", value: "linear-gradient(to bottom, #1e3a8a, #09090b)" },
  { name: "Tyrian", value: "linear-gradient(to bottom, #86198f, #09090b)" },
  { name: "Crimson Lake", value: "linear-gradient(to bottom, #7f1d1d, #09090b)" },
  { name: "Hunter", value: "linear-gradient(to bottom, #064e3b, #09090b)" },
  { name: "Graphite", value: "linear-gradient(to bottom, #374151, #09090b)" },
];

export default function ProfileSettingsPage() {
  const router = useRouter();
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
  
  // Theme search state
  const [themeSearch, setThemeSearch] = useState("");

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

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw new Error("Failed to upload image: " + uploadError.message);
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
        finalAvatarUrl = publicUrl;
      }

      // STRICT SANITIZATION FOR USERNAME
      const cleanUsername = username.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

      // Sanitize socials (only strip @, preserve case and other chars)
      const cleanIg = instagram.replace(/^@/, "").trim();
      const cleanX = xHandle.replace(/^@/, "").trim();

      const { error } = await supabase.from("profiles").update({
        display_name: displayName,
        username: cleanUsername,
        instagram_handle: cleanIg,
        x_handle: cleanX,
        bio: bio,
        avatar_url: finalAvatarUrl,
        backdrop_url: backdropUrl,
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

  // Filter themes based on search
  const filteredThemes = useMemo(() => {
    if (!themeSearch) return THEMES;
    return THEMES.filter(t => t.name.toLowerCase().includes(themeSearch.toLowerCase()));
  }, [themeSearch]);

  if (loading) return <div className="min-h-screen bg-[#09090B] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" /></div>;

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
          
          <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#09090B] ring-2 ring-white/10 bg-black flex-shrink-0 relative z-10">
                {avatarUrl ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/20">{displayName.charAt(0) || "?"}</div>}
              </div>
              <div className="absolute inset-0 z-20 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={28} className="text-white" />
              </div>
            </div>
            <p className="text-sm font-semibold text-white mt-4">Change Profile Photo</p>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>

          <div className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                <User size={14} /> Display Name
              </label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. John Doe" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-[#E53945] transition" required />
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                <AtSign size={14} /> Username Handle
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="johndoe" className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:border-[#E53945] transition" required />
              </div>
            </div>

            <div className="h-px bg-white/5 my-2" />

            {/* THEME PICKER DATABASE */}
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
                <ImageIcon size={14} /> Profile Theme
              </label>
              
              {/* SEARCH BAR */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input 
                  type="text" 
                  placeholder="Search themes (e.g., 'Crimson', 'Ocean')..." 
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[#E53945] transition"
                />
              </div>

              {/* SCROLLABLE THEME GRID */}
              <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                {filteredThemes.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => setBackdropUrl(theme.value)}
                    className={`relative h-16 rounded-xl overflow-hidden border-2 transition-all flex items-end justify-center pb-1 ${
                      backdropUrl === theme.value ? "border-white scale-105 shadow-lg z-10" : "border-transparent hover:scale-105"
                    }`}
                    style={{ background: theme.value || "#09090B" }}
                  >
                    {backdropUrl === theme.value && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Check size={16} className="text-white drop-shadow-md" />
                      </div>
                    )}
                    <span className="relative z-10 text-[9px] font-bold text-white drop-shadow-md truncate w-full text-center px-1">
                      {theme.name}
                    </span>
                  </button>
                ))}
                {filteredThemes.length === 0 && (
                  <div className="col-span-4 text-center py-6 text-white/40 text-sm">
                    No themes found matching "{themeSearch}"
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-white/5 my-2" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2"><InstagramIcon size={14} /> Instagram</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                  <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="username" className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:border-[#E53945] transition" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2"><XIcon size={14} /> X (Twitter)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                  <input type="text" value={xHandle} onChange={(e) => setXHandle(e.target.value)} placeholder="username" className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-white outline-none focus:border-[#E53945] transition" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2"><AlignLeft size={14} /> Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell your viewers about yourself..." rows={4} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white outline-none focus:border-[#E53945] transition resize-none" />
            </div>

          </div>

          {status.message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${status.type === "success" ? "bg-emerald-950/30 border border-emerald-600/40 text-emerald-300" : "bg-red-950/30 border border-red-600/40 text-red-300"}`}>
              {status.message}
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(229,57,69,0.3)]">
            <Save size={18} /> {saving ? "Saving Changes…" : "Save Profile"}
          </button>

        </form>
      </div>
      <MobileBottomNav />
    </main>
  );
}
