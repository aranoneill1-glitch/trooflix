"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [handleStatus, setHandleStatus] = useState<
    "" | "checking" | "available" | "taken" | "invalid"
  >("");
  const [handleError, setHandleError] = useState("");
  const [role, setRole] = useState<"viewer" | "creator">("viewer");
  const router = useRouter();
  const supabase = createClient();

  const checkHandle = async (raw: string) => {
    const clean = raw.toLowerCase().replace(/^@+/, "");
    if (!clean) {
      setHandleStatus("");
      setHandleError("");
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setHandleStatus("invalid");
      setHandleError("3–20 characters, a–z, 0–9, or _");
      return;
    }
    setHandleStatus("checking");
    try {
      const r = await fetch(`/api/username?check=${encodeURIComponent(clean)}`);
      const d = await r.json();
      if (d.available) {
        setHandleStatus("available");
        setHandleError("");
      } else {
        setHandleStatus(d.error === "Taken" ? "taken" : "invalid");
        setHandleError(d.error || "Unavailable");
      }
    } catch {
      setHandleStatus("invalid");
      setHandleError("Could not check");
    }
  };

  const onHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(cleaned);
    checkHandle(cleaned);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const clean = handle.toLowerCase().replace(/^@+/, "");
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setError("Pick a valid handle: 3–20 chars, a–z, 0–9, _");
      setLoading(false);
      return;
    }

    // Final availability check
    const check = await fetch(`/api/username?check=${encodeURIComponent(clean)}`);
    const checkData = await check.json();
    if (!checkData.available) {
      setError("That handle is already taken.");
      setLoading(false);
      return;
    }


    const { data: signUpData, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Save the handle to profiles
    if (signUpData.user) {
      await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: signUpData.user.id, username: clean }),
      });
    }

    setMessage("Account created! Redirecting…");
    setTimeout(() => {
      router.push(role === "creator" ? "/apply" : "/login");
      router.refresh();
    }, 2200);
  };

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url('https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev/backdrops/aaronback.JPG')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />

      <header className="relative z-10 px-6 md:px-12 py-6">
        <Link href="/" className="text-3xl md:text-4xl font-black tracking-tight">
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </Link>
      </header>

      <div className="relative z-10 flex items-start justify-center px-4 pt-8 md:pt-16 pb-16">
        <div className="w-full max-w-md bg-black/75 backdrop-blur-sm rounded-md p-10 md:p-14">
          <h1 className="text-3xl font-bold mb-8 text-white">Sign Up</h1>

          <form onSubmit={submit} className="space-y-4">
            {/* Account type */}
            <div>
              <p className="text-xs text-white/50 mb-2">I&apos;m signing up as a…</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("viewer")}
                  className={`py-3 rounded text-sm font-semibold transition border ${
                    role === "viewer"
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-[#333] border-transparent text-white/70 hover:bg-[#3d3d3d]"
                  }`}
                >
                  Viewer
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                    Watch &amp; comment
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("creator")}
                  className={`py-3 rounded text-sm font-semibold transition border ${
                    role === "creator"
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-[#333] border-transparent text-white/70 hover:bg-[#3d3d3d]"
                  }`}
                >
                  Creator
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                    Apply to post
                  </span>
                </button>
              </div>
              {role === "creator" && (
                <p className="text-[11px] text-white/50 mt-2 leading-snug">
                  After signing up you&apos;ll be taken to a short application.
                  Creators are added after admin approval.
                </p>
              )}
            </div>

            {/* Handle */}
            <div>
              <div className="flex items-center bg-[#333] rounded focus-within:bg-[#454545] transition">
                <span className="pl-4 text-white/50 text-lg">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={onHandleChange}
                  placeholder="yourhandle"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={20}
                  className="flex-1 bg-transparent text-white placeholder-white/50 px-2 py-3.5 outline-none"
                />
              </div>
              <div className="text-xs mt-1.5 h-4 px-1">
                {handleStatus === "checking" && <span className="text-white/50">Checking…</span>}
                {handleStatus === "available" && (
                  <span className="text-green-400">@{handle} is available</span>
                )}
                {handleStatus === "taken" && (
                  <span className="text-red-400">@{handle} is taken</span>
                )}
                {handleStatus === "invalid" && (
                  <span className="text-red-400">{handleError}</span>
                )}
              </div>
            </div>

            {/* Password */}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              className="w-full bg-[#333] text-white placeholder-white/50 rounded px-4 py-3.5 outline-none focus:bg-[#454545] transition"
            />

            {/* Email (required) */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="w-full bg-[#333] text-white placeholder-white/50 rounded px-4 py-3.5 outline-none focus:bg-[#454545] transition"
            />

            {error && (
              <div className="bg-[#e87c03]/20 border-l-4 border-[#e87c03] text-white text-sm px-4 py-3 rounded">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-900/30 border-l-4 border-green-500 text-white text-sm px-4 py-3 rounded">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || handleStatus === "taken" || handleStatus === "invalid"}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold py-3.5 rounded transition mt-4 text-base"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </button>
          </form>

          <p className="text-white/60 text-base mt-12">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Sign in
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
