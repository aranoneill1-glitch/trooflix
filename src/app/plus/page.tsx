"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles, Video } from "lucide-react";
import TopBar from "@/components/TopBar";
import { motion, AnimatePresence } from "framer-motion";

export default function PlusPage() {
  const [activeTab, setActiveTab] = useState<"viewer" | "creator">("viewer");

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 overflow-x-hidden selection:bg-red-600/30">
      <TopBar />
      
      <div className="relative pt-24 pb-24 px-6 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* SEGMENTED TOGGLE */}
        <div className="relative z-20 flex p-1 bg-[#1c1c1e] rounded-full border border-white/10 mb-16 w-full max-w-sm mx-auto shadow-2xl">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`flex-1 relative py-3 px-6 rounded-full text-sm font-bold transition-colors ${
              activeTab === "viewer" ? "text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {activeTab === "viewer" && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-full shadow-md" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Sparkles size={16} /> Viewer
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("creator")}
            className={`flex-1 relative py-3 px-6 rounded-full text-sm font-bold transition-colors ${
              activeTab === "creator" ? "text-black" : "text-white/60 hover:text-white"
            }`}
          >
            {activeTab === "creator" && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-white rounded-full shadow-md" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Video size={16} /> Creator
            </span>
          </button>
        </div>

        {/* DYNAMIC CONTENT AREA */}
        <AnimatePresence mode="wait">
          
          {/* =========================================
              VIEWER TAB 
          ========================================= */}
          {activeTab === "viewer" && (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center text-center"
            >
              {/* Ambient Glow */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-r from-red-600/20 to-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

              <h1 className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
                Uncensored. Unfiltered. <br className="hidden md:block"/>
                <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">Unbought.</span>
              </h1>
              
              <h2 className="relative z-10 text-xl md:text-2xl font-bold mb-8 text-white">
                Ad-free. No mainstream pollution. Just raw content.
              </h2>
              
              <p className="relative z-10 text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                Sick of the same recycled Hollywood scripts, the endless commercials, and the corporate agenda being shoved down your throat? Get unlimited, completely ad-free access to hard-hitting documentaries, independent films, and unfiltered podcasts that actually challenge the narrative. No ulterior motive. Just the raw truth from creators who aren't afraid to speak.
              </p>

              {/* Viewer Pricing Card */}
              <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">Trooflix Plus</h3>
                    <p className="text-white/50 text-sm">For Viewers & Fans</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black">$3.99</span>
                    <span className="text-white/50 text-sm">/mo</span>
                  </div>
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

                <Link href="/signup" className="w-full flex items-center justify-center bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-4 rounded-xl transition shadow-lg shadow-[#E53945]/20 text-lg">
                  Start Free Trial
                </Link>
              </div>
            </motion.div>
          )}

          {/* =========================================
              CREATOR TAB 
          ========================================= */}
          {activeTab === "creator" && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center text-center"
            >
              {/* Ambient Glow */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-r from-red-600/20 to-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

              <h1 className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
                Stop letting Big Tech <br className="hidden md:block"/>
                <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">eat your lunch.</span>
              </h1>
              
              <p className="relative z-10 text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                Traditional platforms take massive cuts and hide your content behind algorithms. Trooflix was built for creators who are tired of sharing their revenue with billionaires and being censored in the process.
              </p>

              {/* Creator Pricing Card */}
              <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-left shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-2xl font-bold">Trooflix Creator</h3>
                    <p className="text-white/50 text-sm">For Filmmakers & Podcasters</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black">$9.99</span>
                    <span className="text-white/50 text-sm">/mo</span>
                  </div>
                </div>
                
                <p className="text-xs text-[#1ed760] font-semibold mb-6 flex items-center gap-1">
                  <Check size={14} /> Free to start. No credit card required.
                </p>

                <ul className="space-y-3 mb-8">
                  {["Upload unlimited movies & podcasts", "Custom Creator Hub page", "Keep 90% of your subscriber revenue", "We take the first $10 you earn to cover the fee"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-white/80">
                      <Check size={16} className="text-white shrink-0" /> {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/why-us" className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition shadow-lg text-lg">
                  Become a Creator <ArrowRight size={20} />
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
