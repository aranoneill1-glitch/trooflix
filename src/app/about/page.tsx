"use client";

import Link from "next/link";
import { Heart, Shield, Coins, Video, Radio, ShoppingBag, Star, MessageCircle, Wallet, Bell, Layers } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

const FEATURES = [
  { icon: Shield, title: "Freedom of Speech", desc: "A platform built for open expression, without the mainstream noise." },
  { icon: Coins, title: "Get Rewarded", desc: "Earn from your hard work through tips, support, and creator monetization." },
  { icon: Video, title: "Videos, Shorts & Podcasts", desc: "Create and share long-form videos, reels, and podcasts in one place." },
  { icon: Radio, title: "Go Live", desc: "Stream live and connect with your audience in real time." },
  { icon: ShoppingBag, title: "Creator Shop", desc: "Sell merch and products directly to your community." },
  { icon: Star, title: "Premium Subscriptions", desc: "Offer exclusive content and build a loyal subscriber base." },
  { icon: MessageCircle, title: "Messages & Community", desc: "Chat, comment, and build real connections with your audience." },
  { icon: Wallet, title: "Wallet & TrooCoins", desc: "Top up, tip creators, and manage your earnings with ease." },
  { icon: Bell, title: "Notifications", desc: "Stay on top of likes, comments, follows, sales, and more." },
  { icon: Layers, title: "All in One Place", desc: "We’re blending many platforms into one unique home for creators and viewers." },
];

export default function AboutTrooflixPage() {
  return (
    <main className="min-h-screen bg-[#09090B] text-white pb-28 font-sans selection:bg-[#E53945]/30 overflow-x-hidden">
      <TopBar />

      <div className="relative max-w-5xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+6.5rem)] pb-10">
        <div className="absolute inset-x-0 top-16 h-80 bg-[radial-gradient(circle_at_top,rgba(229,57,69,0.22),transparent_55%)] pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-64 left-[-6rem] w-72 h-72 bg-pink-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto mb-14">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/12 border border-red-500/20 flex items-center justify-center mb-7 shadow-[0_12px_40px_rgba(229,57,69,0.18)]">
            <Heart size={34} className="text-red-400" fill="currentColor" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45 mb-4">About Trooflix</p>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[0.95] mb-6">
            Built for creators.
            <br />
            <span className="bg-gradient-to-r from-white via-white to-red-300 bg-clip-text text-transparent">Built for you.</span>
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-white/68 font-medium">
            We built Trooflix for total freedom of speech, and for creators to be rewarded for the hard work they put into their content.
          </p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:bg-white/[0.07] hover:border-white/15"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,57,69,0.10),transparent_40%)] opacity-70 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-red-400">
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-white/58">{f.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-14 text-center">
          <p className="text-white/45 text-sm mb-5">Everything you need. All in one spot.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition shadow-[0_10px_30px_rgba(255,255,255,0.12)]">
              Explore Trooflix
            </Link>
            <Link href="/signup" className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-[#E53945]/90 hover:bg-[#E53945] border border-red-400/20 text-white font-bold text-sm transition shadow-[0_10px_30px_rgba(229,57,69,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]">
              Create Account
            </Link>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </main>
  );
}
