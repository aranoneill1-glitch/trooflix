"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session) {
          setCanReset(true);
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setCanReset(true);
        setChecking(false);
      }
    });

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated successfully. Redirecting to sign in…");
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 1500);
    } catch (err: any) {
      setError(err.message || "Could not update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-2xl font-black tracking-tight inline-block mb-8">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>

        <p className="text-xs tracking-[0.3em] text-white/40 font-bold mb-2">SET NEW PASSWORD</p>
        <h1 className="text-2xl md:text-3xl font-black mb-2">Reset your password</h1>
        <p className="text-sm text-white/50 mb-8">
          Enter a new password for your account.
        </p>

        {checking ? (
          <div className="flex items-center gap-3 text-white/60 text-sm">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            Checking reset link…
          </div>
        ) : !canReset ? (
          <div className="space-y-4">
            <div className="bg-red-950/30 border border-red-600/40 rounded-lg px-4 py-3 text-sm text-red-300">
              This reset link is invalid or has expired. Please request a new one.
            </div>
            <Link href="/forgot-password" className="inline-flex w-full justify-center bg-red-600 hover:bg-red-700 font-bold py-3 rounded-lg transition">
              Request new reset link
            </Link>
            <div className="text-center">
              <Link href="/login" className="text-sm text-white/60 hover:text-white underline">Back to sign in</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="new-password"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="new-password"
              required
            />

            {error && (
              <div className="bg-red-950/30 border border-red-600/40 rounded-lg px-4 py-2.5 text-sm text-red-300">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-emerald-950/30 border border-emerald-600/40 rounded-lg px-4 py-2.5 text-sm text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 font-bold py-3 rounded-lg transition text-base"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
