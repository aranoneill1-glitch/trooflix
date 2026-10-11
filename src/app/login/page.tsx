"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url('https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev/backdrops/aaronback.JPG')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />

      {/* Header */}
      <header className="relative z-10 px-6 md:px-12 py-6">
        <Link href="/" className="text-3xl md:text-4xl font-black tracking-tight">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
      </header>

      {/* Form card */}
      <div className="relative z-10 flex items-start justify-center px-4 pt-8 md:pt-16 pb-16">
        <div className="w-full max-w-md bg-black/75 backdrop-blur-sm rounded-md p-10 md:p-14">
          <h1 className="text-3xl font-bold mb-8 text-white">Sign In</h1>

          <form onSubmit={submit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or phone number"
              required
              autoFocus
              className="w-full bg-[#333] text-white placeholder-white/50 rounded px-4 py-3.5 outline-none focus:bg-[#454545] transition"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-[#333] text-white placeholder-white/50 rounded px-4 py-3.5 outline-none focus:bg-[#454545] transition"
            />

            {error && (
              <div className="bg-[#e87c03]/20 border-l-4 border-[#e87c03] text-white text-sm px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold py-3.5 rounded transition mt-6 text-base"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4 text-sm text-white/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-red-600" />
              Remember me
            </label>
            <a href="#" className="hover:underline">
              Need help?
            </a>
          </div>

          <p className="text-white/60 text-base mt-12">
            New to Trooflix?{" "}
            <Link href="/signup" className="text-white hover:underline">
              Sign up now
            </Link>
            .
          </p>

          <p className="text-white/40 text-xs mt-4 leading-relaxed">
            This page is protected by Google reCAPTCHA to ensure you're not a bot.{" "}
            <a href="#" className="text-blue-500 hover:underline">
              Learn more.
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-black/75 backdrop-blur-sm border-t border-white/10 text-white/50 text-sm px-6 md:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="mb-4">Questions? Call 1-800-TROOFLIX</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="#" className="hover:underline">FAQ</a>
            <a href="#" className="hover:underline">Help Centre</a>
            <a href="#" className="hover:underline">Terms of Use</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Cookie Preferences</a>
            <a href="#" className="hover:underline">Corporate Information</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
