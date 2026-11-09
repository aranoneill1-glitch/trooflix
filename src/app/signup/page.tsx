"use client";

import Link from "next/link";
import { ArrowLeft, Check, X, Sparkles, Crown, Video } from "lucide-react";
import { motion } from "framer-motion";

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Start exploring",
    icon: Sparkles,
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
    color: "text-gray-400",
    border: "border-white/10",
    bg: "bg-white/5",
  },
  {
    id: "plus",
    name: "Plus",
    price: "$3.99",
    period: "/mo",
    tagline: "The full viewer",
    icon: Crown,
    features: [
      { text: "Everything in Free", included: true },
      { text: "Unlimited long-form viewing", included: true },
      { text: "Upload Shorts (any length)", included: true },
      { text: "Watch live streams (public)", included: true },
      { text: "Upload merch / open shop", included: true },
      { text: "Red glass tick", included: true },
      { text: "Watch Premium (must pay creator)", included: false },
      { text: "Upload long-form videos", included: false },
      { text: "Go Live (broadcast)", included: false },
    ],
    color: "text-[#E53945]",
    border: "border-[#E53945]",
    bg: "bg-[#E53945]/10",
  },
  {
    id: "creator",
    name: "Creator",
    price: "$9.99",
    period: "/mo",
    tagline: "Build your empire",
    icon: Video,
    features: [
      { text: "Everything in Plus", included: true },
      { text: "Upload long-form (podcasts, docs)", included: true },
      { text: "Go Live (broadcast)", included: true },
      { text: "Post Tweets", included: true },
      { text: "Full Creator Dashboard", included: true },
      { text: "Custom profile theme", included: true },
      { text: "90% revenue share", included: true },
      { text: "Watch Premium (must pay creator)", included: false },
    ],
    color: "text-[#D4AF37]",
    border: "border-[#D4AF37]",
    bg: "bg-[#D4AF37]/10",
  },
];

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#0a0303] text-white flex flex-col items-center py-12 px-4 selection:bg-[#E53945]/30 relative overflow-hidden">
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
            return (
              <Link
                key={tier.id}
                href={`/signup/${tier.id}`}
                className={`text-left cursor-pointer rounded-2xl p-5 border transition-all duration-200 relative overflow-hidden flex flex-col ${tier.bg} ${tier.border} hover:scale-[1.02] hover:shadow-2xl hover:border-white/30`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {tier.id === "free" ? (
                    <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[9px] text-white/30">–</div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full ${tier.id === "creator" ? "bg-[#D4AF37]" : "bg-[#E53945]"}`} />
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">{tier.id === "creator" ? "Gold tick" : "Red glass tick"}</span>
                    </div>
                  )}
                </div>
                <Icon size={24} className={`${tier.color} mb-3`} />
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
              </Link>
            );
          })}
        </div>
        
        <p className="text-center text-xs text-white/40 mt-6">
          Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
