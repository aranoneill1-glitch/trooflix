"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Crown, Sparkles, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type PlanId = "free" | "plus" | "creator";

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  icon: typeof Sparkles;
  accent: string;
  glow: string;
  cta: string;
  href: string;
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Start exploring Trooflix",
    icon: Sparkles,
    accent: "from-white/20 to-white/5",
    glow: "shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
    cta: "Join Free",
    href: "/signup/free",
  },
  {
    id: "plus",
    name: "Plus",
    price: "$3.99",
    period: "/mo",
    tagline: "The full viewer experience",
    icon: Crown,
    accent: "from-[#E53945]/40 to-[#E53945]/10",
    glow: "shadow-[0_0_40px_rgba(229,57,69,0.18)]",
    cta: "Choose Plus",
    href: "/signup/plus",
  },
  {
    id: "creator",
    name: "Creator",
    price: "$9.99",
    period: "/mo",
    tagline: "Build and monetize your channel",
    icon: Video,
    accent: "from-[#D4AF37]/40 to-[#D4AF37]/10",
    glow: "shadow-[0_0_40px_rgba(212,175,55,0.16)]",
    cta: "Become a Creator",
    href: "/signup/creator",
  },
];

const PLAN_FEATURES: Record<PlanId, { label: string; included: boolean; note?: string }[]> = {
  free: [
    { label: "Watch unlimited Shorts", included: true },
    { label: "3-min long-form previews", included: true },
    { label: "Like, comment & share", included: true },
    { label: "Send direct messages", included: true },
    { label: "Buy merch & books", included: true },
    { label: "Upload Shorts (any length)", included: true },
    { label: "Unlimited long-form viewing", included: false },
    { label: "Watch live streams (public)", included: false },
    { label: "Upload merch / open shop", included: false },
    { label: "Red tick", included: false },
    { label: "Upload long-form videos (long-videos, docs)", included: false },
    { label: "Go Live (broadcast)", included: false },
    { label: "Full Creator Dashboard", included: false },
    { label: "Custom profile theme", included: false },
    { label: "99% revenue share", included: false },
    { label: "Watch Premium content", included: false, note: "Must pay creator" },
  ],
  plus: [
    { label: "Watch unlimited Shorts", included: true },
    { label: "3-min long-form previews", included: true },
    { label: "Like, comment & share", included: true },
    { label: "Send direct messages", included: true },
    { label: "Buy merch & books", included: true },
    { label: "Upload Shorts (any length)", included: true },
    { label: "Unlimited long-form viewing", included: true },
    { label: "Watch live streams (public)", included: true },
    { label: "Upload merch / open shop", included: true },
    { label: "Red tick", included: true },
    { label: "Upload long-form videos (long-videos, docs)", included: false },
    { label: "Go Live (broadcast)", included: false },
    { label: "Full Creator Dashboard", included: false },
    { label: "Custom profile theme", included: false },
    { label: "99% revenue share", included: false },
    { label: "Watch Premium content", included: false, note: "Must pay creator" },
  ],
  creator: [
    { label: "Watch unlimited Shorts", included: true },
    { label: "3-min long-form previews", included: true },
    { label: "Like, comment & share", included: true },
    { label: "Send direct messages", included: true },
    { label: "Buy merch & books", included: true },
    { label: "Upload Shorts (any length)", included: true },
    { label: "Unlimited long-form viewing", included: true },
    { label: "Watch live streams (public)", included: true },
    { label: "Upload merch / open shop", included: true },
    { label: "Red tick", included: true },
    { label: "Upload long-form videos (long-videos, docs)", included: true },
    { label: "Go Live (broadcast)", included: true },
    { label: "Full Creator Dashboard", included: true },
    { label: "Custom profile theme", included: true },
    { label: "99% revenue share", included: true },
    { label: "Watch Premium content", included: false, note: "Must pay creator" },
  ],
};

export default function SignupPage() {
  const [active, setActive] = useState<PlanId>("plus");

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center py-10 md:py-14 px-4 selection:bg-[#E53945]/30 relative overflow-hidden">
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-[#E53945]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-80px] w-[320px] h-[320px] bg-[#D4AF37]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/55 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Join Trooflix</h1>
          <p className="text-sm md:text-base text-white/55 max-w-xl mx-auto">Choose a plan to see exactly what you get. Tap a tab to open the details.</p>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="grid grid-cols-3 gap-1.5">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const selected = active === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setActive(plan.id)}
                  className={`relative rounded-xl px-3 py-3 md:py-3.5 text-left transition-all ${
                    selected
                      ? "bg-white/10 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                      : "hover:bg-white/[0.05] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={plan.id === "creator" ? "text-[#D4AF37]" : plan.id === "plus" ? "text-[#E53945]" : "text-white/70"} />
                    <span className={`text-sm md:text-base font-black ${selected ? "text-white" : "text-white/70"}`}>{plan.name}</span>
                  </div>
                  <p className={`text-[11px] md:text-xs ${selected ? "text-white/60" : "text-white/40"}`}>{plan.price}<span className="ml-1">{plan.period}</span></p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdown / details panel */}
        <div className="mt-4 mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {PLANS.map((plan) => {
              if (plan.id !== active) return null;
              const Icon = plan.icon;
              const features = PLAN_FEATURES[plan.id];
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className={`rounded-3xl border border-white/10 bg-gradient-to-b ${plan.accent} backdrop-blur-2xl ${plan.glow}`}>
                    <div className="p-5 md:p-7 border-b border-white/10">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center">
                              <Icon size={20} className={plan.id === "creator" ? "text-[#D4AF37]" : plan.id === "plus" ? "text-[#E53945]" : "text-white/80"} />
                            </div>
                            <div>
                              <h2 className="text-2xl md:text-3xl font-black leading-none">{plan.name}</h2>
                              <p className="text-sm text-white/55 mt-1">{plan.tagline}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-3xl md:text-4xl font-black leading-none">{plan.price}</div>
                          <div className="text-xs text-white/50 mt-1">{plan.period}</div>
                        </div>
                      </div>

                      <Link
                        href={plan.href}
                        className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm md:text-base font-bold transition ${
                          plan.id === "creator"
                            ? "bg-[#D4AF37] hover:bg-[#c49b2f] text-black shadow-[0_10px_30px_rgba(212,175,55,0.25)]"
                            : plan.id === "plus"
                            ? "bg-[#E53945] hover:bg-[#d12e39] text-white shadow-[0_10px_30px_rgba(229,57,69,0.25)]"
                            : "bg-white text-black hover:bg-white/90"
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </div>

                    <div className="p-4 md:p-6 bg-black/20">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">What’s included</p>
                        <span className="inline-flex items-center gap-1 text-xs text-white/40">
                          <ChevronDown size={14} /> Plan details
                        </span>
                      </div>
                      <ul className="space-y-2.5">
                        {features.map((f) => (
                          <li key={f.label} className="flex items-start gap-3 rounded-xl px-3 py-2.5 bg-white/[0.03] border border-white/[0.06]">
                            <span className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${f.included ? "bg-[#1DB954]/15 border border-[#1DB954]/30" : "bg-white/[0.04] border border-white/10"}`}>
                              {f.included ? <Check size={14} className="text-[#1DB954]" strokeWidth={3} /> : <X size={13} className="text-white/30" strokeWidth={3} />}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-sm md:text-[15px] leading-snug ${f.included ? "text-white/90" : "text-white/45"}`}>{f.label}</p>
                              {f.note && <p className="text-[11px] text-white/40 mt-0.5">{f.note}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-white/40 mt-8">
          Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
