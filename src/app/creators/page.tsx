"use client";

import Link from "next/link";
import { ArrowRight, Shield, TrendingUp, MonitorPlay, MessageSquare, BadgeDollarSign, Sparkles, Star, Eye } from "lucide-react";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function CreatorsPage() {
  return (
    <div className="hidden md:block min-h-screen bg-[#050505] text-white pb-32 overflow-x-hidden selection:bg-red-600/30">
      <TopBar />
      
      {/* HERO SECTION */}
      <div className="relative pt-40 pb-24 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-red-600/30 via-red-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" 
        />
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]"
        >
          Stop letting Big Tech <br className="hidden md:block"/>
          <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">eat your lunch.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed"
        >
          Traditional platforms take massive cuts and hide your content behind algorithms. 
          Trooflix was built for creators who are tired of sharing their revenue with billionaires.
          At Trooflix, we don't wear small hats.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
        >
          <Link href="/signup?type=podcaster" className="group w-full sm:w-auto bg-white text-black font-bold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] text-lg flex items-center justify-center gap-2">
            Apply as a Creator 
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/upgrade" className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-full border border-white/10 backdrop-blur-md transition-all duration-300 text-lg">
            View Pricing
          </Link>
        </motion.div>
      </div>

      {/* COMPARISON TABLE */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUp}
        className="px-6 max-w-5xl mx-auto mb-32"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">The Math is Simple.</h2>
          <p className="text-white/50 text-lg">Why give away your hard-earned money?</p>
        </div>
        
        <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          <div className="grid grid-cols-4 text-center border-b border-white/10 bg-white/[0.02]">
            <div className="p-6 text-left font-semibold text-white/40 text-sm tracking-wider uppercase">Platform</div>
            <div className="p-6 font-semibold text-white/40 text-sm tracking-wider uppercase">Video Cut</div>
            <div className="p-6 font-semibold text-white/40 text-sm tracking-wider uppercase">Member Cut</div>
            <div className="p-6 font-bold text-white text-sm tracking-wider uppercase">You Keep</div>
          </div>
          
          <div className="grid grid-cols-4 text-center border-b border-white/5 hover:bg-white/[0.03] transition-colors">
            <div className="p-6 text-left font-bold text-lg text-white/90">YouTube</div>
            <div className="p-6 text-white/50 font-medium">45%</div>
            <div className="p-6 text-white/50 font-medium">30%</div>
            <div className="p-6 font-bold text-red-400/80 text-lg">55%</div>
          </div>

          <div className="grid grid-cols-4 text-center border-b border-white/5 hover:bg-white/[0.03] transition-colors">
            <div className="p-6 text-left font-bold text-lg text-white/90">Patreon</div>
            <div className="p-6 text-white/50 font-medium">N/A</div>
            <div className="p-6 text-white/50 font-medium">10% + Fees</div>
            <div className="p-6 font-bold text-red-400/80 text-lg">~80%</div>
          </div>

          <div className="grid grid-cols-4 text-center border-b border-white/5 hover:bg-white/[0.03] transition-colors">
            <div className="p-6 text-left font-bold text-lg text-white/90">Twitch</div>
            <div className="p-6 text-white/50 font-medium">N/A</div>
            <div className="p-6 text-white/50 font-medium">50%</div>
            <div className="p-6 font-bold text-red-400/80 text-lg">50%</div>
          </div>

          <div className="grid grid-cols-4 text-center bg-gradient-to-r from-red-600/20 via-red-600/5 to-transparent relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)]" />
            <div className="p-6 text-left font-black text-xl text-white flex items-center gap-3">
              Trooflix <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-lg">Best</span>
            </div>
            <div className="p-6 font-bold text-white text-lg">Free</div>
            <div className="p-6 font-bold text-white text-lg">10%</div>
            <div className="p-6 font-black text-green-400 text-xl">90%</div>
          </div>
        </div>
      </motion.div>

      {/* NEW EDITORIAL FEATURES SECTION */}
      <div className="px-6 max-w-6xl mx-auto mb-32 space-y-6">
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Everything you need to build an empire.</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">We didn't just build a video host. We built an entire ecosystem.</p>
        </motion.div>

        {/* Row 1: One Platform (Full Width) */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="group relative bg-[#0a0a0a] border border-white/10 p-10 md:p-14 rounded-3xl hover:border-white/20 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-3xl md:text-5xl font-black mb-4">Stop Duct-Taping Your Business Together.</h3>
            <p className="text-white/50 text-lg max-w-3xl mb-10">
              You shouldn't need YouTube for video, Patreon for memberships, Shopify for merch, and Instagram for promo. Trooflix is a complete ecosystem.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: MonitorPlay, label: "Cinematic Catalog" },
                { icon: MessageSquare, label: "Direct DMs" },
                { icon: TrendingUp, label: "Reels Feed" },
                { icon: BadgeDollarSign, label: "Built-in Merch" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <item.icon size={28} className="text-red-400 mb-2" />
                  <span className="text-sm font-semibold text-white/80">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Row 2: Censorship & Discovery (Two Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* No Censorship */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="group relative bg-[#0a0a0a] border border-white/10 p-10 rounded-3xl hover:border-white/20 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-6">
                <Shield size={28} className="text-red-400" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-3">Your Voice. Your Rules.</h3>
              <p className="text-white/50 text-base leading-relaxed">
                On other platforms, your content can be demonetized, shadowbanned, or deleted because an algorithm doesn't like it. Trooflix is different. We don't silence opinions. As long as you follow basic community guidelines, your work is safe here.
              </p>
            </div>
          </motion.div>

          {/* Built-In Discovery */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            className="group relative bg-[#0a0a0a] border border-white/10 p-10 rounded-3xl hover:border-white/20 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center mb-6">
                <Eye size={28} className="text-red-400" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-3">We Bring the Audience to You.</h3>
              <p className="text-white/50 text-base leading-relaxed">
                On Patreon, you have to bring 100% of your own traffic. On Trooflix, your content is featured on the global homepage, in "New Releases," and in the "Trending Now" rows. New users can discover you without you spending a single dollar on ads.
              </p>
            </div>
          </motion.div>

        </div>

        {/* Row 3: Founding Creator (Highlighted) */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="relative bg-gradient-to-br from-red-600/10 via-[#0a0a0a] to-[#0a0a0a] border border-red-500/30 p-10 md:p-14 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)]"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Star size={20} className="text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-sm font-bold tracking-widest uppercase">Limited Opportunity</span>
              </div>
              <h3 className="text-3xl md:text-5xl font-black mb-3">Become a Founding Creator.</h3>
              <p className="text-white/60 text-lg leading-relaxed">
                We are onboarding our first 10 creators right now. Founding Creators get their Podcaster tier free for life, permanent featured placement on the homepage, and direct access to the founder for feature requests. You aren't just a user; you're a partner in building the platform.
              </p>
            </div>
            <Link href="/signup?type=podcaster" className="flex-shrink-0 bg-white text-black font-bold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] text-lg flex items-center gap-2">
              Claim Your Spot <ArrowRight size={20} />
            </Link>
          </div>
        </motion.div>

      </div>

      {/* FOOTER CTA */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="px-6 max-w-4xl mx-auto text-center relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 bg-[#0a0a0a] border border-white/10 rounded-3xl p-12 md:p-20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Ready to own your audience?</h2>
          <p className="text-white/50 mb-10 text-lg max-w-xl mx-auto">Stop building your house on rented land. Bring your content to a platform that actually respects creators.</p>
          <Link href="/signup?type=podcaster" className="inline-block bg-white text-black font-bold px-10 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] text-lg">
            Claim Your Creator Account
          </Link>
        </div>
      </motion.div>

    </div>
  );
}
