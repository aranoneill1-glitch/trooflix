"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Play, MessageCircle, Heart, Share2, Users, Shield, 
  TrendingUp, ShoppingBag, Wallet, BarChart3, Smartphone, 
  Zap, MonitorPlay, DollarSign, Sparkles, CheckCircle2,
  Bookmark, Repeat2, Lock, Upload, ChevronLeft
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 overflow-x-hidden selection:bg-red-500/30">
      
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition">
          <ChevronLeft size={18} /> Back to Trooflix
        </Link>
        <span className="text-xl font-black tracking-tight">
          <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
        </span>
        <Link href="/signup" className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition">
          Sign Up
        </Link>
      </div>

      {/* HERO */}
      <div className="relative pt-24 pb-16 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-red-600/20 via-orange-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" 
        />
        
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
          Everything you need. <br className="hidden md:block"/>
          <span className="text-red-500">All in one place.</span>
        </motion.h1>
        
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative z-10 text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
          Trooflix isn't just a video host. It's a complete ecosystem for watching, creating, and monetizing. Built for the modern creator economy.
        </motion.p>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <Link href="/signup" className="group w-full sm:w-auto bg-white text-black font-bold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] text-lg flex items-center justify-center gap-2">
            Join for Free
          </Link>
          <Link href="/creators" className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-full border border-white/10 backdrop-blur-md transition-all duration-300 text-lg">
            Become a Creator
          </Link>
        </motion.div>
      </div>

      {/* SECTION 1: FOR VIEWERS */}
      <div className="px-6 max-w-6xl mx-auto mb-32">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">For the Viewers.</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">An entertainment experience that respects your time, your eyes, and your intelligence.</p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <motion.div variants={fadeUp} className="md:col-span-2 group relative bg-[#0a0a0a] border border-white/5 p-8 md:p-10 rounded-3xl hover:border-white/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-6"><MonitorPlay size={24} className="text-red-500"/></div>
              <h3 className="text-2xl font-bold mb-3">Cinematic On-Demand Catalog</h3>
              <p className="text-white/50 text-base">A beautifully curated, high-end streaming interface for documentaries, movies, and long-form podcasts. Zero clutter, pure cinema.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-white/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6"><Smartphone size={24} className="text-orange-500"/></div>
            <h3 className="text-xl font-bold mb-3">Immersive Vertical Feed</h3>
            <p className="text-white/50 text-sm">Endless, full-screen short-form videos. Swipe seamlessly through Reels with buttery-smooth playback.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-white/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6"><MessageCircle size={24} className="text-blue-500"/></div>
            <h3 className="text-xl font-bold mb-3">Social Connectivity</h3>
            <p className="text-white/50 text-sm">Built-in DMs, threaded comments, reposts, and My List. Connect directly with creators and other fans.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="md:col-span-2 group relative bg-gradient-to-br from-red-600/10 to-[#0a0a0a] border border-red-500/20 p-8 md:p-10 rounded-3xl overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black mb-2 text-white">The Trooflix Pass</h3>
                <p className="text-white/60 text-base">One subscription. Unlocks all premium content across the entire platform. Plus, get the exclusive red verified badge.</p>
              </div>
              <Link href="/upgrade" className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:scale-105 transition text-center shrink-0">Get the Pass</Link>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* SECTION 2: FOR CREATORS */}
      <div className="px-6 max-w-6xl mx-auto mb-32">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">For the Creators.</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">We give you the tools to build an empire, and we only take 10%.</p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <motion.div variants={fadeUp} className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-yellow-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-6"><DollarSign size={24} className="text-yellow-500"/></div>
            <h3 className="text-2xl font-bold mb-3">90/10 Revenue Split</h3>
            <p className="text-white/50 text-base">Keep 90% of your subscription and merch revenue. We take just 10% to cover platform fees. No hidden charges.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-green-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-6"><TrendingUp size={24} className="text-green-500"/></div>
            <h3 className="text-2xl font-bold mb-3">Watch-Time Pools</h3>
            <p className="text-white/50 text-base">We redistribute a percentage of platform revenue back to creators based on actual watch minutes. Quality content gets rewarded, not just clickbait.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-white/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6"><ShoppingBag size={24} className="text-purple-500"/></div>
            <h3 className="text-xl font-bold mb-3">Integrated Merch Store</h3>
            <p className="text-white/50 text-sm">Upload products, track inventory, and manage orders directly from your Studio. Escrow protection ensures safe payouts.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-white/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6"><Wallet size={24} className="text-cyan-500"/></div>
            <h3 className="text-xl font-bold mb-3">Creator Wallet</h3>
            <p className="text-white/50 text-sm">Track your pending and available balances in real-time. Withdraw directly to your bank once you hit the threshold.</p>
          </motion.div>

        </motion.div>
      </div>

      {/* SECTION 3: THE TECH */}
      <div className="px-6 max-w-6xl mx-auto mb-32">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Powered by Premium Tech.</h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">Engineered for scale, speed, and a flawless native experience.</p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          <motion.div variants={fadeUp} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl text-center">
            <Zap size={24} className="mx-auto text-yellow-500 mb-3" />
            <h4 className="font-bold text-sm mb-1">Lightning Fast</h4>
            <p className="text-white/40 text-xs">Cloudflare R2 & Vercel Edge</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl text-center">
            <Smartphone size={24} className="mx-auto text-white mb-3" />
            <h4 className="font-bold text-sm mb-1">Native iOS App</h4>
            <p className="text-white/40 text-xs">Full-screen glass UI</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl text-center">
            <Shield size={24} className="mx-auto text-green-500 mb-3" />
            <h4 className="font-bold text-sm mb-1">Secure Payments</h4>
            <p className="text-white/40 text-xs">Stripe & Apple IAP</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl text-center">
            <Play size={24} className="mx-auto text-red-500 mb-3" />
            <h4 className="font-bold text-sm mb-1">Custom Player</h4>
            <p className="text-white/40 text-xs">Gesture controls & timeline</p>
          </motion.div>

        </motion.div>
      </div>

      {/* FOOTER CTA */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="px-6 max-w-4xl mx-auto text-center relative pb-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 bg-[#0a0a0a] border border-white/10 rounded-3xl p-12 md:p-20 shadow-2xl overflow-hidden">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Ready to join the revolution?</h2>
          <p className="text-white/50 mb-10 text-lg max-w-xl mx-auto">Whether you're here to watch, or here to build. Your journey starts now.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto bg-white text-black font-bold px-10 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] text-lg">
              Create Free Account
            </Link>
            <Link href="/why-us" className="w-full sm:w-auto bg-red-600/10 text-red-500 border border-red-500/20 font-bold px-10 py-4 rounded-full transition-all duration-300 hover:bg-red-600/20 text-lg">
              Why Trooflix
            </Link>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
