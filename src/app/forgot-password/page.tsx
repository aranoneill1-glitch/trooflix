"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Could not send reset email.");
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

        <p className="text-xs tracking-[0.3em] text-white/40 font-bold mb-2">RESET PASSWORD</p>
        <h1 className="text-2xl md:text-3xl font-black mb-2">Forgot your password?</h1>
        <p className="text-sm text-white/50 mb-8">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-emerald-950/30 border border-emerald-600/40 rounded-lg px-4 py-3 text-sm text-emerald-300">
              If an account exists for that email, a password reset link has been sent. Check your inbox.
            </div>
            <Link href="/login" className="inline-flex text-sm font-semibold text-white hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none focus:border-red-600 transition placeholder:text-white/30"
              autoComplete="email"
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
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <p className="text-sm text-white/50 pt-2">
              Remembered it?{" "}
              <Link href="/login" className="text-white hover:underline font-semibold">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
