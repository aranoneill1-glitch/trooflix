"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!agree) return setError("You must agree to the Terms");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!emailOk) return setError("Please enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    const cleanHandle = handle.replace(/^@/, "").trim();
    if (cleanHandle.length < 3) return setError("Handle must be at least 3 characters.");

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: cleanHandle, username: cleanHandle } },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("This email is already registered. Please log in.");
          setLoading(false);
          return;
        }
        throw authError;
      }
      if (!authData.user) throw new Error("Signup failed.");

      const profileRes = await fetch("/api/signup-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          username: cleanHandle,
          displayName: cleanHandle,
          tier: "free",
          verification_tick: "none",
        }),
      });

      if (!profileRes.ok) throw new Error((await profileRes.json()).error || "Failed to create profile");

      clearUserCache();
      try { localStorage.setItem("trooflix:show-unlock-popup", "1"); } catch {}
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4 py-10 selection:bg-[#E53945]/30">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-white/55 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Create your account</h1>
          <p className="text-sm text-white/55">Join Trooflix — it’s free.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourname"
              className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-red-500/70 focus:bg-white/[0.12] transition placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-red-500/70 focus:bg-white/[0.12] transition placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-red-500/70 focus:bg-white/[0.12] transition placeholder:text-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              autoComplete="new-password"
            />
          </div>

          <label className="flex items-start gap-3 text-xs text-white/55 pt-1">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#E53945]" />
            <span>I agree to the <Link href="/terms" className="text-white/80 hover:underline">Terms</Link> and <Link href="/privacy" className="text-white/80 hover:underline">Privacy Policy</Link>.</span>
          </label>

          {error && <p className="text-sm text-red-300 bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-2xl px-4 py-3">{error}</p>}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600/90 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-full transition text-base backdrop-blur-xl border border-red-400/20 shadow-[0_8px_24px_rgba(229,57,69,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
            <Link
              href="/login"
              className="w-full bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold py-3.5 rounded-full transition text-base text-center backdrop-blur-xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              Log In
            </Link>
          </div>
        </form>

        <div className="mt-6 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-start gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center shrink-0">
            <Lock size={14} className="text-yellow-400" />
          </div>
          <p className="text-xs text-white/55 leading-relaxed">
            <span className="text-white/80 font-semibold">Creator tools:</span> Unlock Live, Shop, and Premium by buying any coin pack. Your coins go to creators, not us.
          </p>
        </div>
      </div>
    </main>
  );
}
