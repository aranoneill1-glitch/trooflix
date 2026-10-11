"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setMessage("Account created! Redirecting…");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 800);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#141418] rounded-lg p-8 border border-white/10">
        <div className="text-center mb-6">
          <Link href="/" className="text-3xl font-black tracking-tight">
            <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
          </Link>
          <p className="text-white/50 text-sm mt-2">Create your account</p>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoFocus
          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 mb-3 focus:border-red-600 outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 mb-3 focus:border-red-600 outline-none"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-500 text-sm mb-3">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-2.5 rounded transition"
        >
          {loading ? "Creating account…" : "Sign Up"}
        </button>
        <p className="text-white/50 text-sm mt-6 text-center">
          Already have an account? <Link href="/login" className="text-red-500 hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
