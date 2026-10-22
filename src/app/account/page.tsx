"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, LogOut, Check, Trash2, ChevronLeft, Camera, Image as ImageIcon, User, AtSign, Mail } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache, getCachedUser, getCachedCreators } from "@/lib/cache";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // Profile Data
  const [avatarUrl, setAvatarUrl] = useState("");
  const [backdropUrl, setBackdropUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");

  // Upload State
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [backdropProgress, setBackdropProgress] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const backdropInput = useRef<HTMLInputElement>(null);

  // Username State
  const [usernameStatus, setUsernameStatus] = useState<"" | "checking" | "available" | "taken" | "invalid">("");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  const [followedCreators, setFollowedCreators] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then((user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      const u = { id: user.id, email: user.email || "" };
      setUser(u);

      fetch(`/api/profile?user_id=${u.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.profile) {
            setAvatarUrl(d.profile.avatar_url || "");
            setBackdropUrl(d.profile.backdrop_url || "");
            setDisplayName(d.profile.display_name || "");
            setBio(d.profile.bio || "");
            setUsername(d.profile.username || "");
            setSavedUsername(d.profile.username || "");
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));

      fetch(`/api/follows?user_id=${u.id}`)
        .then((r) => r.json())
        .then((d) => {
          const ids = Array.isArray(d.ids) ? d.ids : [];
          if (ids.length === 0) return;
          return getCachedCreators().then((creators: any[]) => {
            setFollowedCreators(creators.filter((c) => ids.includes(c.id)));
          });
        })
        .catch(() => {});
    });
  }, []);

  const handleUpload = async (file: File, type: "avatar" | "backdrop") => {
    const isAvatar = type === "avatar";
    if (isAvatar) { setUploadingAvatar(true); setAvatarProgress(0); }
    else { setUploadingBackdrop(true); setBackdropProgress(0); }
    setStatus("");

    try {
      const folder = isAvatar ? "avatars" : "backdrops";
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
      });
      if (!res.ok) throw new Error("Upload prep failed");
      const { signedUrl, publicUrl } = await res.json();

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          if (isAvatar) setAvatarProgress(pct); else setBackdropProgress(pct);
        }
      };
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (isAvatar) setAvatarUrl(publicUrl); else setBackdropUrl(publicUrl);
          
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              userId: user!.id, 
              ...(isAvatar ? { avatarUrl: publicUrl } : { backdropUrl: publicUrl })
            }),
          });
          setStatus(`✅ ${isAvatar ? "Avatar" : "Backdrop"} saved`);
          setTimeout(() => setStatus(""), 2500);
        } else {
          setStatus("❌ Upload failed");
        }
        if (isAvatar) { setUploadingAvatar(false); setAvatarProgress(0); }
        else { setUploadingBackdrop(false); setBackdropProgress(0); }
      };
      xhr.onerror = () => { setStatus("❌ Network error"); if (isAvatar) setUploadingAvatar(false); else setUploadingBackdrop(false); };
      xhr.send(file);
    } catch (e: any) {
      setStatus("❌ " + e.message);
      if (isAvatar) setUploadingAvatar(false); else setUploadingBackdrop(false);
    }
  };

  const saveDetails = async () => {
    if (!user) return;
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, displayName: displayName.trim(), bio: bio.trim() }),
    });
    setStatus("✅ Details saved");
    setTimeout(() => setStatus(""), 2500);
  };

  // Username debounced check
  useEffect(() => {
    if (!user) return;
    const raw = username.trim().toLowerCase().replace(/^@+/, "");
    if (raw === "") { setUsernameStatus(""); setUsernameError(""); return; }
    if (raw === savedUsername) { setUsernameStatus(""); setUsernameError(""); return; }
    setUsernameStatus("checking");
    const t = setTimeout(() => {
      fetch(`/api/username?check=${encodeURIComponent(raw)}&for=${user.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.available) { setUsernameStatus("available"); setUsernameError(""); }
          else { setUsernameStatus(d.error === "Taken" ? "taken" : "invalid"); setUsernameError(d.error || "Unavailable"); }
        })
        .catch(() => setUsernameStatus("invalid"));
    }, 500);
    return () => clearTimeout(t);
  }, [username, savedUsername, user]);

  const saveUsername = async () => {
    if (!user) return;
    const raw = username.trim().toLowerCase().replace(/^@+/, "");
    if (!raw) return;
    setSavingUsername(true);
    const res = await fetch("/api/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, username: raw }),
    });
    const d = await res.json();
    setSavingUsername(false);
    if (!res.ok) { setUsernameStatus("taken"); setUsernameError(d.error || "Could not save"); return; }
    setUsername(d.username); setSavedUsername(d.username);
    setUsernameStatus(""); setUsernameError("");
    setStatus("✅ Username saved"); setTimeout(() => setStatus(""), 2500);
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserCache();
    router.push("/");
    router.refresh();
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50">Loading…</div>;
  if (!user) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <p className="text-white/50 mb-4">You're not signed in.</p>
      <Link href="/login" className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold">Sign In</Link>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32">
      <TopBar />

      <div className="pt-28 max-w-3xl mx-auto px-4 md:px-6">
        
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition">
            <ChevronLeft size={16} /> Back to Profile
          </Link>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">Account Settings</h1>
          <p className="text-white/50">Manage your public identity and preferences.</p>
        </div>

        {/* Status Toast */}
        {status && (
          <div className={`p-4 mb-6 rounded-xl border text-sm font-semibold ${status.startsWith("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {status}
          </div>
        )}

        <div className="space-y-6">
          
          {/* Hero Backdrop Section */}
          <section className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <ImageIcon size={20} className="text-white/70" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Hero Backdrop</h2>
                <p className="text-xs text-white/50">The large image at the top of your profile.</p>
              </div>
            </div>
            
            <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden bg-black/50 border border-white/10 mb-4 group">
              {backdropUrl ? (
                <img src={backdropUrl} alt="Backdrop" className="w-full h-full object-cover group-hover:opacity-70 transition" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-sm">No backdrop uploaded</span>
                </div>
              )}
              <button 
                onClick={() => backdropInput.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
              >
                <span className="bg-white text-black font-bold px-6 py-2 rounded-xl">Upload Backdrop</span>
              </button>
            </div>
            <input ref={backdropInput} type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], "backdrop"); e.target.value = ""; }} className="hidden" />
            {uploadingBackdrop && <p className="text-sm text-yellow-400">Uploading backdrop... {backdropProgress}%</p>}
          </section>

          {/* Avatar Section */}
          <section className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Camera size={20} className="text-white/70" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Profile Avatar</h2>
                <p className="text-xs text-white/50">Your profile picture. Square images work best.</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#1c1c1e] bg-black flex-shrink-0 shadow-xl relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-red-900 text-3xl font-black">{user.email[0].toUpperCase()}</div>
                )}
              </div>
              
              <div className="flex-1 flex gap-3 flex-wrap">
                <button 
                  onClick={() => avatarInput.current?.click()} 
                  disabled={uploadingAvatar}
                  className="bg-white text-black font-bold px-5 py-2.5 rounded-xl hover:scale-105 transition disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  <Upload size={16} /> {uploadingAvatar ? `${avatarProgress}%` : "Upload New"}
                </button>
                {avatarUrl && !uploadingAvatar && (
                  <button onClick={async () => { if(confirm("Remove avatar?")) { setAvatarUrl(""); await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, avatarUrl: "" }) }); } }} className="bg-red-500/10 text-red-400 font-bold px-5 py-2.5 rounded-xl hover:bg-red-500/20 transition flex items-center gap-2 text-sm">
                    <Trash2 size={16} /> Remove
                  </button>
                )}
              </div>
            </div>
            <input ref={avatarInput} type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0], "avatar"); e.target.value = ""; }} className="hidden" />
          </section>

          {/* Edit Details Section */}
          <section className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <User size={20} className="text-white/70" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Edit Details</h2>
                <p className="text-xs text-white/50">Update your public display name and bio.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  maxLength={40}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={160}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-red-500 transition resize-none"
                />
                <p className="text-[10px] text-white/40 text-right mt-1">{bio.length}/160</p>
              </div>
              <button onClick={saveDetails} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition flex items-center gap-2 text-sm w-full md:w-auto">
                <Check size={16} /> Save Details
              </button>
            </div>
          </section>

          {/* Username & Email Section */}
          <section className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <AtSign size={20} className="text-white/70" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Account Identity</h2>
                <p className="text-xs text-white/50">Manage your unique handle and email.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Username</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center bg-black/40 border border-white/10 rounded-xl focus-within:border-red-500 transition px-4">
                    <span className="text-white/40">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="yourhandle"
                      maxLength={20}
                      className="flex-1 bg-transparent py-3 px-2 outline-none text-white"
                    />
                  </div>
                  <button onClick={saveUsername} disabled={savingUsername || usernameStatus === "taken" || usernameStatus === "invalid"} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition disabled:opacity-50 flex items-center gap-2 text-sm">
                    <Check size={16} /> Save
                  </button>
                </div>
                <div className="mt-2 text-xs h-4">
                  {usernameStatus === "checking" && <span className="text-yellow-400">Checking…</span>}
                  {usernameStatus === "available" && <span className="text-green-400">@{username} is available</span>}
                  {usernameStatus === "taken" && <span className="text-red-400">@{username} is taken</span>}
                  {usernameStatus === "invalid" && <span className="text-red-400">{usernameError}</span>}
                  {usernameStatus === "" && savedUsername && <span className="text-white/40">Current: @{savedUsername}</span>}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email Address</label>
                <div className="flex items-center bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white/50">
                  <Mail size={18} className="mr-3" />
                  {user.email}
                </div>
              </div>
            </div>
          </section>

          {/* Following Section */}
          <section className="bg-[#1c1c1e]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <h2 className="text-lg font-bold mb-4">Following ({followedCreators.length})</h2>
            {followedCreators.length === 0 ? (
              <p className="text-white/50 text-sm">You're not following any creators yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {followedCreators.map((c) => (
                  <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition border border-transparent hover:border-white/10">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-900 flex items-center justify-center font-bold">{c.name[0]}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{c.name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Danger Zone */}
          <section className="border border-red-500/20 bg-red-500/5 rounded-3xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-red-400 mb-2">Log Out</h2>
            <p className="text-sm text-white/50 mb-4">Sign out of your Trooflix account on this device.</p>
            <button onClick={logout} className="bg-red-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-600 transition flex items-center gap-2">
              <LogOut size={18} /> Log Out
            </button>
          </section>

        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
