"use client";

import Link from "next/link";
import { ArrowLeft, Check, X, Sparkles, Crown, Video } from "lucide-react";

const FEATURES = [
  { name: "Watch unlimited Shorts", free: true, plus: true, creator: true },
  { name: "Send direct messages", free: true, plus: true, creator: true },
  { name: "Buy merch & books", free: true, plus: true, creator: true },
  { name: "Upload Shorts (3 min max)", free: true, plus: false, creator: false },
  { name: "Upload Shorts (Unlimited)", free: false, plus: true, creator: true },
  { name: "Unlimited long-form viewing", free: false, plus: true, creator: true },
  { name: "Watch live streams", free: false, plus: true, creator: true },
  { name: "Upload merch / open shop", free: false, plus: true, creator: true },
  { name: "Upload long-form (podcasts, docs)", free: false, plus: false, creator: true },
  { name: "Go Live (broadcast)", free: false, plus: false, creator: true },
  { name: "Post Tweets", free: false, plus: false, creator: true },
  { name: "Full Creator Dashboard", free: false, plus: false, creator: true },
  { name: "Custom profile theme", free: false, plus: false, creator: true },
  { name: "Red tick", free: false, plus: true, creator: false },
  { name: "Gold tick", free: false, plus: false, creator: true },
  { name: "99% revenue share", free: false, plus: false, creator: true },
];

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#0a0303] text-white py-20 px-4 md:px-8 font-sans selection:bg-[#E53945]/30 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E53945]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-10 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">Join Trooflix</h1>
          <p className="text-white/50 text-lg">Choose your plan. Upgrade or cancel anytime.</p>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block bg-[#0f0f12]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr>
                <th className="p-8 text-left border-b border-white/10 w-1/3 bg-black/20">
                  <h2 className="text-xl font-bold text-white mb-1">Features</h2>
                  <p className="text-sm text-white/50">Compare what you get.</p>
                </th>
                
                <th className="p-8 border-b border-white/10 w-[22%] align-top">
                  <div className="flex flex-col items-center gap-3">
                    <Sparkles size={28} className="text-gray-400" />
                    <h3 className="text-xl font-bold text-white">Free</h3>
                    <div className="text-3xl font-black text-white mb-2">$0<span className="text-sm text-white/50 font-medium">/mo</span></div>
                    <Link href="/signup/free" className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition">Start Exploring</Link>
                  </div>
                </th>

                <th className="p-8 border-b border-white/10 w-[22%] align-top bg-gradient-to-b from-[#E53945]/15 to-transparent border-x border-[#E53945]/30 relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#E53945]" />
                  <div className="flex flex-col items-center gap-3">
                    <Crown size={28} className="text-[#E53945]" />
                    <h3 className="text-xl font-bold text-white">Plus</h3>
                    <div className="text-3xl font-black text-white mb-2">$3.99<span className="text-sm text-white/50 font-medium">/mo</span></div>
                    <Link href="/signup/plus" className="w-full py-2.5 rounded-xl bg-[#E53945] hover:bg-[#d12e39] text-white font-bold text-sm transition shadow-lg shadow-[#E53945]/20">Get Plus</Link>
                  </div>
                </th>

                <th className="p-8 border-b border-white/10 w-[22%] align-top">
                  <div className="flex flex-col items-center gap-3">
                    <Video size={28} className="text-[#D4AF37]" />
                    <h3 className="text-xl font-bold text-white">Creator</h3>
                    <div className="text-3xl font-black text-white mb-2">$9.99<span className="text-sm text-white/50 font-medium">/mo</span></div>
                    <Link href="/signup/creator" className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition">Go Creator</Link>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="p-4 text-left border-b border-white/5 text-white/80 font-medium pl-8">{f.name}</td>
                  <td className="p-4 border-b border-white/5">
                    {f.free ? <Check size={20} className="mx-auto text-green-500" /> : <X size={20} className="mx-auto text-white/20" />}
                  </td>
                  <td className="p-4 border-b border-white/5 bg-gradient-to-b from-[#E53945]/5 to-transparent border-x border-[#E53945]/20">
                    {f.plus ? <Check size={20} className="mx-auto text-green-500" /> : <X size={20} className="mx-auto text-white/20" />}
                  </td>
                  <td className="p-4 border-b border-white/5">
                    {f.creator ? <Check size={20} className="mx-auto text-green-500" /> : <X size={20} className="mx-auto text-white/20" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACK */}
        <div className="flex flex-col gap-6 lg:hidden">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4"><Sparkles size={24} className="text-gray-400" /><h3 className="text-2xl font-black">Free</h3></div>
            <div className="text-3xl font-black mb-4">$0<span className="text-sm text-white/50 font-medium">/mo</span></div>
            <Link href="/signup/free" className="block w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition mb-6">Start Exploring</Link>
            <div className="space-y-3">
              {FEATURES.map((f, i) => f.free && (<div key={i} className="flex items-center gap-2 text-sm text-white/80"><Check size={16} className="text-green-500" /> {f.name}</div>))}
            </div>
          </div>

          <div className="bg-gradient-to-b from-[#E53945]/10 to-transparent border border-[#E53945]/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#E53945]" />
            <div className="flex items-center gap-3 mb-4"><Crown size={24} className="text-[#E53945]" /><h3 className="text-2xl font-black">Plus</h3></div>
            <div className="text-3xl font-black mb-4">$3.99<span className="text-sm text-white/50 font-medium">/mo</span></div>
            <Link href="/signup/plus" className="block w-full text-center py-3 rounded-xl bg-[#E53945] hover:bg-[#d12e39] text-white font-bold transition mb-6 shadow-lg shadow-[#E53945]/20">Get Plus</Link>
            <div className="space-y-3">
              {FEATURES.map((f, i) => f.plus && (<div key={i} className="flex items-center gap-2 text-sm text-white/80"><Check size={16} className="text-green-500" /> {f.name}</div>))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4"><Video size={24} className="text-[#D4AF37]" /><h3 className="text-2xl font-black">Creator</h3></div>
            <div className="text-3xl font-black mb-4">$9.99<span className="text-sm text-white/50 font-medium">/mo</span></div>
            <Link href="/signup/creator" className="block w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition mb-6">Go Creator</Link>
            <div className="space-y-3">
              {FEATURES.map((f, i) => f.creator && (<div key={i} className="flex items-center gap-2 text-sm text-white/80"><Check size={16} className="text-green-500" /> {f.name}</div>))}
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-white/40 mt-12">
          Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}