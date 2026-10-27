"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Sparkles, Video, ArrowLeft, Play, ShieldCheck } from "lucide-react";
import { getCachedUser } from "@/lib/cache";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function PlusPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  // LOGGED IN STATE (Placeholder)
  if (user) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
        <div className="max-w-2xl mx-auto px-4 pt-20">
          <h1 className="text-3xl font-bold mb-4">Welcome to Trooflix Plus</h1>
          <p className="text-white/60">You are logged in. We will build the content page here next!</p>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  // LOGGED OUT STATE (Combined Landing Page + Pricing)
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans relative overflow-hidden">
      
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[600px] bg-[#E53945]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-6 left-4 z-50">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition text-sm font-semibold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-32">
        
        {/* =========================================
            HERO 1: THE CREATOR PITCH 
        ========================================= */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-5">
            Stop letting Big Tech <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E53945] to-[#ff7e85]">eat your lunch.</span>
          </h1>
          <p className="text-base md:text-lg text-white/60 leading-relaxed font-medium">
            Traditional platforms take massive cuts and hide your content behind algorithms. Trooflix was built for creators who are tired of sharing their revenue with billionaires and being censored in the process.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-16" />

        {/* =========================================
            HERO 2: THE VIEWER PITCH 
        ========================================= */}
        <div className="text-center mb-16">
          <div className="w-12 h-12 mx-auto bg-[#E53945]/10 rounded-xl flex items-center justify-center mb-6 border border-[#E53945]/20">
            <Play className="text-[#E53945] ml-1" size={24} fill="currentColor" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-3">
            Uncensored. Unfiltered. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E53945] to-[#ff7e85]">Unbought.</span>
          </h2>
          <h3 className="text-xl md:text-2xl font-bold text-white mb-5">
            No ads. No mainstream pollution. Just raw content.
          </h3>
          <p className="text-base md:text-lg text-white/60 leading-relaxed font-medium">
            You're sick of the same recycled Hollywood scripts, the endless commercials, and the corporate agendas shoved down your throat. Trooflix Plus is your escape. Get unlimited access to hard-hitting documentaries, independent films, and unfiltered podcasts that actually challenge the narrative. No algorithms. No spin. Just the raw truth from creators who aren't afraid to speak.
          </p>
        </div>

        {/* =========================================
            PRICING SECTION
        ========================================= */}
        <div id="pricing" className="text-center mb-8">
          <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-2">
            CHOOSE YOUR PATH
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
            Join The Revolution
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* Trooflix Plus (Viewer) Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-[#E53945]/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E53945]/10 blur-3xl rounded-full" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#E53945]/20 flex items-center justify-center">
                <Sparkles className="text-[#E53945]" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Trooflix Plus</h2>
                <p className="text-xs text-white/50">For Viewers & Fans</p>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-black">$3.99</span>
              <span className="text-white/50 text-sm font-medium mb-1">/ month</span>
            </div>

            <div className="bg-[#E53945]/10 border border-[#E53945]/20 text-[#E53945] text-xs font-bold px-3 py-1.5 rounded-full inline-block mb-6">
              7-DAY FREE TRIAL
            </div>

            <ul className="space-y-3 mb-8">
              {["Ad-free video streaming", "Exclusive Plus-only content", "Unlock commenting & community", "Plus badge on your profile"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <Check size={16} className="text-[#E53945] shrink-0" /> {feature}
                </li>
              ))}
            </ul>

            <button className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
              Start Free Trial
            </button>
          </div>

          {/* Creator Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/30 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Video className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Trooflix Creator</h2>
                <p className="text-xs text-white/50">For Filmmakers & Podcasters</p>
              </div>
            </div>

            <div className="flex items-end gap-2 mb-1">
              <span className="text-4xl font-black">$9.99</span>
              <span className="text-white/50 text-sm font-medium mb-1">/ month</span>
            </div>
            <p className="text-xs text-[#1ed760] font-semibold mb-6 flex items-center gap-1">
              <ShieldCheck size={14} /> Free to start. No credit card required.
            </p>

            <ul className="space-y-3 mb-8">
              {["Upload unlimited movies & podcasts", "Custom Creator Hub page", "Keep 90% of your subscriber revenue", "We take the first $10 you earn to cover the fee"].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                  <Check size={16} className="text-white shrink-0" /> {feature}
                </li>
              ))}
            </ul>

            <Link href="/why-us" className="w-full flex items-center justify-center bg-white hover:bg-gray-200 text-black font-bold py-3.5 rounded-xl transition shadow-lg">
              Become a Creator
            </Link>
          </div>

        </div>

        <p className="text-center text-xs text-white/30 mt-8 px-8">
          By subscribing, you agree to our Terms of Service and Privacy Policy. All plans auto-renew until canceled.
        </p>

      </div>

      <MobileBottomNav />
    </main>
  );
}
