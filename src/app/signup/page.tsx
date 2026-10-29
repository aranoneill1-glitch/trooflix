"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Sparkles, Video, Crown, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";

export default function SignupPage() {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [featured, setFeatured] = useState<{ backdropUrl?: string } | null>(null);
  const [ready, setReady] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"troopass" | "creator">("troopass");

  const router = useRouter();
  const supabase = createClient();

  // Load featured video for the cinematic left panel
  useEffect(() => {
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const videos = Array.isArray(data) ? data : [];
        const featuredVideos = videos.filter((v: any) => v.featured);
        if (featuredVideos.length > 0) {
          const pick = featuredVideos[Math.floor(Math.random() * featuredVideos.length)];
          setFeatured({ backdropUrl: pick.backdropUrl });
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError("You must agree to the Terms of Service.");
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
      // 1. Check username availability (Optional: depends on your API setup)
      // const checkRes = await fetch(`/api/username?handle=${cleanHandle}`);
      // if (!checkRes.ok) throw new Error("Handle already taken");

      // 2. Create Auth User
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

      // 3. Create Profile (If your DB trigger doesn't handle this)
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: authData.user.id,
        username: cleanHandle,
        display_name: cleanHandle,
        tier: "free",
      });

      if (profileError) throw profileError;

      clearUserCache();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred during signup.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden selection:bg-red-600/30">
      
      {/* ============ LEFT / TOP: CINEMATIC BRANDING ============ */}
      <div className="relative md:w-1/2 h-[30vh] md:h-screen flex-shrink-0 overflow-hidden">
        {featured?.backdropUrl ? (
          <>
            <img
              src={featured.backdropUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/60 to-black/40 md:to-black" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-black to-black" />
        )}

        <div className="absolute top-0 left-0 right-0 p-6 md:p-10 z-10">
          <Link href="/" className="text-2xl md:text-3xl font-black tracking-tight">
            <span className="text-white">TROO</span>
            <span className="text-red-600">FLIX</span>
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <div className="max-w-md">
            <p className="text-red-500 text-xs tracking-[0.3em] font-bold mb-3 uppercase">
              Truth Without Censorship
            </p>
            <h1 className="text-2xl md:text-5xl font-black leading-tight mb-4">
              No ads.<br />No filter.<br />Just content.
            </h1>
          </div>
        </div>
      </div>

      {/* ============ RIGHT: FORM & PRICING ============ */}
      <div className="flex-1 md:w-1/2 overflow-y-auto px-6 md:px-12 py-10 md:py-20 bg-black">
        <div className="w-full max-w-md mx-auto">
          
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black mb-2">
              Sign Up
            </h2>
            <p className="text-sm text-white/50">
              Join the platform built for independent voices.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourhandle"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
                required
              />
            </div>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="new-password"
              required
              minLength={6}
            />
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="email"
              required
            />

            <div className="flex items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-red-600 transition cursor-pointer"
                required
              />
              <p className="text-xs text-white/50 leading-relaxed">
                I agree to the <a href="#" className="text-red-500 hover:underline">Terms of Service</a> and acknowledge the Zero Tolerance Policy for objectionable content.
              </p>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-600/40 rounded-lg px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 font-bold py-3.5 rounded-lg transition text-base mt-2"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="text-sm text-white/50 mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline font-semibold">
              Sign in
            </Link>
            .
          </p>

          <div className="h-px bg-white/10 my-10" />

          {/* ============ PRICING SECTION ============ */}
          <div>
            <div className="text-center mb-8">
              <p className="text-[10px] md:text-xs tracking-[0.3em] text-red-500 font-bold mb-2 uppercase">
                What You Can Unlock
              </p>
              <h3 className="text-2xl font-black mb-2">Start free. Grow when you're ready.</h3>
              <p className="text-sm text-white/50">Sign up free — upgrade any time as new tiers launch.</p>
            </div>

            {/* TABS */}
            <div className="flex p-1 bg-[#1c1c1e] rounded-full border border-white/10 mb-6 w-full max-w-sm mx-auto">
              <button
                onClick={() => setActiveTab("troopass")}
                className={`flex-1 relative py-2.5 px-4 rounded-full text-sm font-bold transition-colors ${
                  activeTab === "troopass" ? "text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {activeTab === "troopass" && (
                  <motion.div layoutId="pricingTab" className="absolute inset-0 bg-white rounded-full shadow-md" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles size={16} /> TrooPass
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab("creator")}
                className={`flex-1 relative py-2.5 px-4 rounded-full text-sm font-bold transition-colors ${
                  activeTab === "creator" ? "text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {activeTab === "creator" && (
                  <motion.div layoutId="pricingTab" className="absolute inset-0 bg-white rounded-full shadow-md" />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Video size={16} /> Creator
                </span>
              </button>
            </div>

            {/* CARDS */}
            <AnimatePresence mode="wait">
              {activeTab === "troopass" && (
                <motion.div
                  key="troopass"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold">TrooPass</h3>
                      <p className="text-white/50 text-sm">For Viewers & Fans</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-black">$3.99</span>
                      <span className="text-white/50 text-sm">/mo</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {["Ad-free video streaming", "Exclusive Plus-only content", "Unlock commenting & community", "Plus badge on your profile"].map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                        <Check size={18} className="text-[#1ed760] shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {activeTab === "creator" && (
                <motion.div
                  key="creator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-2xl font-bold">Creator</h3>
                      <p className="text-white/50 text-sm">For Filmmakers & Podcasters</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-black">$9.99</span>
                      <span className="text-white/50 text-sm">/mo</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#1ed760] font-semibold mb-6 flex items-center gap-1">
                    <Check size={14} /> Free to start. No credit card required.
                  </p>

                  <ul className="space-y-3 mb-8">
                    {["Upload unlimited movies & podcasts", "Custom Creator Hub page", "Keep 90% of your subscriber revenue", "We take the first $15 you earn to cover the fee"].map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                        <Check size={18} className="text-[#1ed760] shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
            
            <p className="text-[11px] text-white/30 mt-8 text-center leading-relaxed">
              This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
