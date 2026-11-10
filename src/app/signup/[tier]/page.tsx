"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Crown, Video , Coins } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { clearUserCache } from "@/lib/cache";

type Tier = "free" | "plus" | "creator";

const TIERS: Record<Tier, any> = {
  free: {
    name: "Free",
    price: "$0",
    tagline: "Start exploring",
    icon: Sparkles,
    color: "text-gray-400",
    bg: "bg-gray-500/20",
    features: [
      { text: "Watch unlimited Shorts", included: true },
      { text: "3-min long-form previews", included: true },
      { text: "Like, comment & share", included: true },
      { text: "Send direct messages", included: true },
      { text: "Buy merch & books", included: true },
      { text: "Upload Shorts (any length)", included: true },
      { text: "Unlimited long-form viewing", included: false },
      { text: "Watch live streams", included: false },
      { text: "Upload long-form videos", included: false },
    ],
  },
  plus: {
    name: "Plus",
    price: "$3.99",
    tagline: "The full viewer",
    icon: Crown,
    color: "text-[#E53945]",
    bg: "bg-[#E53945]/20",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Unlimited long-form viewing", included: true },
      { text: "Upload Shorts (any length)", included: true },
      { text: "Watch live streams (public)", included: true },
      { text: "Upload merch / open shop", included: true },
      { text: "Red tick", included: true },
      { text: "Watch Premium (must pay creator)", included: false },
      { text: "Upload long-form videos", included: false },
      { text: "Go Live (broadcast)", included: false },
    ],
  },
  creator: {
    name: "Creator",
    price: "$9.99",
    tagline: "Build your empire",
    icon: Video,
    color: "text-[#D4AF37]",
    bg: "bg-[#D4AF37]/20",
    features: [
      { text: "Everything in Plus", included: true },
      { text: "Upload long-form (podcasts, docs)", included: true },
      { text: "Go Live (broadcast)", included: true },
      { text: "Post Tweets", included: true },
      { text: "Full Creator Dashboard", included: true },
      { text: "Custom profile theme", included: true },
      { text: "99% revenue share", included: true },
      { text: "Watch Premium (must pay creator)", included: false },
    ],
  },
};

export default function SignupCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const tierId = params.tier as Tier;
  const tier = TIERS[tierId] || TIERS.free;
  const Icon = tier.icon;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState<number | null>(null);

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

      if (authError) { if (authError.message.includes("already registered")) { setError("This email is already registered. Please log in to upgrade your account."); setLoading(false); return; } throw authError; }
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

      if (promoCode.trim()) {
        const promoRes = await fetch("/api/promo/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authData.user.id, code: promoCode.trim() }),
        });
        const promoData = await promoRes.json();
        if (promoRes.ok && promoData.success) {
          router.push("/creator-dashboard/settings?onboarding=1");
          router.refresh();
          return;
        }
        setError(promoData.error || "Invalid promo code.");
        setLoading(false);
        return;
      }

      if (tierId === "free") {
        router.push("/creator-dashboard/settings?onboarding=1");
        router.refresh();
      } else {
        const stripeType = tierId === "creator" ? "creator" : "pass";
        const checkoutRes = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authData.user.id, type: stripeType, coins: selectedCoins }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.url) window.location.href = checkoutData.url;
        else throw new Error("Checkout failed");
      }
    } catch (err: any) {
      setError(err.message || "Account created, but checkout failed. Please log in and go to Upgrade to try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0303] text-white flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT SIDE */}
      <div className="relative w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[80%] blur-[120px] opacity-30 pointer-events-none rounded-full" style={{ background: tierId === "creator" ? "#D4AF37" : tierId === "plus" ? "#E53945" : "#333" }} />
        
        <div className="relative z-10 max-w-lg mx-auto">
          <Link href="/signup" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-12 transition text-sm font-semibold">
            <ArrowLeft size={16} /> Back to plans
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${tier.bg}`}>
              <Icon size={32} className={tier.color} />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2">
              {tierId === "creator" ? "Excellent Choice." : tierId === "plus" ? "Great Choice." : "Smart Choice."}
            </h1>
            <p className="text-3xl md:text-4xl text-white/40 font-black mb-10">
              You&apos;re getting <span className={tier.color}>{tier.name}</span>.
            </p>
            
            <div className="space-y-4 mt-8 border-t border-white/10 pt-8">
              {tier.features.map((f: any, i: number) => f.included && (
                <div key={i} className="flex items-center gap-3 text-sm md:text-base text-white/80">
                  <Check size={18} className="text-green-500 shrink-0" /> {f.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 bg-[#050505]">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-black mb-2">Create your account</h2>
            <p className="text-sm text-white/50">Join the Trooflix network.</p>
          </div>

          {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}

          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-2">Handle</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</span>
                <input required type="text" value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#E53945] transition" placeholder="username" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-2">Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#E53945] transition" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-2">Password</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#E53945] transition" placeholder="Min 6 characters" autoComplete="new-password" />
            </div>

            {tierId !== "free" && (
              <div className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/30 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="text-[#D4AF37]" size={20} />
                  <h3 className="text-base font-bold text-white">Power up your TrooBank</h3>
                </div>
                <p className="text-xs text-white/60 mb-4 leading-relaxed">
                  Tipping individually with a card incurs heavy processing fees. Pre-loading TrooCoins batches these transactions, meaning <strong className="text-[#D4AF37]">creators keep more of your money</strong>, and it&apos;s 1-click easy to tip, subscribe, or buy merch.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setSelectedCoins(amt === selectedCoins ? null : amt)}
                      className={`py-2 rounded-lg font-bold text-sm transition-all border ${selectedCoins === amt ? "bg-[#D4AF37] text-black border-[#D4AF37]" : "bg-black/40 text-white/70 border-white/10 hover:border-[#D4AF37]/50"}`}
                    >
                      +{amt} TC
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-green-400 mt-3 text-center font-semibold">You can top up instantly in your TrooBank after checkout.</p>
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer group">
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

            {tierId !== "free" && (
              <div>
                {!showPromo ? (
                  <button type="button" onClick={() => setShowPromo(true)} className="text-xs text-[#E53945] hover:text-[#d12e39] font-bold transition">
                    Have a promo code? Skip payment &rarr;
                  </button>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-white/60 mb-1.5">Promo Code</label>
                    <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="e.g. SSECREATOR" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white uppercase tracking-wider font-mono focus:outline-none focus:border-[#E53945] transition" />
                  </div>
                )}
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl transition shadow-lg shadow-[#E53945]/20 flex items-center justify-center text-lg mt-4">
              {loading ? "Processing..." : promoCode.trim() ? "Create Account with Promo Code" : tier.price === "$0" ? "Create Free Account" : `Continue to Checkout — ${((parseFloat(tier.price.replace("$","")) || 0) + (selectedCoins || 0)).toFixed(2)}`}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
