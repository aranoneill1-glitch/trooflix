"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Video } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  
  // Toggle between the two tiers
  const [activeTab, setActiveTab] = useState<"troopass" | "creator">("troopass");
  const [featured, setFeatured] = useState<{ backdropUrl?: string; title?: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const videos = Array.isArray(data) ? data : [];
        const featuredVideos = videos.filter((v: any) => v.featured && v.backdropUrl);
        const pool = featuredVideos.length > 0 ? featuredVideos : videos.filter((v: any) => v.backdropUrl);
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          setFeatured({ backdropUrl: pick.backdropUrl, title: pick.title });
        }
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!emailOk) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const cleanHandle = handle.replace(/^@/, "").trim();
    if (cleanHandle.length < 3) {
      setError("Handle must be at least 3 characters.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: cleanHandle,
            username: cleanHandle,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed.");

      // 2. Create Profile via Secure Admin API
      const profileRes = await fetch("/api/signup-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          username: cleanHandle,
          displayName: cleanHandle,
          tier: activeTab === "troopass" ? "user" : "creator",
        }),
      });

      if (!profileRes.ok) {
        const errorData = await profileRes.json();
        throw new Error(errorData.error || "Failed to create profile");
      }

      clearUserCache();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred during signup.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white flex flex-col items-center py-12 px-4 selection:bg-[#E53945]/30 relative overflow-hidden">
      
      {/* Background Featured Image */}
      {featured?.backdropUrl && (
        <>
          <img src={featured.backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0303]/80 via-[#0a0303]/95 to-[#0a0303]" />
        </>
      )}

      {/* Top ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] bg-[#E53945]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Join Trooflix</h1>
          <p className="text-sm text-white/50">Choose how you want to use the platform.</p>
        </div>

        {/* --- SIDE-BY-SIDE PRICING CARDS --- */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          
          {/* Viewer Card */}
          <div 
            onClick={() => setActiveTab("troopass")}
            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              activeTab === "troopass" 
                ? "bg-[#E53945]/10 border-[#E53945] shadow-[0_0_20px_rgba(229,57,69,0.15)]" 
                : "bg-white/5 border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
            }`}
          >
            <div>
              <Sparkles size={20} className={activeTab === "troopass" ? "text-[#E53945] mb-3" : "text-white/50 mb-3"} />
              <h3 className="text-lg font-black leading-tight mb-1">Viewer</h3>
              <p className="text-[10px] text-white/50 mb-3 uppercase tracking-wider font-bold">TrooPass</p>
              
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black">$3.99</span>
                <span className="text-[10px] text-white/50">/mo</span>
              </div>

              <ul className="space-y-2 text-[11px] text-white/80">
                <li className="flex items-start gap-1.5 leading-tight"><Check size={12} className="text-[#E53945] shrink-0 mt-0.5"/> Ad-free</li>
                <li className="flex items-start gap-1.5 leading-tight"><Check size={12} className="text-[#E53945] shrink-0 mt-0.5"/> Exclusives</li>
                <li className="flex items-start gap-1.5 leading-tight"><Check size={12} className="text-[#E53945] shrink-0 mt-0.5"/> Commenting</li>
              </ul>
            </div>
          </div>

          {/* Creator Card */}
          <div 
            onClick={() => setActiveTab("creator")}
            className={`cursor-pointer rounded-2xl p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
              activeTab === "creator" 
                ? "bg-[#E53945]/10 border-[#E53945] shadow-[0_0_20px_rgba(229,57,69,0.15)]" 
                : "bg-white/5 border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
            }`}
          >
            <div>
              <Video size={20} className={activeTab === "creator" ? "text-[#E53945] mb-3" : "text-white/50 mb-3"} />
              <h3 className="text-lg font-black leading-tight mb-1">Creator</h3>
              <p className="text-[10px] text-white/50 mb-3 uppercase tracking-wider font-bold">Studio</p>
              
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black">$9.99</span>
                <span className="text-[10px] text-white/50">/mo</span>
              </div>

              <ul className="space-y-2 text-[11px] text-white/80">
                <li className="flex items-start gap-1.5 leading-tight"><Check size={12} className="text-[#E53945] shrink-0 mt-0.5"/> Upload videos</li>
                <li className="flex items-start gap-1.5 leading-tight"><Check size={12} className="text-[#E53945] shrink-0 mt-0.5"/> 90% revenue</li>
                <li className="flex items-start gap-1.5 leading-tight"><Check size={12} className="text-[#E53945] shrink-0 mt-0.5"/> Custom Hub</li>
              </ul>
            </div>
          </div>

        </div>

        {/* --- SIGNUP FORM --- */}
        <form onSubmit={submit} className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 md:p-6 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5">Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                <input 
                  required 
                  type="text" 
                  value={handle} 
                  onChange={e => setHandle(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-3 text-sm text-white focus:outline-none focus:border-[#E53945] transition" 
                  placeholder="username" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5">Email</label>
              <input 
                required 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#E53945] transition" 
                placeholder="you@example.com" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-1.5">Password</label>
              <input 
                required 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#E53945] transition" 
                placeholder="Min 6 characters" 
                autoComplete="new-password" 
              />
            </div>
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="peer sr-only" />
              <div className="w-4 h-4 border border-white/20 rounded bg-black/40 peer-checked:bg-[#E53945] peer-checked:border-[#E53945] transition-colors flex items-center justify-center">
                <Check size={10} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[11px] text-white/50 leading-snug group-hover:text-white/70 transition">
              I agree to the <Link href="/terms" className="text-white underline">Terms of Service</Link> and Privacy Policy.
            </span>
          </label>

          <button 
            disabled={loading || !ready} 
            type="submit" 
            className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Create ${activeTab === "troopass" ? "Viewer" : "Creator"} Account`
            )}
          </button>
        </form>

        <p className="text-center text-xs text-white/40 mt-6">
          Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
