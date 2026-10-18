"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";

const TAGLINES = ["No ads.", "No filter.", "Just content."];
const INTRO_KEY = "trooflix:login-intro-seen";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showIntro, setShowIntro] = useState(false);
  const [featured, setFeatured] = useState<{ backdropUrl?: string; title?: string } | null>(null);
  const [ready, setReady] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Intro runs only once per device
  useEffect(() => {
    try {
      const seen = localStorage.getItem(INTRO_KEY);
      if (!seen) {
        setShowIntro(true);
        setTimeout(() => {
          setShowIntro(false);
          try { localStorage.setItem(INTRO_KEY, "1"); } catch {}
        }, 2000);
      }
    } catch {
      // localStorage blocked — skip intro
    }
  }, []);

  // Load featured videos for the left panel
  useEffect(() => {
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const videos = Array.isArray(data) ? data : [];
        const featuredVideos = videos.filter((v: any) => v.featured);
        if (featuredVideos.length > 0) {
          const pick = featuredVideos[Math.floor(Math.random() * featuredVideos.length)];
          setFeatured({ backdropUrl: pick.backdropUrl, title: pick.title });
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let email = identifier.trim();
    try {
      const r = await fetch("/api/resolve-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });
      const d = await r.json();
      if (!r.ok || !d.email) {
        setError(d.error || "Could not find that account.");
        setLoading(false);
        return;
      }
      email = d.email;
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      clearUserCache();
      router.push("/");
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden">
      {/* ============ INTRO OVERLAY ============ */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
          >
            <div className="relative select-none">
              <img
                src="/truthlog.png"
                alt=""
                className="w-[70vw] max-w-[480px] invisible"
              />
              <motion.img
                src="/truthlog.png"
                alt=""
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
                className="absolute inset-0 w-[70vw] max-w-[480px]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ LEFT / TOP: BRAND + FEATURED ============ */}
      <div className="relative md:w-1/2 h-[30vh] md:h-screen flex-shrink-0 overflow-hidden">
        {/* Backdrop */}
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

        {/* Logo top-left (desktop) or top-left (mobile) */}
        <div className="absolute top-0 left-0 right-0 p-6 md:p-10 z-10">
          <Link href="/" className="text-2xl md:text-3xl font-black tracking-tight">
            <span className="text-white">TROO</span>
            <span className="text-red-600">FLIX</span>
          </Link>
        </div>

        {/* Tagline / featured caption */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <div className="max-w-md">
            <p className="text-red-500 text-xs tracking-[0.3em] font-bold mb-3">
              TROOFLIX
            </p>
            <h1 className="text-2xl md:text-5xl font-black leading-tight mb-4">
              No ads.
              <br />
              No filter.
              <br />
              Just content.
            </h1>
            {featured?.title && (
              <p className="text-xs md:text-sm text-white/50 hidden md:block">
                Featured: <span className="text-white/80">{featured.title}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ============ RIGHT: FORM ============ */}
      <div className="flex-1 md:w-1/2 flex items-center justify-center px-6 md:px-12 py-10 md:py-0">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-xs tracking-[0.3em] text-white/40 font-bold mb-2">
              WELCOME BACK
            </p>
            <h2 className="text-2xl md:text-3xl font-black mb-2">
              Sign in to <span className="text-red-600">TROOFLIX</span>
            </h2>
            <p className="text-sm text-white/50">
              The truth is waiting.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email or @handle"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="username"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="bg-red-950/30 border border-red-600/40 rounded-lg px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 font-bold py-3 rounded-lg transition text-base"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-sm text-white/50 mt-6">
            New to Trooflix?{" "}
            <Link href="/signup" className="text-white hover:underline font-semibold">
              Sign up now
            </Link>
            .
          </p>

          <p className="text-[11px] text-white/30 mt-6 leading-relaxed">
            This site is protected by reCAPTCHA and the Google{" "}
            <a href="#" className="text-white/50 hover:underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="#" className="text-white/50 hover:underline">
              Terms of Service
            </a>{" "}
            apply.
          </p>
        </div>
      </div>
    </main>
  );
}
