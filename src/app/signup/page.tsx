"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, Sparkles, Video, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";

type Tier = "free" | "plus" | "creator";

const TIERS = [
  {
    id: "free" as Tier,
    name: "Free",
    price: "$0",
    period: "forever",
    tick: "none" as const,
    tagline: "Start exploring",
    icon: Sparkles,
    features: [
      { text: "Watch unlimited Shorts", included: true },
      { text: "3-min long-form previews", included: true },
      { text: "Like, comment & share", included: true },
      { text: "Send direct messages", included: true },
      { text: "Buy merch & books", included: true },
      { text: "Upload Shorts (≤3 min)", included: true },
      { text: "Unlimited long-form viewing", included: false },
      { text: "Watch live streams", included: false },
      { text: "Upload long-form videos", included: false },
      { text: "Post Tweets", included: false },
    ],
    cta: "Create Free Account",
    ctaSub: "No card required",
  },
  {
    id: "plus" as Tier,
    name: "Plus",
    price: "$3.99",
    period: "/mo",
    tick: "plus_red" as const,
    tagline: "The full viewer",
    icon: Crown,
    features: [
      { text: "Everything in Free", included: true },
      { text: "Unlimited long-form viewing", included: true },
      { text: "Upload Shorts (any length)", included: true },
      { text: "Watch live streams (public)", included: true },
      { text: "Upload merch / open shop", included: true },
      { text: "Watch Premium (must pay creator)", included: false },
      { text: "Upload long-form videos", included: false },
      { text: "Go Live (broadcast)", included: false },
      { text: "Post Tweets", included: false },
      { text: "Custom profile theme", included: false },
    ],
    cta: "Continue to Checkout — $3.99",
    ctaSub: "Secure Stripe checkout",
  },
  {
    id: "creator" as Tier,
    name: "Creator",
    price: "$9.99",
    period: "/mo",
    tick: "creator_gold" as const,
    tagline: "Build your empire",
    icon: Video,
    features: [
      { text: "Everything in Plus", included: true },
      { text: "Upload long-form (podcasts, docs)", included: true },
      { text: "Go Live (broadcast)", included: true },
      { text: "Post Tweets", included: true },
      { text: "Full Creator Dashboard", included: true },
      { text: "Custom profile theme", included: true },
      { text: "Manage orders & analytics", included: true },
      { text: "Upload merch / open shop", included: true },
      { text: "90% revenue share", included: true },
      { text: "Watch Premium (must pay creator)", included: false },
    ],
    cta: "Continue to Checkout — $9.99",
    ctaSub: "Secure Stripe checkout",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [featured, setFeatured] = useState<{ posterUrl?: string; title?: string } | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const videos = Array.isArray(data) ? data : [];
        const validBackgrounds = videos.filter((v: any) =>
          v.posterUrl &&
          v.type?.toLowerCase() !== "tweet" &&
          v.type?.toLowerCase() !== "short" &&
          v.visibility !== "premium"
        );
        const featuredVideos = validBackgrounds.filter((v: any) => v.featured);
        const pool = featuredVideos.length > 0 ? featuredVideos : validBackgrounds;
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          setFeatured({ posterUrl: pick.posterUrl, title: pick.title });
        }
      })
      .catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedTier) {
      setError("Please select a plan first.");
      return;
    }
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

    const cleanHandle = handle.replace(/^@/, "").trim();
    if (cleanHandle.length < 3) {
      setError("Handle must be at least 3 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: cleanHandle, username: cleanHandle } },
      });

      if (authError) throw authError;
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

      if (!profileRes.ok) {
        const errorData = await profileRes.json();
        throw new Error(errorData.error || "Failed to create profile");
      }

      clearUserCache();

      // If a promo code was entered, try to redeem it FIRST
      if (promoCode.trim()) {
        try {
          const promoRes = await fetch("/api/promo/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: authData.user.id, code: promoCode.trim() }),
          });
          const promoData = await promoRes.json();
          if (promoRes.ok && promoData.success) {
            // Promo applied! No Stripe needed.
            router.push("/");
            router.refresh();
            return;
          }
          // Promo failed — show the error and stop. Don't fall through to Stripe.
          setError(promoData.error || "Invalid promo code. Please check and try again.");
          setLoading(false);
          return;
        } catch (e) {
          setError("Could not validate promo code. Please try again.");
          setLoading(false);
          return;
        }
      }

      // No promo code — normal flow
      if (selectedTier === "free") {
        router.push("/");
        router.refresh();
      } else {
        const stripeType = selectedTier === "creator" ? "podcaster" : "pass";
        try {
          const checkoutRes = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: authData.user.id, type: stripeType }),
          });
          const checkoutData = await checkoutRes.json();
          if (checkoutData.url) {
            window.location.href = checkoutData.url;
            return;
          }
          router.push("/upgrade");
        } catch {
          router.push("/upgrade");
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during signup.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white flex flex-col items-center py-12 px-4 selection:bg-[#E53945]/30 relative overflow-hidden">
      {featured?.posterUrl && (
        <>
          <img src={featured.posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0303]/80 via-[#0a0303]/95 to-[#0a0303]" />
        </>
      )}

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] bg-[#E53945]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">Join Trooflix</h1>
          <p className="text-sm text-white/50">Choose your plan. Upgrade or cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const selected = selectedTier === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTier(tier.id)}
                className={`text-left cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden flex flex-col ${
                  selected
                    ? "bg-[#E53945]/10 border-[#E53945] shadow-[0_0_20px_rgba(229,57,69,0.15)]"
                    : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {tier.tick === "none" ? (
                    <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[9px] text-white/30">–</div>
                  ) : (
                    <VerifiedBadge size={20} variant={tier.tick} />
                  )}
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">
                    {tier.tick === "none" ? "No tick" : tier.tick === "plus_red" ? "Red glass tick" : "Gold tick"}
                  </span>
                </div>

                <Icon size={24} className={selected ? "text-[#E53945] mb-3" : "text-white/50 mb-3"} />
                <h3 className="text-xl font-black leading-tight mb-0.5">{tier.name}</h3>
                <p className="text-[10px] text-white/50 mb-3 uppercase tracking-wider font-bold">{tier.tagline}</p>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black">{tier.price}</span>
                  <span className="text-xs text-white/50">{tier.period}</span>
                </div>

                <ul className="space-y-1.5 text-[11px] text-white/80 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-tight">
                      {f.included ? (
                        <Check size={12} className="text-[#1DB954] shrink-0 mt-0.5" strokeWidth={3} />
                      ) : (
                        <X size={12} className="text-white/20 shrink-0 mt-0.5" strokeWidth={3} />
                      )}
                      <span className={f.included ? "" : "text-white/40 line-through"}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                {selected && (
                  <div className="mt-4 pt-3 border-t border-white/10 text-center">
                    <span className="text-xs font-bold text-[#E53945]">Selected ✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!selectedTier ? (
          <div className="text-center py-8 bg-white/5 border border-dashed border-white/20 rounded-2xl">
            <p className="text-white/50 text-sm">Select a plan above to continue</p>
          </div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={submit}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6 shadow-2xl max-w-lg mx-auto"
          >
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
                    onChange={(e) => setHandle(e.target.value)}
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
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#E53945] transition"
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="peer sr-only" />
                <div className="w-4 h-4 border border-white/20 rounded bg-black/40 peer-checked:bg-[#E53945] peer-checked:border-[#E53945] transition-colors flex items-center justify-center">
                  <Check size={10} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                </div>
              </div>
              <span className="text-[11px] text-white/50 leading-snug group-hover:text-white/70 transition">
                I agree to the <Link href="/terms" className="text-white underline">Terms of Service</Link> and Privacy Policy.
              </span>
            </label>

            {/* PROMO CODE */}
            {selectedTier !== "free" && (
              <div className="mb-4">
                {!showPromo ? (
                  <button
                    type="button"
                    onClick={() => setShowPromo(true)}
                    className="text-xs text-[#E53945] hover:text-[#d12e39] font-bold transition"
                  >
                    Have a promo code? Skip payment →
                  </button>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-1.5">Promo Code</label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SSECREATOR"
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white uppercase tracking-wider font-mono focus:outline-none focus:border-[#E53945] transition"
                    />
                    <p className="text-[10px] text-white/40 mt-1.5">Enter a valid code to skip the payment step.</p>
                  </div>
                )}
              </div>
            )}

            {(() => {
              const tier = TIERS.find((t) => t.id === selectedTier);
              if (!tier) return null;
              const buttonText = promoCode.trim() ? "Create Account with Promo Code" : tier.cta;
              return (
                <>
                  <button
                    disabled={loading || !ready}
                    type="submit"
                    className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : promoCode.trim() ? (
                      "Create Account with Promo Code"
                    ) : (
                      tier.cta
                    )}
                  </button>
                  <p className="text-center text-[10px] text-white/40 mt-2">{tier.ctaSub}</p>
                </>
              );
            })()}
          </motion.form>
        )}

        <p className="text-center text-xs text-white/40 mt-6">
          Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
