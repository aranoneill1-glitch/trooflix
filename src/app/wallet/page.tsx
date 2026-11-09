"use client";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function WalletPage() {
  return (
    <main className="min-h-screen bg-[#0a0303] text-white pb-24">
      <TopBar />
      <div className="max-w-3xl mx-auto px-4 pt-24">
        <div className="bg-gradient-to-br from-[#1c1c1e] to-[#0a0303] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#E53945]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-[#E53945]" />
              </div>
              <div>
                <h1 className="text-2xl font-black">My Wallet</h1>
                <p className="text-sm text-white/50">TrooBank</p>
              </div>
            </div>
            <p className="text-sm text-white/50 mb-2">Available Balance</p>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-5xl font-black">0</span>
              <span className="text-lg text-white/50 font-bold">TrooCoins</span>
            </div>
            <button className="w-full bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20">
              Top Up Coins
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-8 text-center">
          <p className="text-white/40">No transactions yet.</p>
        </div>
      </div>
      <MobileBottomNav />
    </main>
  );
}
