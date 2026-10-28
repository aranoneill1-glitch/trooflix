"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Play, Sparkles, Video, Check, Crown, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCachedUser } from "@/lib/cache";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function PlusPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"viewer" | "creator">("viewer");
  
  // Dashboard State
  const [videos, setVideos] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    getCachedUser().then((u) => {
      setUser(u);
      setLoading(false);
      
      if (u) {
        // Fetch content for the logged-in dashboard
        Promise.all([
          fetch("/api/videos", { cache: "no-store" }).then(r => r.json()),
          fetch("/api/creators", { cache: "no-store" }).then(r => r.json()).catch(() => [])
        ]).then(([vData, cData]) => {
          setVideos(Array.isArray(vData) ? vData : []);
          setCreators(Array.isArray(cData) ? cData : []);
          setDashboardLoading(false);
        }).catch(() => setDashboardLoading(false));
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </div>
    );
  }

  // ==========================================
  // LOGGED IN: VIP PREMIUM DASHBOARD
  // ==========================================
  if (user) {
    const heroVideo = videos[0];
    const exclusiveVideos = videos.slice(0, 10);
    const continueWatching = videos.slice(2, 8);

    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white pb-32 font-sans selection:bg-[#E53945]/30">
        <TopBar />

        {dashboardLoading ? (
          <div className="flex justify-center py-40">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* CINEMATIC HERO */}
            {heroVideo && (
              <div className="relative w-full h-[60vh] md:h-[70vh]">
                <img 
                  src={heroVideo.backdropUrl || heroVideo.posterUrl} 
                  alt={heroVideo.title} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-black/60" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-4xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={16} className="text-[#E53945]" />
                    <span className="text-[10px] md:text-xs tracking-[0.3em] text-[#E53945] font-bold uppercase">Exclusive Plus Premiere</span>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-[1.05]">
                    {heroVideo.title}
                  </h1>
                  <p className="text-sm md:text-base text-white/60 max-w-xl line-clamp-2 mb-6">
                    {heroVideo.description || "Welcome to the inner circle. Watch this exclusive premiere before anyone else."}
                  </p>
                  <Link href={`/watch/${heroVideo.id}`} className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:scale-105 transition shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                    <Play size={20} fill="black" /> Play Now
                  </Link>
                </div>
              </div>
            )}

            {/* CONTENT ROWS */}
            <div className="relative z-10 mt-8 space-y-10">
              
              {/* Row 1: Plus Exclusives */}
              <section>
                <div className="flex items-center justify-between px-6 md:px-12 mb-4">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="text-[#E53945]" size={20} /> Plus Exclusives
                  </h2>
                </div>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-4">
                  {exclusiveVideos.map((v) => (
                    <Link key={v.id} href={`/watch/${v.id}`} className="flex-shrink-0 w-[240px] md:w-[320px] group">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E53945]/30 shadow-[0_0_20px_rgba(229,57,69,0.15)] group-hover:border-[#E53945] transition-colors mb-2">
                        <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-2 left-2 bg-[#E53945] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm flex items-center gap-1">
                          <Crown size={10} /> Plus
                        </div>
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <Play size={20} fill="white" />
                          </div>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-[#E53945] transition">{v.title}</h3>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Row 2: Continue Watching */}
              {continueWatching.length > 0 && (
                <section>
                  <div className="flex items-center justify-between px-6 md:px-12 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold">Continue Watching</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-4">
                    {continueWatching.map((v) => (
                      <Link key={v.id} href={`/watch/${v.id}`} className="flex-shrink-0 w-[200px] md:w-[260px] group">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-2">
                          <img src={v.posterUrl || v.backdropUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div className="h-full bg-[#E53945]" style={{ width: '45%' }} />
                          </div>
                        </div>
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 group-hover:text-white/70 transition">{v.title}</h3>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Row 3: Creators You Support */}
              {creators.length > 0 && (
                <section className="pb-10">
                  <div className="flex items-center justify-between px-6 md:px-12 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold">Creators You Support</h2>
                  </div>
                  <div className="flex gap-6 overflow-x-auto scrollbar-hide px-6 md:px-12 pb-4">
                    {creators.slice(0, 10).map((c: any) => (
                      <Link key={c.id} href={`/podcaster/${c.slug}`} className="flex flex-col items-center gap-2 flex-shrink-0 group w-[80px] md:w-[96px]">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] bg-[#E53945] group-hover:scale-105 transition-transform">
                          <div className="w-full h-full rounded-full border-2 border-[#0a0a0a] overflow-hidden bg-[#1c1c1e]">
                            {c.photoUrl ? <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white">{c.name?.[0]}</div>}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-white/80 group-hover:text-white transition truncate w-full text-center">{c.name}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </>
        )}

        <MobileBottomNav />
      </main>
    );
  }

  // ==========================================
  // LOGGED OUT: SALES FUNNEL
  // ==========================================
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
          
          {/* VIEWER TAB */}
          {activeTab === "viewer" && (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center text-center"
            >
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

          {/* CREATOR TAB */}
          {activeTab === "creator" && (
            <motion.div
              key="creator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-r from-red-600/20 to-pink-600/10 rounded-full blur-[120px] pointer-events-none" />

              <h1 className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
                Stop letting Big Tech <br className="hidden md:block"/>
                <span className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">eat your lunch.</span>
              </h1>
              
              <p className="relative z-10 text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                Traditional platforms take massive cuts and hide your content behind algorithms. Trooflix was built for creators who are tired of sharing their revenue with billionaires and being censored in the process.
              </p>

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
