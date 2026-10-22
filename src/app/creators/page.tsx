"use client";

import Link from "next/link";
import { ArrowRight, Check, Shield, TrendingUp, MonitorPlay, MessageSquare, BadgeDollarSign, ChevronLeft } from "lucide-react";
import TopBar from "@/components/TopBar";

export default function CreatorsPage() {
  return (
    // 'hidden md:block' hides this entirely on mobile devices
    <div className="hidden md:block min-h-screen bg-black text-white pb-24">
      <TopBar />
      
      {/* HERO SECTION */}
      <div className="relative pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-widest uppercase mb-6">
            The Future of Streaming
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
            Stop letting Big Tech <br className="hidden md:block"/>
            <span className="text-red-500">eat your lunch.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Traditional platforms take massive cuts and hide your content behind algorithms. 
            Trooflix was built for creators who are tired of sharing their revenue with billionaires.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup?type=podcaster" className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-xl transition shadow-lg shadow-red-600/20 text-lg flex items-center justify-center gap-2">
              Apply as a Creator <ArrowRight size={20} />
            </Link>
            <Link href="/upgrade" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl border border-white/10 transition text-lg">
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div className="px-4 md:px-8 max-w-4xl mx-auto mb-24">
        <h2 className="text-2xl md:text-4xl font-black text-center mb-10">The Math is Simple.</h2>
        <div className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
          <div className="grid grid-cols-4 text-center border-b border-white/10 bg-black/40">
            <div className="p-4 text-left font-semibold text-white/50">Platform Type</div>
            <div className="p-4 font-semibold text-white/50">Video</div>
            <div className="p-4 font-semibold text-white/50">Memberships</div>
            <div className="p-4 font-bold text-white">You Keep</div>
          </div>
          
          <div className="grid grid-cols-4 text-center border-b border-white/5 hover:bg-white/5 transition">
            <div className="p-5 text-left font-bold">Traditional Video (e.g. YouTube)</div>
            <div className="p-5 text-white/60">45% cut</div>
            <div className="p-5 text-white/60">30% cut</div>
            <div className="p-5 font-bold text-red-400">~55%</div>
          </div>

          <div className="grid grid-cols-4 text-center border-b border-white/5 hover:bg-white/5 transition">
            <div className="p-5 text-left font-bold">Live Streaming (e.g. Twitch)</div>
            <div className="p-5 text-white/60">50% cut</div>
            <div className="p-5 text-white/60">50% cut</div>
            <div className="p-5 font-bold text-red-400">~50%</div>
          </div>

          <div className="grid grid-cols-4 text-center border-b border-white/5 hover:bg-white/5 transition">
            <div className="p-5 text-left font-bold">Membership (e.g. Patreon)</div>
            <div className="p-5 text-white/60">N/A</div>
            <div className="p-5 text-white/60">10% + Fees</div>
            <div className="p-5 font-bold text-white/60">~80%</div>
          </div>

          <div className="grid grid-cols-4 text-center bg-red-600/10 hover:bg-red-600/20 transition">
            <div className="p-5 text-left font-black text-red-500 flex items-center gap-2">
              Trooflix <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded">BEST</span>
            </div>
            <div className="p-5 font-bold text-white">Free</div>
            <div className="p-5 font-bold text-white">10% cut</div>
            <div className="p-5 font-black text-green-400">90%</div>
          </div>
        </div>
      </div>

      {/* FEATURES GRID */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto mb-24">
        <h2 className="text-2xl md:text-4xl font-black text-center mb-10">Everything you need to build an empire.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#1c1c1e]/50 border border-white/10 p-6 rounded-2xl">
            <TrendingUp size={32} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Watch-Time Pool</h3>
            <p className="text-white/60 text-sm">We take 50% of our platform pass revenue and distribute it based on total watch minutes. Great content gets paid, not just clickbait thumbnails.</p>
          </div>

          <div className="bg-[#1c1c1e]/50 border border-white/10 p-6 rounded-2xl">
            <MonitorPlay size={32} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Cinematic Catalog</h3>
            <p className="text-white/60 text-sm">A Netflix-style homepage for your documentaries and full-length podcasts. Give your work the premium presentation it deserves.</p>
          </div>

          <div className="bg-[#1c1c1e]/50 border border-white/10 p-6 rounded-2xl">
            <BadgeDollarSign size={32} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Built-in Merch Shop</h3>
            <p className="text-white/60 text-sm">Upload your designs, set your prices, and sell directly to your audience. We handle the checkout, you keep 90%.</p>
          </div>

          <div className="bg-[#1c1c1e]/50 border border-white/10 p-6 rounded-2xl">
            <Shield size={32} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">No Censorship</h3>
            <p className="text-white/60 text-sm">We don't silence opinions. As long as you follow basic community guidelines, your documentaries, podcasts, and reels are safe.</p>
          </div>

          <div className="bg-[#1c1c1e]/50 border border-white/10 p-6 rounded-2xl">
            <MessageSquare size={32} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Direct Connection</h3>
            <p className="text-white/60 text-sm">Built-in DMs and community features. Don't rely on an algorithm to talk to your own audience.</p>
          </div>

          <div className="bg-[#1c1c1e]/50 border border-white/10 p-6 rounded-2xl">
            <Check size={32} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Founding Creator Status</h3>
            <p className="text-white/60 text-sm">The first 10 creators to join get their Podcaster tier free for life, and featured placement on the homepage.</p>
          </div>

        </div>
      </div>

      {/* FOOTER CTA */}
      <div className="px-4 md:px-8 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-black mb-6">Ready to own your audience?</h2>
        <p className="text-white/60 mb-8">Stop building your house on rented land. Bring your content to a platform that actually respects creators.</p>
        <Link href="/signup?type=podcaster" className="inline-block bg-red-600 hover:bg-red-500 text-white font-bold px-10 py-4 rounded-xl transition shadow-lg shadow-red-600/20 text-lg">
          Claim Your Creator Account
        </Link>
      </div>

    </div>
  );
}
