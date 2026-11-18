"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, Crown, Check, Sparkles, Video, Radio, ShoppingBag, Lock, Heart, MessageCircle, Download, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Path = "viewer" | "creator";

const PATHS: {
  id: Path;
  title: string;
  subtitle: string;
  icon: typeof Eye;
  cta: string;
  href: string;
  tint: string;
  glow: string;
  features: { icon: typeof Eye; label: string }[];
}[] = [
  {
    id: "viewer",
    title: "I'm here for the content",
    subtitle: "Watch, discover and support the creators you love — completely free.",
    icon: Eye,
    cta: "Continue as viewer",
    href: "/signup/free",
    tint: "from-[#E53945]/15 to-transparent",
    glow: "shadow-[0_10px_50px_rgba(229,57,69,0.15)]",
    features: [
      { icon: Video, label: "Unlimited videos & Shorts" },
      { icon: Heart, label: "Like, comment & share" },
      { icon: MessageCircle, label: "Direct messages" },
      { icon: ShoppingBag, label: "Buy merch & books" },
      { icon: Lock, label: "Support creators with paid content" },
    ],
  },
  {
    id: "creator",
    title: "I'm here to build an empire",
    subtitle: "Upload, go live, sell and get paid. Everything you need to create full-time.",
    icon: Crown,
    cta: "Become a creator · £4.99/mo",
    href: "/signup/creator",
    tint: "from-[#D4AF37]/15 to-transparent",
    glow: "shadow-[0_10px_50px_rgba(212,175,55,0.18)]",
    features: [
      { icon: Video, label: "Upload long-form videos, podcasts & docs" },
      { icon: Radio, label: "Go live to your fans" },
      { icon: ShoppingBag, label: "Open a shop & sell products" },
      { icon: TrendingUp, label: "Subscriptions, tips & 90% revenue" },
      { icon: Sparkles, label: "Full studio, analytics & gold tick" },
    ],
  },
];

export default function SignupPage() {
  const [active, setActive] = useState<Path>("viewer");
  const selected = PATHS.find(p => p.id === active)!;

  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center py-10 md:py-14 px-4 selection:bg-[#E53945]/30 relative overflow-hidden">
      <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-[#E53945]/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-120px] right-[-80px] w-[320px] h-[320px] bg-[#D4AF37]/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/55 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Welcome to Trooflix</h1>
          <p className="text-sm md:text-base text-white/55 max-w-xl mx-auto">Freedom to watch. Freedom to create. Pick your path.</p>
        </div>

        {/* Path selector */}
        <div className="grid grid-cols-2 gap-3">
          {PATHS.map((path) => {
            const Icon = path.icon;
            const chosen = active === path.id;
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => setActive(path.id)}
                className={`rounded-2xl border p-4 md:p-5 text-left transition-all ${chosen
                  ? "bg-white/10 border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${path.id === "creator" ? "bg-[#D4AF37]/20" : "bg-[#E53945]/20"}`}>
                  <Icon size={20} className={path.id === "creator" ? "text-[#D4AF37]" : "text-[#E53945]"} />
                </div>
                <p className={`text-sm md:text-base font-black leading-tight ${chosen ? "text-white" : "text-white/75"}`}>{path.title}</p>
                <p className="text-[11px] text-white/45 mt-1">{path.id === "creator" ? "£4.99/mo" : "Free forever"}</p>
              </button>
            );
          })}
        </div>

        {/* Details */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`rounded-3xl border border-white/10 bg-gradient-to-b ${selected.tint} ${selected.glow}`}
            >
              <div className="p-5 md:p-7">
                <h2 className="text-xl md:text-2xl font-black leading-tight">{selected.title}</h2>
                <p className="text-sm text-white/55 mt-1.5">{selected.subtitle}</p>

                <div className="mt-6 space-y-3">
                  {selected.features.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-black/25 border border-white/10 flex items-center justify-center shrink-0">
                        <Icon size={14} className="text-white/75" />
                      </span>
                      <span className="text-sm text-white/85">{label}</span>
                      <Check size={15} className="ml-auto text-[#4ade80] shrink-0" />
                    </div>
                  ))}
                </div>

                <Link
                  href={selected.href}
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm md:text-base font-bold transition ${
                    selected.id === "creator"
                      ? "bg-[#D4AF37] hover:bg-[#c49b2f] text-black"
                      : "bg-[#E53945] hover:bg-[#d12e39] text-white"
                  }`}
                >
                  {selected.cta} <ArrowRight size={17} />
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-[11px] text-white/30 mt-6">
          Already have an account? <Link href="/login" className="text-white/60 hover:text-white underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
