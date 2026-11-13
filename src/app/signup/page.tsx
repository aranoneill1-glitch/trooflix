"use client";

import Link from "next/link";
import { ArrowLeft, Check, X, Sparkles, Crown, Video } from "lucide-react";

type PlanId = "free" | "plus" | "creator";

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  icon: typeof Sparkles;
  accent: string;
  button: string;
}[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Start exploring",
    icon: Sparkles,
    accent: "text-white/70",
    button: "bg-white/10 hover:bg-white/15 border border-white/15 text-white",
  },
  {
    id: "plus",
    name: "Plus",
    price: "$3.99",
    period: "/mo",
    tagline: "The full viewer",
    icon: Crown,
    accent: "text-[#E53945]",
    button: "bg-[#E53945] hover:bg-[#d12e39] text-white",
  },
  {
    id: "creator",
    name: "Creator",
    price: "$9.99",
    period: "/mo",
    tagline: "Build your empire",
    icon: Video,
    accent: "text-[#D4AF37]",
    button: "bg-[#D4AF37] hover:bg-[#c49b2f] text-black",
  },
];

const FEATURE_ROWS: { label: string; free: boolean; plus: boolean; creator: boolean; note?: string }[] = [
  { label: "Watch unlimited Shorts", free: true, plus: true, creator: true },
  { label: "3-min long-form previews", free: true, plus: true, creator: true },
  { label: "Like, comment & share", free: true, plus: true, creator: true },
  { label: "Send direct messages", free: true, plus: true, creator: true },
  { label: "Buy merch & books", free: true, plus: true, creator: true },
  { label: "Upload Shorts (any length)", free: true, plus: true, creator: true },
  { label: "Unlimited long-form viewing", free: false, plus: true, creator: true },
  { label: "Watch live streams (public)", free: false, plus: true, creator: true },
  { label: "Upload merch / open shop", free: false, plus: true, creator: true },
  { label: "Red tick", free: false, plus: true, creator: true },
  { label: "Upload long-form videos (long-videos, docs)", free: false, plus: false, creator: true },
  { label: "Go Live (broadcast)", free: false, plus: false, creator: true },
  { label: "Full Creator Dashboard", free: false, plus: false, creator: true },
  { label: "Custom profile theme", free: false, plus: false, creator: true },
  { label: "99% revenue share", free: false, plus: false, creator: true },
  { label: "Watch Premium content", free: false, plus: false, creator: false, note: "Must pay creator (all plans)" },
];

function Tick({ on, note }: { on: boolean; note?: string }) {
  if (note) {
    return <span className="text-[10px] sm:text-xs text-white/45 font-medium leading-tight text-center">{note}</span>;
  }
  return on ? (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30">
      <Check size={15} className="text-[#1DB954]" strokeWidth={3} />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.04] border border-white/10">
      <X size={14} className="text-white/25" strokeWidth={3} />
    </span>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex flex-col items-center py-12 px-4 selection:bg-[#E53945]/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[700px] h-[300px] bg-[#E53945]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Join Trooflix</h1>
          <p className="text-sm md:text-base text-white/55">All plans and features in one place. See what each account gets.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          {/* Plan headers */}
          <div className="grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] border-b border-white/10">
            <div className="p-4 md:p-6 bg-black/20">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40 mb-2">Compare plans</p>
              <h2 className="text-lg md:text-xl font-black leading-tight">Everything you get</h2>
              <p className="text-xs md:text-sm text-white/45 mt-1">Ticks show which user gets each feature.</p>
            </div>
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.id} className={`p-4 md:p-6 border-l border-white/10 flex flex-col ${plan.id === "plus" ? "bg-[#E53945]/[0.06]" : plan.id === "creator" ? "bg-[#D4AF37]/[0.06]" : "bg-transparent"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={18} className={plan.accent} />
                    <span className="font-black text-base md:text-lg">{plan.name}</span>
                  </div>
                  <p className="text-[11px] text-white/45 uppercase tracking-wider font-bold mb-3">{plan.tagline}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl md:text-3xl font-black">{plan.price}</span>
                    <span className="text-xs text-white/45">{plan.period}</span>
                  </div>
                  <Link
                    href={`/signup/${plan.id}`}
                    className={`mt-auto inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-xs md:text-sm font-bold transition ${plan.button}`}
                  >
                    {plan.id === "free" ? "Join Free" : `Choose ${plan.name}`}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Feature rows */}
          <div>
            {FEATURE_ROWS.map((row, idx) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] items-center ${idx !== FEATURE_ROWS.length - 1 ? "border-b border-white/8" : ""}`}
              >
                <div className="p-3 md:p-4 pr-2 md:pr-4">
                  <p className="text-xs sm:text-sm md:text-[15px] font-medium text-white/85 leading-snug">{row.label}</p>
                </div>
                <div className="p-3 md:p-4 border-l border-white/8 flex items-center justify-center"><Tick on={row.free} note={row.note} /></div>
                <div className="p-3 md:p-4 border-l border-white/8 flex items-center justify-center bg-[#E53945]/[0.02]"><Tick on={row.plus} note={row.note} /></div>
                <div className="p-3 md:p-4 border-l border-white/8 flex items-center justify-center bg-[#D4AF37]/[0.02]"><Tick on={row.creator} note={row.note} /></div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
