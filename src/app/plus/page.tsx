"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TopBar from "@/components/TopBar";
import { motion } from "framer-motion";

export default function PlusPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 overflow-x-hidden selection:bg-red-600/30">
      <TopBar />
      
      <div className="relative pt-40 pb-24 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-red-600/30 via-red-600/10 to-transparent rounded-full blur-[120px] pointer-events-none" 
        />
        
        {/* CREATOR HERO SECTION */}
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
          Trooflix was built for creators who are tired of sharing their revenue with billionaires and being censored in the process.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full mb-24"
        >
          <Link href="/why-us" className="group w-full sm:w-auto bg-white text-black font-bold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] text-lg flex items-center justify-center gap-2">
            Apply as a Creator 
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-full border border-white/10 backdrop-blur-md transition-all duration-300 text-lg">
            Why Trooflix
          </button>
        </motion.div>

        {/* VIEWER HERO SECTION (Below buttons) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center text-center w-full border-t border-white/10 pt-24"
        >
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[1.1]">
            Uncensored. Unfiltered. <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">Unbought.</span>
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold mb-8 text-white">
            Ad-free. No mainstream pollution. Just raw content.
          </h3>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-medium leading-relaxed">
            Sick of the same recycled Hollywood scripts, the endless commercials, and the corporate agendas shoved down your throat? Trooflix is your escape. Get unlimited, completely ad-free access to hard-hitting documentaries, independent films, and unfiltered podcasts that actually challenge the narrative. No ulterior motive. Just the raw truth from creators who aren't afraid to speak.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
