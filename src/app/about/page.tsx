"use client";

import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function AboutTrooflixPage() {
  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-28 font-sans selection:bg-[#E53945]/30 overflow-x-hidden">
      <TopBar />

      <div className="relative max-w-4xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6.5rem)] pb-10">
        <div className="absolute inset-x-0 top-24 h-72 bg-[radial-gradient(circle_at_top,rgba(229,57,69,0.22),transparent_55%)] pointer-events-none" />
        <div className="absolute -top-10 right-0 w-64 h-64 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />

        <Link href="/" className="relative inline-flex items-center gap-2 text-sm text-white/55 hover:text-white mb-8 transition">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(229,57,69,0.18),transparent_35%)]" />

          <div className="relative px-6 py-10 md:px-12 md:py-14 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/12 border border-red-500/20 flex items-center justify-center mb-7 shadow-[0_12px_40px_rgba(229,57,69,0.18)]">
              <Heart size={34} className="text-red-400" fill="currentColor" />
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45 mb-4">About Trooflix</p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] mb-6">
              Built for creators.
              <br />
              <span className="bg-gradient-to-r from-white via-white to-red-300 bg-clip-text text-transparent">Built for you.</span>
            </h1>

            <div className="max-w-2xl mx-auto">
              <p className="text-lg md:text-2xl leading-relaxed text-white/78 font-medium">
                We built this platform for you to have total freedom of speech, and the possibility of being rewarded for the hard work you put into creating content.
              </p>
              <div className="w-16 h-px bg-white/15 mx-auto my-8" />
              <p className="text-base md:text-lg leading-relaxed text-white/62">
                We&apos;re blending many different platforms into one unique place, so you have everything you need, all in one spot.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
                Explore Trooflix
              </Link>
              <Link href="/creator-dashboard" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/12 text-white font-bold text-sm backdrop-blur-xl transition">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
