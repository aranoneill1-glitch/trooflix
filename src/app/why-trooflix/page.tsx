"use client";

import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Video } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function WhyTrooflixPage() {
  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-32 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-8 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        {/* VIEWER SECTION */}
        <div className="mb-20">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[1.1]">
            Uncensored. Unfiltered. <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">Unbought.</span>
          </h1>
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-white/80">
            Ad-free. No mainstream pollution. Just raw content.
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
            <h3 className="text-2xl font-bold mb-2">Trooflix Plus</h3>
            <p className="text-white/50 mb-6">For Viewers & Fans — $3.99/mo</p>
            <ul className="space-y-3 mb-8">
              {["Ad-free video streaming", "Exclusive Plus-only content", "Unlock commenting & community", "Plus badge on your profile"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <Check size={16} className="text-[#E53945] shrink-0" /> {feature}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="inline-block bg-[#E53945] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#d12e39] transition">
              Start Free Trial
            </Link>
          </div>
        </div>

        {/* CREATOR SECTION */}
        <div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[1.1]">
            Stop letting Big Tech <br className="hidden md:block"/>
            <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">eat your lunch.</span>
          </h1>
          <p className="text-lg text-white/50 mb-8 leading-relaxed">
            Traditional platforms take massive cuts and hide your content behind algorithms. Trooflix was built for creators who are tired of sharing their revenue with billionaires and being censored in the process.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8">
            <h3 className="text-2xl font-bold mb-2">Trooflix Creator</h3>
            <p className="text-white/50 mb-6">For Filmmakers & Podcasters — $9.99/mo</p>
            <ul className="space-y-3 mb-8">
              {["Upload unlimited movies & podcasts", "Custom Creator Hub page", "Keep 90% of your subscriber revenue", "We take the first $10 you earn to cover the fee"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <Check size={16} className="text-white shrink-0" /> {feature}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="inline-block bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-gray-200 transition">
              Become a Creator
            </Link>
          </div>
        </div>

      </div>
      <MobileBottomNav />
    </main>
  );
}
