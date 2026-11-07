"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Play, ShieldCheck, DollarSign, Download, Radio, MessageSquare, Store, Zap } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24 font-sans selection:bg-[#E53945]/30">
      <TopBar />
      
      <div className="max-w-5xl mx-auto px-6 pt-24 md:pt-32">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-12 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        {/* HEADER */}
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-6">
            The Unfair <span className="text-[#E53945]">Advantage.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            We didn't build Trooflix to be another YouTube clone. We built it to be the ultimate weapon for independent creators and free thinkers.
          </p>
        </div>

        {/* HERO FEATURE: REVENUE */}
        <div className="bg-gradient-to-br from-[#E53945]/20 to-[#0a0303] border border-[#E53945]/30 rounded-3xl p-8 md:p-12 mb-12 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          <div className="flex-1">
            <div className="w-14 h-14 bg-[#E53945] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#E53945]/40">
              <DollarSign size={28} className="text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Keep 99% of Your Revenue.</h2>
            <p className="text-white/70 text-lg leading-relaxed mb-6">
              Why let Big Tech take 45% of your hard-earned money? Whether it's subscriptions, tips, or merch sales, you keep 99%. We take a flat 1% to keep the servers running.
            </p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/90"><CheckCircle2 size={20} className="text-green-500" /> Instant Payouts for Creator Tier</li>
              <li className="flex items-center gap-3 text-white/90"><CheckCircle2 size={20} className="text-green-500" /> Transparent 1% flat fee (plus standard Stripe processing)</li>
            </ul>
          </div>
          <div className="flex-1 w-full relative h-64 md:h-auto md:self-stretch bg-black/40 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
            <span className="text-6xl md:text-8xl font-black text-[#E53945]">99%</span>
          </div>
        </div>

        {/* GRID FEATURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition">
            <ShieldCheck size={32} className="text-[#E53945] mb-6" />
            <h3 className="text-2xl font-bold mb-3">Zero Censorship. Zero Algorithms.</h3>
            <p className="text-white/60 leading-relaxed">
              We don't shadowban. We don't demonetize based on "sensitive topics." Your followers get notified when you post, and your content is delivered exactly as you uploaded it.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition">
            <Download size={32} className="text-[#E53945] mb-6" />
            <h3 className="text-2xl font-bold mb-3">1-Click YouTube Migration</h3>
            <p className="text-white/60 leading-relaxed">
              Don't start from scratch. Use our Google Takeout importer to bring your entire back-catalog to Trooflix securely, without losing your metadata.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition">
            <Radio size={32} className="text-[#E53945] mb-6" />
            <h3 className="text-2xl font-bold mb-3">Broadcast-Quality Live</h3>
            <p className="text-white/60 leading-relaxed">
              Go live instantly with our WebRTC studio. Bring guests on screen, split your canvas, and stream seamlessly to your subscribers.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition">
            <MessageSquare size={32} className="text-[#E53945] mb-6" />
            <h3 className="text-2xl font-bold mb-3">Built-in Voice & Video Calls</h3>
            <p className="text-white/60 leading-relaxed">
              Stop sending fans to Zoom or Skype. TrooChat includes native WebRTC voice and video calling, allowing you to connect directly with your top supporters.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition">
            <Store size={32} className="text-[#E53945] mb-6" />
            <h3 className="text-2xl font-bold mb-3">A Full Storefront</h3>
            <p className="text-white/60 leading-relaxed">
              Sell merch, books, and digital goods directly on your profile. We handle the basket, Stripe checkout, and order management so you can focus on creating.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition">
            <Zap size={32} className="text-[#E53945] mb-6" />
            <h3 className="text-2xl font-bold mb-3">Multipart Video Uploads</h3>
            <p className="text-white/60 leading-relaxed">
              Upload massive 4K documentaries straight from your phone. Our custom chunked uploader bypasses iOS memory limits and pushes directly to Cloudflare R2.
            </p>
          </div>

        </div>

        {/* BOTTOM CTA */}
        <div className="text-center bg-[#1c1c1e] border border-white/10 rounded-3xl p-12 mb-12">
          <h2 className="text-3xl font-black mb-4">Ready to take your lunch back?</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Join the platform built for the creators, not the billionaires. 
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/apply" className="bg-[#E53945] text-white font-bold px-8 py-3.5 rounded-full hover:bg-[#d12e39] transition text-lg shadow-lg shadow-[#E53945]/30">
              Apply as a Creator
            </Link>
            <Link href="/upgrade" className="bg-white/10 border border-white/20 text-white font-bold px-8 py-3.5 rounded-full hover:bg-white/20 transition text-lg">
              View Pricing
            </Link>
          </div>
        </div>

      </div>
      <MobileBottomNav />
    </main>
  );
}
