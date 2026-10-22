"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Wallet, TrendingUp, AlertCircle, CheckCircle2, DollarSign } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

export default function CreatorWallet() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<"unverified" | "pending" | "verified">("unverified");
  const [balance, setBalance] = useState(0);
  const [lifetime, setLifetime] = useState(0);

  useEffect(() => {
    getCachedUser().then((user) => {
      if (!user) return;
      setUserId(user.id);
      // Mock data for now - in the real app, this would fetch from a /api/wallet route
      setTimeout(() => {
        setBalance(12.50);
        setLifetime(45.00);
        setLoading(false);
      }, 500);
    });
  }, []);

  if (loading) return <div className="p-8 text-white/50 text-center">Loading…</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen bg-black text-white">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6 transition">
        <ChevronLeft size={16} /> Back to Profile
      </Link>

      <h1 className="text-3xl font-black mb-2">Creator Wallet</h1>
      <p className="text-white/50 mb-8">Manage your earnings from Reels and Payouts.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Current Balance */}
        <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-2 text-white/60 mb-2 relative z-10">
            <Wallet size={20} /> Current Balance
          </div>
          <p className="text-5xl font-black text-green-400 relative z-10">
            ${balance.toFixed(2)}
          </p>
          <p className="text-xs text-white/40 mt-4 relative z-10">Minimum $50.00 required to withdraw.</p>
        </div>

        {/* Lifetime Earnings */}
        <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
          <div className="flex items-center gap-2 text-white/60 mb-2">
            <TrendingUp size={20} /> Lifetime Earnings
          </div>
          <p className="text-4xl font-black text-white">
            ${lifetime.toFixed(2)}
          </p>
        </div>
      </div>

      {/* KYC Status Section */}
      <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8">
        <h2 className="text-xl font-bold mb-4">Monetization Status</h2>
        
        {kycStatus === "unverified" ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Turn on Monetization</p>
                <p className="text-sm text-white/50">Verify your identity to start earning from the Reels Pool and withdraw funds.</p>
              </div>
            </div>
            <button onClick={() => setKycStatus("pending")} className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-gray-200 transition">
              Start Verification
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-green-500" />
            <div>
              <p className="font-semibold text-white">Identity Verified</p>
              <p className="text-sm text-white/50">Your account is fully monetized. Payouts will be processed monthly.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
